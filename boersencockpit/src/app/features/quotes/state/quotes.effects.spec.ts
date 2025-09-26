import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ReplaySubject, Subject, firstValueFrom, take } from 'rxjs';
import { routerNavigatedAction } from '@ngrx/router-store';

import { PRICE_API } from '../../../core/api/price-api.token';
import { PriceApiPort, ListSymbol } from '../../../core/api/price-api.port';
import { asSymbol } from '../../../domain/models/symbol.brand';
import { PriceQuote } from '../../../domain/models/quote';
import { AppState } from '../../../store/app.state';
import { initialStocksState, stocksAdapter } from '../../stocks/state/stocks.reducer';
import { initialQuotesState } from './quotes.reducer';
import { initialTradesState } from '../../trades/state/trades.reducer';
import { initialTimeSeriesState } from '../../timeseries/state/timeseries.reducer';
import { initialPortfolioState } from '../../portfolio/state/portfolio.reducer';
import * as StocksActions from '../../stocks/state/stocks.actions';
import * as QuotesActions from './quotes.actions';
import { QuotesEffects } from './quotes.effects';

const listSymbol: ListSymbol = { symbol: asSymbol('AAPL'), name: 'Apple', currency: 'USD' };
const quote: PriceQuote = {
  symbol: listSymbol.symbol,
  price: 100,
  changeAbs: 1,
  changePct: 1,
  asOf: '2024-01-01T00:00:00.000Z',
};

describe('QuotesEffects', () => {
  let actionsSubject: ReplaySubject<unknown>;
  let effects: QuotesEffects;
  let store: MockStore<AppState>;

  const priceApi: jest.Mocked<PriceApiPort> = {
    listSymbols: jest.fn(),
    getQuotes: jest.fn(),
    getTimeSeries: jest.fn(),
    streamQuotes: jest.fn(),
  };

  const createState = (overrides: Partial<AppState> = {}): AppState => ({
    stocks: overrides.stocks ?? initialStocksState,
    trades: overrides.trades ?? initialTradesState,
    quotes: overrides.quotes ?? initialQuotesState,
    timeseries: overrides.timeseries ?? initialTimeSeriesState,
    portfolio: overrides.portfolio ?? initialPortfolioState,
  });

  beforeEach(() => {
    actionsSubject = new ReplaySubject<unknown>(1);
    TestBed.configureTestingModule({
      providers: [
        QuotesEffects,
        provideMockActions(() => actionsSubject.asObservable()),
        provideMockStore({ initialState: createState() }),
        { provide: PRICE_API, useValue: priceApi },
      ],
    });
    effects = TestBed.inject(QuotesEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('requests snapshot after symbols load', async () => {
    actionsSubject.next(StocksActions.loadSymbolsSucceeded({ symbols: [listSymbol] }));
    const result = await firstValueFrom(effects.loadSnapshotOnSymbols$);
    expect(result).toEqual(QuotesActions.quotesSnapshotRequested({ symbols: [listSymbol.symbol] }));
  });

  it('loads snapshot and emits quotes', async () => {
    priceApi.getQuotes.mockResolvedValue([quote]);
    actionsSubject.next(QuotesActions.quotesSnapshotRequested({ symbols: [listSymbol.symbol] }));
    const result = await firstValueFrom(effects.snapshotRequested$);
    expect(result).toEqual(QuotesActions.quotesTickArrived({ quotes: [quote] }));
  });

  it('emits failure for snapshot errors', async () => {
    priceApi.getQuotes.mockRejectedValue(new Error('fail'));
    actionsSubject.next(QuotesActions.quotesSnapshotRequested({ symbols: [listSymbol.symbol] }));
    const result = await firstValueFrom(effects.snapshotRequested$);
    expect(result.type).toBe(QuotesActions.quotesTickFailed.type);
    expect((result as ReturnType<typeof QuotesActions.quotesTickFailed>).error.code).toBe('API/QUOTES_SNAPSHOT');
  });

  it('streams quotes until stopped', async () => {
    const stream = new Subject<PriceQuote>();
    priceApi.streamQuotes.mockReturnValue(stream.asObservable());
    const emissions: ReturnType<typeof QuotesActions.quotesTickArrived>[] = [];
    const subscription = effects.pollQuotes$.subscribe((value) => emissions.push(value as ReturnType<typeof QuotesActions.quotesTickArrived>));

    actionsSubject.next(QuotesActions.quotesPollStart({ symbols: [listSymbol.symbol] }));
    stream.next(quote);
    actionsSubject.next(QuotesActions.quotesPollStop());
    subscription.unsubscribe();

    expect(emissions).toHaveLength(1);
    expect(emissions[0]).toEqual(QuotesActions.quotesTickArrived({ quotes: [quote] }));
  });

  it('stops polling on navigation away', () => {
    const stream = new Subject<PriceQuote>();
    priceApi.streamQuotes.mockReturnValue(stream.asObservable());
    const emissions: ReturnType<typeof QuotesActions.quotesTickArrived>[] = [];
    const subscription = effects.pollQuotes$.subscribe((value) => emissions.push(value as ReturnType<typeof QuotesActions.quotesTickArrived>));

    actionsSubject.next(QuotesActions.quotesPollStart({ symbols: [listSymbol.symbol] }));
    stream.next(quote);
    const navigation = routerNavigatedAction({
      payload: {
        event: { id: 1, url: '/portfolio', urlAfterRedirects: '/settings' } as any,
        routerState: {} as any,
      },
    });
    actionsSubject.next(navigation);
    subscription.unsubscribe();

    expect(emissions).toHaveLength(1);
  });

  it('restarts polling when watchlist diverges from polling symbols', async () => {
    const stocksState = stocksAdapter.setAll([listSymbol], {
      ...initialStocksState,
      watchlist: [listSymbol.symbol],
    });
    const quotesState = { ...initialQuotesState, pollingSymbols: [] };
    store.setState(createState({ stocks: stocksState, quotes: quotesState }));

    const result = await firstValueFrom(effects.restartPollingOnWatchlistChange$.pipe(take(1)));
    expect(result).toEqual(QuotesActions.quotesPollStart({ symbols: [listSymbol.symbol] }));
  });
});
