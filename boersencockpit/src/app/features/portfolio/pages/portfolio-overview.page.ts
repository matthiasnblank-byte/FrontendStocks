import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, map, switchMap, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';

import { PortfolioMetricsComponent } from '../components/portfolio-metrics';
import { PortfolioChartComponent, PortfolioSeriesPoint } from '../components/portfolio-chart';
import { PortfolioTopflopComponent } from '../components/portfolio-topflop';
import { selectPortfolioMetrics, selectPortfolioSeries, selectDailyPerformance, selectTotalPerformance, selectPositions, selectSelectedRange } from '../state/portfolio.selectors';
import * as PortfolioActions from '../state/portfolio.actions';
import * as StocksActions from '../../stocks/state/stocks.actions';
import * as QuotesActions from '../../quotes/state/quotes.actions';
import * as TimeSeriesActions from '../../timeseries/state/timeseries.actions';
import { RangeKey } from '../../../core/api/price-api.port';
import { Symbol } from '../../../domain/models/symbol.brand';
import { Position } from '../../../domain/models/position';

const PERFORMANCE_LIMIT = 5;

const symbolsEqual = (prev: readonly Symbol[], next: readonly Symbol[]): boolean => {
  if (prev.length !== next.length) {
    return false;
  }
  return prev.every((symbol, index) => symbol === next[index]);
};

@Component({
  selector: 'app-portfolio-overview-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PortfolioMetricsComponent, PortfolioChartComponent, PortfolioTopflopComponent],
  templateUrl: './portfolio-overview.page.html',
  styleUrl: './portfolio-overview.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioOverviewPageComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);

  readonly metrics$ = this.store.select(selectPortfolioMetrics);
  readonly range$ = this.store.select(selectSelectedRange);
  readonly positions$ = this.store.select(selectPositions);
  readonly hasPositions$ = this.positions$.pipe(map((positions) => positions.some((position) => position.totalQuantity > 0)));

  readonly series$ = this.range$.pipe(
    switchMap((range) => this.store.select(selectPortfolioSeries(range)))
  );

  readonly dailyPerformance$ = this.store.select(selectDailyPerformance(PERFORMANCE_LIMIT));
  readonly totalPerformance$ = this.store.select(selectTotalPerformance(PERFORMANCE_LIMIT));

  constructor() {
    combineLatest([this.positions$, this.range$])
      .pipe(
        map(([positions, range]) => ({
          symbols: this.extractActiveSymbols(positions),
          range,
        })),
        distinctUntilChanged((prev, next) => prev.range === next.range && symbolsEqual(prev.symbols, next.symbols)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ symbols, range }) => {
        if (symbols.length === 0) {
          this.store.dispatch(QuotesActions.quotesPollStop());
          return;
        }
        this.store.dispatch(QuotesActions.quotesSnapshotRequested({ symbols }));
        this.store.dispatch(QuotesActions.quotesPollStart({ symbols }));
        symbols.forEach((symbol) =>
          this.store.dispatch(TimeSeriesActions.timeSeriesRequested({ symbol, range }))
        );
      });
  }

  ngOnInit(): void {
    this.store.dispatch(StocksActions.loadSymbolsRequested());
  }

  ngOnDestroy(): void {
    this.store.dispatch(QuotesActions.quotesPollStop());
  }

  protected onRangeChange(range: RangeKey): void {
    this.store.dispatch(PortfolioActions.portfolioRangeChanged({ range }));
    const symbols = this.extractActiveSymbolsFromCache();
    symbols.forEach((symbol) => this.store.dispatch(TimeSeriesActions.timeSeriesRequested({ symbol, range })));
  }

  protected isChartLoading(series: readonly PortfolioSeriesPoint[] | null, hasPositions: boolean): boolean {
    return hasPositions && !series;
  }

  private extractActiveSymbols(positions: readonly Position[]): readonly Symbol[] {
    return positions
      .filter((position) => position.totalQuantity > 0)
      .map((position) => position.symbol)
      .sort((a, b) => a.localeCompare(b));
  }

  private extractActiveSymbolsFromCache(): readonly Symbol[] {
    let symbols: readonly Symbol[] = [];
    this.positions$
      .pipe(map((positions) => this.extractActiveSymbols(positions)), take(1))
      .subscribe((next) => {
        symbols = next;
      });
    return symbols;
  }
}
