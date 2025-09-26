import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ReplaySubject, firstValueFrom } from 'rxjs';

import { PRICE_API } from '../../../core/api/price-api.token';
import { PriceApiPort } from '../../../core/api/price-api.port';
import { asSymbol } from '../../../domain/models/symbol.brand';
import { TimeSeries } from '../../../domain/models/candle';
import { AppState } from '../../../store/app.state';
import { initialStocksState } from '../../stocks/state/stocks.reducer';
import { initialQuotesState } from '../../quotes/state/quotes.reducer';
import { initialTradesState } from '../../trades/state/trades.reducer';
import { initialPortfolioState } from '../../portfolio/state/portfolio.reducer';
import { initialTimeSeriesState } from './timeseries.reducer';
import * as TimeSeriesActions from './timeseries.actions';
import { TimeSeriesEffects } from './timeseries.effects';

const symbol = asSymbol('AAPL');
const range = '1M' as const;
const series: TimeSeries = {
  symbol,
  candles: [{ t: '2024-01-01T00:00:00.000Z', o: 1, h: 1, l: 1, c: 1 }],
};

describe('TimeSeriesEffects', () => {
  let actionsSubject: ReplaySubject<unknown>;
  let effects: TimeSeriesEffects;
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
        TimeSeriesEffects,
        provideMockActions(() => actionsSubject.asObservable()),
        provideMockStore({ initialState: createState() }),
        { provide: PRICE_API, useValue: priceApi },
      ],
    });
    effects = TestBed.inject(TimeSeriesEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('loads series when cache miss', async () => {
    priceApi.getTimeSeries.mockResolvedValue(series);
    actionsSubject.next(TimeSeriesActions.timeSeriesRequested({ symbol, range }));
    const result = await firstValueFrom(effects.loadTimeSeries$);
    expect(result).toEqual(TimeSeriesActions.timeSeriesSucceeded({ symbol, range, series }));
  });

  it('does not load series when cached', () => {
    const cachedState = {
      ...initialTimeSeriesState,
      series: { [symbol]: { [range]: series } },
      loading: { [symbol]: { [range]: false } },
    };
    store.setState(createState({ timeseries: cachedState }));
    const emissions: unknown[] = [];
    const subscription = effects.loadTimeSeries$.subscribe((value) => emissions.push(value));
    actionsSubject.next(TimeSeriesActions.timeSeriesRequested({ symbol, range }));
    actionsSubject.complete();
    subscription.unsubscribe();
    expect(emissions).toHaveLength(0);
    expect(priceApi.getTimeSeries).not.toHaveBeenCalled();
  });

  it('emits failure on error', async () => {
    priceApi.getTimeSeries.mockRejectedValue(new Error('fail'));
    actionsSubject.next(TimeSeriesActions.timeSeriesRequested({ symbol, range }));
    const result = await firstValueFrom(effects.loadTimeSeries$);
    expect(result.type).toBe(TimeSeriesActions.timeSeriesFailed.type);
    expect((result as ReturnType<typeof TimeSeriesActions.timeSeriesFailed>).error.code).toBe('API/TIMESERIES');
  });
});
