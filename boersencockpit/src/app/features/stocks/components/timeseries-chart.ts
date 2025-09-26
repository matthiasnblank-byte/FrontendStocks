import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import Chart from 'chart.js/auto';
import { ChartConfiguration, ChartDataset, ChartOptions } from 'chart.js';
import { AnnotationOptions } from 'chartjs-plugin-annotation';

import './chart.registry';

import { RangeKey } from '../../../core/api/price-api.port';
import { Trade } from '../../../domain/models/trade';
import { TimeSeries } from '../../../domain/models/candle';

const RANGE_KEYS: readonly RangeKey[] = ['1W', '1M', '3M', '6M', '1Y', 'YTD', 'MAX'];

const currencyFormatter = (currency: 'EUR' | 'USD' | 'CHF' | 'GBP'): Intl.NumberFormat =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

const dateFormatter = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short' });

const tooltipDateFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

@Component({
  selector: 'app-timeseries-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeseries-chart.html',
  styleUrl: './timeseries-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeseriesChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  readonly ranges = RANGE_KEYS;

  @Input() series: TimeSeries | null = null;
  @Input() trades: readonly Trade[] | null = null;
  @Input({ required: true }) range!: RangeKey;
  @Input({ required: true }) currency: 'EUR' | 'USD' | 'CHF' | 'GBP' = 'EUR';
  @Input() loading = false;
  @Input() error: string | null = null;

  @Output() readonly rangeChange = new EventEmitter<RangeKey>();
  @Output() readonly retryRequested = new EventEmitter<void>();

  @ViewChild('chartCanvas') private chartCanvas?: ElementRef<HTMLCanvasElement>;

  protected chartData: ChartConfiguration<'line'>['data'] = { datasets: [] };
  protected chartOptions: ChartOptions<'line'> = this.createChartOptions();

  private chartInstance: Chart<'line'> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['series'] || changes['trades'] || changes['currency']) {
      this.chartData = this.createChartData();
      this.chartOptions = this.createChartOptions();
      this.renderChart();
    }
  }

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
    this.chartInstance = null;
  }

  protected onRangeChange(range: RangeKey): void {
    if (range !== this.range) {
      this.rangeChange.emit(range);
    }
  }

  protected onRetry(): void {
    this.retryRequested.emit();
  }

  private renderChart(): void {
    if (!this.chartCanvas) {
      return;
    }

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: this.chartData,
      options: this.chartOptions,
    };

    if (this.chartInstance) {
      this.chartInstance.data = config.data;
      this.chartInstance.options = config.options ?? {};
      this.chartInstance.update();
      return;
    }

    this.chartInstance = new Chart(this.chartCanvas.nativeElement, config);
  }

  private createChartData(): ChartConfiguration<'line'>['data'] {
    const dataset: ChartDataset<'line'> = {
      label: 'Schlusskurs',
      data: (this.series?.candles ?? [])
        .slice()
        .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
        .map((candle) => ({ x: new Date(candle.t).getTime(), y: candle.c })),
      parsing: false,
      normalized: true,
      spanGaps: true,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.25)',
      borderWidth: 2,
      fill: {
        target: 'origin',
        above: 'rgba(37, 99, 235, 0.15)',
      },
      tension: 0.2,
      pointRadius: 0,
      pointHitRadius: 12,
    };

    return { datasets: [dataset] };
  }

  private createAnnotations(): Record<string, AnnotationOptions> {
    const annotations: Record<string, AnnotationOptions> = {};
    const trades = [...(this.trades ?? [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    trades.forEach((trade, index) => {
      const timestamp = new Date(trade.timestamp).getTime();
      const annotationId = `${trade.id}-${index}`;
      annotations[annotationId] = {
        type: 'point',
        xValue: timestamp,
        yValue: trade.price,
        radius: 6,
        backgroundColor: trade.side === 'BUY' ? '#16a34a' : '#dc2626',
        borderColor: trade.side === 'BUY' ? '#15803d' : '#b91c1c',
        borderWidth: 2,
        pointStyle: 'triangle',
        rotation: trade.side === 'BUY' ? 0 : 180,
      } satisfies AnnotationOptions;
    });

    return annotations;
  }

  private createChartOptions(): ChartOptions<'line'> {
    const currencyFormat = currencyFormatter(this.currency);
    const annotations = this.createAnnotations();

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: { parsed: { y: number } }): string => {
              const price = currencyFormat.format(Number(context.parsed.y));
              return `Preis: ${price}`;
            },
            afterBody: (items: readonly { parsed: { x: number } }[]): readonly string[] => {
              const tradeTooltip = this.buildTradeTooltip(items[0]?.parsed.x ?? null);
              return tradeTooltip ? [tradeTooltip] : [];
            },
            title: (items: readonly { parsed: { x: number } }[]): string => {
              const x = items[0]?.parsed.x;
              if (typeof x === 'number') {
                return tooltipDateFormatter.format(new Date(x));
              }
              return '';
            },
          },
        },
        annotation: {
          annotations,
        },
      },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            callback: (value: number | string): string => {
              if (typeof value === 'number') {
                return dateFormatter.format(new Date(value));
              }
              return '';
            },
            maxRotation: 0,
            autoSkip: true,
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            callback: (value: number | string): string => currencyFormat.format(Number(value)),
            maxTicksLimit: 6,
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.15)',
          },
        },
      },
    } satisfies ChartOptions<'line'>;
  }

  private buildTradeTooltip(xValue: number | null): string | null {
    if (!xValue) {
      return null;
    }
    const trade = this.trades?.find((item) => new Date(item.timestamp).getTime() === xValue);
    if (!trade) {
      return null;
    }
    const priceFormatter = currencyFormatter(this.currency);
    const sideLabel = trade.side === 'BUY' ? 'Kauf' : 'Verkauf';
    const priceLabel = priceFormatter.format(trade.price);
    const quantityLabel = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(trade.quantity);
    return `${sideLabel} ${quantityLabel} @ ${priceLabel} – ${tooltipDateFormatter.format(new Date(trade.timestamp))}`;
  }
}
