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
  inject,
} from '@angular/core';
import Chart from 'chart.js/auto';
import { ChartConfiguration, ChartDataset, ChartOptions } from 'chart.js';

import '../../stocks/components/chart.registry';

import { RangeKey } from '../../../core/api/price-api.port';
import { APP_TIMEZONE } from '../../../core/tokens/timezone.token';

export interface PortfolioSeriesPoint {
  readonly t: string;
  readonly totalValue: number;
  readonly invested: number;
  readonly pnlAbs: number;
  readonly pnlPct: number;
}

const RANGE_KEYS: readonly RangeKey[] = ['1W', '1M', '3M', '6M', '1Y', 'YTD', 'MAX'];

@Component({
  selector: 'app-portfolio-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-chart.html',
  styleUrl: './portfolio-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly timezone = inject(APP_TIMEZONE);

  readonly ranges = RANGE_KEYS;

  @Input() series: readonly PortfolioSeriesPoint[] | null = null;
  @Input({ required: true }) range!: RangeKey;
  @Input() loading = false;

  @Output() readonly rangeChange = new EventEmitter<RangeKey>();

  @ViewChild('chartCanvas') private chartCanvas?: ElementRef<HTMLCanvasElement>;

  protected chartData: ChartConfiguration<'line'>['data'] = { datasets: [] };
  protected chartOptions: ChartOptions<'line'> = this.createChartOptions();

  private chartInstance: Chart<'line'> | null = null;

  private readonly currencyFormatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  private readonly tooltipDateFormatter = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeZone: this.timezone,
  });

  private readonly axisDateFormatter = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeZone: this.timezone,
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['series']) {
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
    const points = [...(this.series ?? [])]
      .map((point) => ({ x: new Date(point.t).getTime(), y: point.totalValue }))
      .sort((a, b) => a.x - b.x);

    const dataset: ChartDataset<'line'> = {
      data: points,
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
      pointRadius: 0,
      pointHitRadius: 12,
      tension: 0.2,
    };

    return { datasets: [dataset] };
  }

  private createChartOptions(): ChartOptions<'line'> {
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
              const value = this.currencyFormatter.format(Number(context.parsed.y ?? 0));
              return `Gesamtwert: ${value}`;
            },
            afterBody: (items: readonly { parsed: { x: number } }[]): readonly string[] => {
              const item = items[0];
              if (!item) {
                return [];
              }
              const point = this.findSeriesPoint(item.parsed.x as number);
              if (!point) {
                return [];
              }
              const pnlAbs = this.currencyFormatter.format(point.pnlAbs);
              const pnlPct = `${point.pnlPct.toFixed(2).replace('.', ',')} %`;
              return [`P&L: ${pnlAbs} (${pnlPct})`];
            },
            title: (items: readonly { parsed: { x: number } }[]): string => {
              const timestamp = items[0]?.parsed.x;
              if (typeof timestamp === 'number') {
                return this.tooltipDateFormatter.format(new Date(timestamp));
              }
              return '';
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            callback: (value: number | string): string => {
              if (typeof value === 'number') {
                return this.axisDateFormatter.format(new Date(value));
              }
              return '';
            },
            maxRotation: 0,
            autoSkip: true,
          },
          grid: { display: false },
        },
        y: {
          ticks: {
            callback: (value: number | string): string => this.currencyFormatter.format(Number(value)),
            maxTicksLimit: 6,
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.15)',
          },
        },
      },
    } satisfies ChartOptions<'line'>;
  }

  private findSeriesPoint(timestamp: number): PortfolioSeriesPoint | null {
    if (!this.series) {
      return null;
    }
    return this.series.find((point) => new Date(point.t).getTime() === timestamp) ?? null;
  }
}
