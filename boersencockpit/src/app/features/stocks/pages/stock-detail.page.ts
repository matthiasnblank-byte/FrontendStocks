import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, map, switchMap } from 'rxjs';

import { asSymbol, Symbol } from '../../../domain/models/symbol.brand';
import { selectStockBySymbol } from '../state/stocks.selectors';
import { selectQuoteBySymbol } from '../../quotes/state/quotes.selectors';
import { selectTradesBySymbol, selectPositions } from '../../trades/state/trades.selectors';
import { selectTimeSeries, selectTimeSeriesError, selectTimeSeriesLoading } from '../../timeseries/state/timeseries.selectors';
import * as TimeSeriesActions from '../../timeseries/state/timeseries.actions';
import * as QuotesActions from '../../quotes/state/quotes.actions';
import { RangeKey } from '../../../core/api/price-api.port';
import { TimeseriesChartComponent } from '../components/timeseries-chart';
import { TradeFormComponent } from '../components/trade-form';
import { TradeTableComponent } from '../components/trade-table';
import { TradeFormValue } from '../forms/trade.schema';
import * as TradesActions from '../../trades/state/trades.actions';
import { Trade } from '../../../domain/models/trade';
import { FocusTrapDirective } from '../../../layout/accessibility/focus-trap.directive';
import { PriceQuote } from '../../../domain/models/quote';
import { TimeSeries } from '../../../domain/models/candle';

interface DetailViewModel {
  readonly symbol: Symbol;
  readonly stockName: string | null;
  readonly currency: 'EUR' | 'USD' | 'CHF' | 'GBP';
  readonly quote: PriceQuote | null;
  readonly trades: readonly Trade[];
  readonly netQuantity: number;
  readonly avgPrice: number | null;
  readonly unrealized: number | null;
  readonly series: TimeSeries | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const DEFAULT_RANGE: RangeKey = '1M';

@Component({
  selector: 'app-stock-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TimeseriesChartComponent, TradeFormComponent, TradeTableComponent, FocusTrapDirective],
  templateUrl: './stock-detail.page.html',
  styleUrl: './stock-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockDetailPageComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly routeSymbol$ = this.route.paramMap.pipe(
    map((params) => params.get('symbol') ?? ''),
    map((value) => asSymbol(value.toUpperCase())),
    distinctUntilChanged()
  );

  readonly range = signal<RangeKey>(DEFAULT_RANGE);
  private readonly range$ = toObservable(this.range);

  private readonly stock$ = this.routeSymbol$.pipe(switchMap((symbol) => this.store.select(selectStockBySymbol(symbol))));
  private readonly quote$ = this.routeSymbol$.pipe(switchMap((symbol) => this.store.select(selectQuoteBySymbol(symbol))));
  private readonly trades$ = this.routeSymbol$.pipe(switchMap((symbol) => this.store.select(selectTradesBySymbol(symbol))));
  private readonly position$ = combineLatest([this.store.select(selectPositions), this.routeSymbol$]).pipe(
    map(([positions, symbol]) => positions.find((position) => position.symbol === symbol) ?? null)
  );
  private readonly series$ = combineLatest([this.routeSymbol$, this.range$]).pipe(
    switchMap(([symbol, range]) => this.store.select(selectTimeSeries(symbol, range)))
  );
  private readonly seriesLoading$ = combineLatest([this.routeSymbol$, this.range$]).pipe(
    switchMap(([symbol, range]) => this.store.select(selectTimeSeriesLoading(symbol, range))),
    distinctUntilChanged()
  );
  private readonly seriesError$ = combineLatest([this.routeSymbol$, this.range$]).pipe(
    switchMap(([symbol, range]) => this.store.select(selectTimeSeriesError(symbol, range)))
  );

  readonly viewModel$ = combineLatest([
    this.routeSymbol$,
    this.stock$,
    this.quote$,
    this.trades$,
    this.position$,
    this.series$,
    this.seriesLoading$,
    this.seriesError$,
  ]).pipe(
    map(([symbol, stock, quote, trades, position, series, loading, error]): DetailViewModel => {
      const currency = stock?.currency ?? 'EUR';
      const netQuantity = position?.totalQuantity ?? 0;
      const avgPrice = position?.avgBuyPrice ?? null;
      const unrealized = quote && avgPrice && netQuantity > 0 ? (quote.price - avgPrice) * netQuantity : null;
      return {
        symbol,
        stockName: stock?.name ?? null,
        currency,
        quote: quote ?? null,
        trades,
        netQuantity,
        avgPrice,
        unrealized,
        series,
        loading,
        error: error?.message ?? null,
      };
    })
  );

  readonly pendingDelete = signal<Trade | null>(null);

  constructor() {
    combineLatest([this.routeSymbol$, this.range$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([symbol, range]) => {
        this.store.dispatch(TimeSeriesActions.timeSeriesRequested({ symbol, range }));
      });

    this.routeSymbol$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((symbol) => {
        this.store.dispatch(QuotesActions.quotesPollStop());
        this.store.dispatch(QuotesActions.quotesSnapshotRequested({ symbols: [symbol] }));
        this.store.dispatch(QuotesActions.quotesPollStart({ symbols: [symbol] }));
      });
  }

  ngOnInit(): void {
    // Ensure default data load when entering the page.
  }

  ngOnDestroy(): void {
    this.store.dispatch(QuotesActions.quotesPollStop());
  }

  protected handleRangeChange(range: RangeKey): void {
    this.range.set(range);
  }

  protected async handleTradeSubmit(value: TradeFormValue): Promise<void> {
    const id = crypto.randomUUID();
    this.store.dispatch(
      TradesActions.addTradeRequested({
        tradeInput: {
          id,
          ...value,
        },
      })
    );
  }

  protected handleDeleteRequest(tradeId: string, trades: readonly Trade[]): void {
    const trade = trades.find((item) => item.id === tradeId) ?? null;
    this.pendingDelete.set(trade);
  }

  protected closeDialog(): void {
    this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const trade = this.pendingDelete();
    if (!trade) {
      return;
    }
    this.store.dispatch(TradesActions.removeTradeRequested({ id: trade.id }));
    this.pendingDelete.set(null);
  }

  protected retry(symbol: Symbol): void {
    this.store.dispatch(TimeSeriesActions.timeSeriesRequested({ symbol, range: this.range() }));
  }
}
