import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ReplaySubject, firstValueFrom } from 'rxjs';

import { PRICE_API } from '../../../core/api/price-api.token';
import { PriceApiPort } from '../../../core/api/price-api.port';
import { AlphaVantageApiService, AlphaVantageConfig } from '../../../core/api/alphavantage-api.service';
import { CacheService } from '../../../core/services/cache.service';
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
import seriesCompactAapl from '../../../../assets/api-samples/alphavantage/time-series-daily-adjusted.AAPL.compact.json';

const symbol = asSymbol('AAPL');
const range = '1M' as const;
const series: TimeSeries = {
  symbol,
  candles: [{ t: '2024-01-01T00:00:00.000Z', o: 1, h: 1, l: 1, c: 1 }],
};

const createState = (overrides: Partial<AppState> = {}): AppState => ({
  stocks: overrides.stocks ?? initialStocksState,
  trades: overrides.trades ?? initialTradesState,
  quotes: overrides.quotes ?? initialQuotesState,
  timeseries: overrides.timeseries ?? initialTimeSeriesState,
  portfolio: overrides.portfolio ?? initialPortfolioState,
});

const flushAsync = () => Promise.resolve();

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

describe('TimeSeriesEffects with AlphaVantageApiService', () => {
  let actionsSubject: ReplaySubject<unknown>;
  let effects: TimeSeriesEffects;
  let httpMock: HttpTestingController;

  const config: AlphaVantageConfig = {
    apiKey: 'test-key',
    baseUrl: 'https://www.alphavantage.co/query',
    cacheTtlMs: 60_000,
    enablePersistentCache: false,
    maxRequestsPerMinute: 5,
    minRequestSpacingMs: 0
  };

  beforeEach(() => {
    actionsSubject = new ReplaySubject<unknown>(2);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TimeSeriesEffects,
        provideMockActions(() => actionsSubject.asObservable()),
        provideMockStore({ initialState: createState() }),
        CacheService,
        {
          provide: PRICE_API,
          useFactory: (http: HttpClient, cache: CacheService) =>
            new AlphaVantageApiService(http, config, cache),
          deps: [HttpClient, CacheService]
        }
      ]
    });
    effects = TestBed.inject(TimeSeriesEffects);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.inject(CacheService).clear();
  });

  it('honours service cache when same series requested twice', async () => {
    const emissions: unknown[] = [];
    const subscription = effects.loadTimeSeries$.subscribe((value) => emissions.push(value));

    actionsSubject.next(TimeSeriesActions.timeSeriesRequested({ symbol, range }));
    await flushAsync();
    httpMock
      .expectOne((request) =>
        request.url === config.baseUrl &&
        request.params.get('function') === 'TIME_SERIES_DAILY_ADJUSTED'
      )
      .flush(seriesCompactAapl);

    await flushAsync();

    actionsSubject.next(TimeSeriesActions.timeSeriesRequested({ symbol, range }));
    await flushAsync();
    httpMock.expectNone((request) => request.url === config.baseUrl);

    await flushAsync();

    subscription.unsubscribe();
    expect(
      emissions.filter(
        (action) => action instanceof Object && (action as { type: string }).type === TimeSeriesActions.timeSeriesSucceeded.type
      )
    ).toHaveLength(1);
  });
});
