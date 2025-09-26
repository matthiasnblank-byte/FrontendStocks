import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import globalQuoteAapl from '../../../assets/api-samples/alphavantage/global-quote.AAPL.json';
import seriesCompactAapl from '../../../assets/api-samples/alphavantage/time-series-daily-adjusted.AAPL.compact.json';
import seriesFullAapl from '../../../assets/api-samples/alphavantage/time-series-daily-adjusted.AAPL.full.json';

import { AlphaVantageApiService, AlphaVantageConfig } from './alphavantage-api.service';
import { CacheService } from '../services/cache.service';
import { asSymbol } from '../../domain/models/symbol.brand';
import { PriceQuote } from '../../domain/models/quote';

const symbol = asSymbol('AAPL');

const baseConfig: AlphaVantageConfig = {
  apiKey: 'test-key',
  baseUrl: 'https://www.alphavantage.co/query',
  cacheTtlMs: 60_000,
  enablePersistentCache: false,
  maxRequestsPerMinute: 5,
  minRequestSpacingMs: 0
};

const expectQuoteRequest = async (httpMock: HttpTestingController, expectedSymbol: string) => {
  const matcher = (request: HttpRequest<unknown>) =>
    request.url === baseConfig.baseUrl &&
    request.params.get('function') === 'GLOBAL_QUOTE' &&
    request.params.get('symbol') === expectedSymbol &&
    request.params.get('apikey') === baseConfig.apiKey;
  return waitForHttpRequest(httpMock, matcher, `quote request for ${expectedSymbol}`);
};

const expectSeriesRequest = async (
  httpMock: HttpTestingController,
  expectedSymbol: string,
  outputSize: 'compact' | 'full'
) => {
  const matcher = (request: HttpRequest<unknown>) =>
    request.url === baseConfig.baseUrl &&
    request.params.get('function') === 'TIME_SERIES_DAILY_ADJUSTED' &&
    request.params.get('symbol') === expectedSymbol &&
    request.params.get('apikey') === baseConfig.apiKey &&
    request.params.get('outputsize') === outputSize;
  return waitForHttpRequest(httpMock, matcher, `series request for ${expectedSymbol}`);
};

const waitForHttpRequest = async (
  httpMock: HttpTestingController,
  matcher: (request: HttpRequest<unknown>) => boolean,
  description: string
) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const matches = httpMock.match(matcher);
    if (matches.length > 0) {
      return matches[0];
    }
    await flushAsync();
  }
  throw new Error(`No ${description}`);
};

const flushAsync = async () => {
  await Promise.resolve();
  const usingFakeTimers = typeof setTimeout === 'function' && (setTimeout as unknown as { _isMockFunction?: boolean })._isMockFunction;
  if (usingFakeTimers) {
    jest.advanceTimersByTime(0);
  }
  await Promise.resolve();
};

describe('AlphaVantageApiService', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let cache: CacheService;
  let service: AlphaVantageApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    cache = new CacheService();
    service = new AlphaVantageApiService(httpClient, baseConfig, cache);
  });

  afterEach(() => {
    httpMock.verify();
    jest.useRealTimers();
    jest.restoreAllMocks();
    cache.clear();
  });

  it('maps global quote into domain object', async () => {
    const promise = service.getQuotes([symbol]);
    const request = await expectQuoteRequest(httpMock, 'AAPL');
    request.flush(globalQuoteAapl);
    const [quote] = await promise;
    expect(quote.symbol).toBe(symbol);
    expect(quote.price).toBeCloseTo(Number(globalQuoteAapl['Global Quote']?.['05. price']));
    expect(quote.changeAbs).toBeCloseTo(0.5);
    expect(quote.changePct).toBeCloseTo(0.2585);
    expect(quote.asOf).toBe('2024-07-05T00:00:00.000Z');
  });

  it('retries on rate limit and fails after max attempts', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const promise = service.getQuotes([symbol]);
    const firstRequest = await expectQuoteRequest(httpMock, 'AAPL');
    firstRequest.flush(null, { status: 429, statusText: 'Too Many Requests' });
    await flushAsync();
    jest.advanceTimersByTime(15_000);
    const secondRequest = await expectQuoteRequest(httpMock, 'AAPL');
    secondRequest.flush(null, { status: 429, statusText: 'Too Many Requests' });
    await flushAsync();
    jest.advanceTimersByTime(15_000);
    const thirdRequest = await expectQuoteRequest(httpMock, 'AAPL');
    thirdRequest.flush(null, { status: 429, statusText: 'Too Many Requests' });
    await expect(promise).rejects.toMatchObject({ code: 'HTTP/RATE_LIMIT' });
  });

  it('wraps malformed payload errors', async () => {
    const promise = service.getQuotes([symbol]);
    const request = await expectQuoteRequest(httpMock, 'AAPL');
    request.flush({ 'Global Quote': { '05. price': 'NaN' } });
    await expect(promise).rejects.toMatchObject({ code: 'VAL/QUOTE' });
  });

  it('throws when quote payload missing data', async () => {
    const promise = service.getQuotes([symbol]);
    const request = await expectQuoteRequest(httpMock, 'AAPL');
    request.flush({ 'Global Quote': {} });
    await expect(promise).rejects.toMatchObject({ code: 'VAL/QUOTE' });
  });

  it('fetches and trims compact time series using adjusted close', async () => {
    const promise = service.getTimeSeries(symbol, '1M');
    const request = await expectSeriesRequest(httpMock, 'AAPL', 'compact');
    request.flush(seriesCompactAapl);
    const series = await promise;
    expect(series.symbol).toBe(symbol);
    expect(series.candles.length).toBe(22);
    const first = series.candles[0];
    const last = series.candles[series.candles.length - 1];
    expect(first.t < last.t).toBe(true);
    const rawSeries = seriesCompactAapl['Time Series (Daily)'] as Record<string, Record<string, string>>;
    const rawLast = rawSeries[last.t.slice(0, 10)];
    expect(rawLast).toBeDefined();
    expect(last.c).toBeCloseTo(Number(rawLast['5. adjusted close']));
  });

  it('fetches full time series for MAX range', async () => {
    const promise = service.getTimeSeries(symbol, 'MAX');
    const request = await expectSeriesRequest(httpMock, 'AAPL', 'full');
    request.flush(seriesFullAapl);
    const series = await promise;
    expect(series.candles.length).toBe(Object.keys(seriesFullAapl['Time Series (Daily)']).length);
  });

  it('throws when time series payload missing', async () => {
    const promise = service.getTimeSeries(symbol, '1M');
    const request = await expectSeriesRequest(httpMock, 'AAPL', 'compact');
    request.flush({});
    await expect(promise).rejects.toMatchObject({ code: 'VAL/TIMESERIES' });
  });

  it('throws when time series filters to empty', async () => {
    const promise = service.getTimeSeries(symbol, '1M');
    const request = await expectSeriesRequest(httpMock, 'AAPL', 'compact');
    request.flush({
      'Time Series (Daily)': {
        '2024-01-02': {
          '1. open': 'NaN',
          '2. high': 'NaN',
          '3. low': 'NaN',
          '4. close': 'NaN'
        }
      }
    });
    await expect(promise).rejects.toMatchObject({ code: 'VAL/TIMESERIES' });
  });

  it('retries on server errors and fails with upstream code', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const promise = service.getTimeSeries(symbol, '1M');
    const firstRequest = await expectSeriesRequest(httpMock, 'AAPL', 'compact');
    firstRequest.flush(null, {
      status: 503,
      statusText: 'Service Unavailable'
    });
    await flushAsync();
    jest.advanceTimersByTime(15_000);
    const secondRequest = await expectSeriesRequest(httpMock, 'AAPL', 'compact');
    secondRequest.flush(null, {
      status: 503,
      statusText: 'Service Unavailable'
    });
    await flushAsync();
    jest.advanceTimersByTime(15_000);
    const thirdRequest = await expectSeriesRequest(httpMock, 'AAPL', 'compact');
    thirdRequest.flush(null, {
      status: 503,
      statusText: 'Service Unavailable'
    });
    await expect(promise).rejects.toMatchObject({ code: 'HTTP/UPSTREAM' });
  });

  it('retries when alpha vantage responds with rate limit note', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const promise = service.getQuotes([symbol]);
    const first = await expectQuoteRequest(httpMock, 'AAPL');
    first.flush({ Note: 'Please slow down' });
    await flushAsync();
    jest.advanceTimersByTime(0);
    const second = await expectQuoteRequest(httpMock, 'AAPL');
    second.flush(globalQuoteAapl);
    const [quote] = await promise;
    expect(quote.price).toBeGreaterThan(0);
  });

  it('uses cache for repeated quote requests within ttl', async () => {
    const first = service.getQuotes([symbol]);
    const request = await expectQuoteRequest(httpMock, 'AAPL');
    request.flush(globalQuoteAapl);
    await first;
    const second = await service.getQuotes([symbol]);
    expect(second).toHaveLength(1);
    expect(httpMock.match(() => true)).toHaveLength(0);
  });

  it('busts cache when cleared', async () => {
    const first = service.getQuotes([symbol]);
    const firstRequest = await expectQuoteRequest(httpMock, 'AAPL');
    firstRequest.flush(globalQuoteAapl);
    await first;
    cache.clear('av:');
    const secondPromise = service.getQuotes([symbol]);
    const secondRequest = await expectQuoteRequest(httpMock, 'AAPL');
    secondRequest.flush(globalQuoteAapl);
    await secondPromise;
  });

  it('maps http client errors to app error', async () => {
    const promise = service.getQuotes([symbol]);
    const request = await expectQuoteRequest(httpMock, 'AAPL');
    request.flush(null, { status: 400, statusText: 'Bad Request' });
    await expect(promise).rejects.toMatchObject({ code: 'HTTP/CLIENT' });
  });

  it('serialises queued quote requests with spacing', async () => {
    jest.useFakeTimers();
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    cache.clear();
    const spacingService = new AlphaVantageApiService(
      httpClient,
      { ...baseConfig, minRequestSpacingMs: 1000 },
      cache
    );
    const quotesPromise = spacingService.getQuotes([symbol, asSymbol('MSFT')]);
    jest.advanceTimersByTime(1000);
    const first = await expectQuoteRequest(httpMock, 'AAPL');
    first.flush(globalQuoteAapl);
    expect(httpMock.match(() => true)).toHaveLength(0);
    now = 1000;
    jest.advanceTimersByTime(1000);
    const second = await expectQuoteRequest(httpMock, 'MSFT');
    second.flush(globalQuoteAapl);
    await quotesPromise;
  });

  it('fails fast when api key missing', async () => {
    const cfg: AlphaVantageConfig = { ...baseConfig, apiKey: '' };
    const withoutKey = new AlphaVantageApiService(httpClient, cfg, cache);
    await expect(withoutKey.getQuotes([symbol])).rejects.toMatchObject({ code: 'HTTP/CLIENT' });
    expect(httpMock.match(() => true)).toHaveLength(0);
  });

  it('skips http calls on cached time series', async () => {
    const first = service.getTimeSeries(symbol, '1M');
    const request = await expectSeriesRequest(httpMock, 'AAPL', 'compact');
    request.flush(seriesCompactAapl);
    await first;
    const second = await service.getTimeSeries(symbol, '1M');
    expect(second.candles.length).toBe(22);
    expect(httpMock.match(() => true)).toHaveLength(0);
  });

  it('clears persistent cache entries', async () => {
    cache.usePersistentNamespace('av:', true);
    const first = service.getTimeSeries(symbol, 'MAX');
    const firstRequest = await expectSeriesRequest(httpMock, 'AAPL', 'full');
    firstRequest.flush(seriesFullAapl);
    await first;
    cache.clear('av:');
    const second = service.getTimeSeries(symbol, 'MAX');
    const secondRequest = await expectSeriesRequest(httpMock, 'AAPL', 'full');
    secondRequest.flush(seriesFullAapl);
    await second;
  });

  it('trims time series for YTD range', async () => {
    const promise = service.getTimeSeries(symbol, 'YTD');
    const request = await expectSeriesRequest(httpMock, 'AAPL', 'compact');
    request.flush({
      'Time Series (Daily)': {
        '2023-12-29': {
          '1. open': '100',
          '2. high': '110',
          '3. low': '90',
          '5. adjusted close': '95',
          '6. volume': '1000'
        },
        '2024-01-02': {
          '1. open': '120',
          '2. high': '125',
          '3. low': '115',
          '5. adjusted close': '123'
        }
      }
    });
    const series = await promise;
    expect(series.candles).toHaveLength(1);
    expect(series.candles[0].t.startsWith('2024')).toBe(true);
    expect(series.candles[0].v).toBeUndefined();
  });

  it('enforces per-minute rate limit window', async () => {
    jest.useFakeTimers();
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const rateCache = new CacheService();
    const rateLimited = new AlphaVantageApiService(
      httpClient,
      { ...baseConfig, maxRequestsPerMinute: 1, minRequestSpacingMs: 0 },
      rateCache
    );
    const promise = rateLimited.getQuotes([symbol, asSymbol('MSFT')]);
    const firstRequest = await expectQuoteRequest(httpMock, 'AAPL');
    firstRequest.flush(globalQuoteAapl);
    await flushAsync();
    expect(httpMock.match(() => true)).toHaveLength(0);
    jest.advanceTimersByTime(0);
    await flushAsync();
    now = 60_000;
    jest.advanceTimersByTime(60_000);
    await flushAsync();
    const secondRequest = await expectQuoteRequest(httpMock, 'MSFT');
    secondRequest.flush(globalQuoteAapl);
    await promise;
    rateCache.clear();
  });

  it('loads and maps list symbols', async () => {
    const promise = service.listSymbols();
    const request = httpMock.expectOne('assets/mock-data/symbols.json');
    request.flush([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currency: 'USD',
        exchange: 'NASDAQ'
      }
    ]);
    const symbols = await promise;
    expect(symbols).toHaveLength(1);
    expect(symbols[0].symbol).toBe(asSymbol('AAPL'));
    expect(symbols[0].name).toBe('Apple Inc.');
    expect(symbols[0].currency).toBe('USD');
    expect(symbols[0].exchange).toBe('NASDAQ');
  });

  it('wraps symbol parsing errors', async () => {
    const promise = service.listSymbols();
    const request = httpMock.expectOne('assets/mock-data/symbols.json');
    request.flush([
      {
        symbol: '',
        name: 'Broken',
        currency: 'USD'
      }
    ]);
    await expect(promise).rejects.toMatchObject({ code: 'VAL/SYMBOLS' });
  });

  it('completes stream when no symbols provided', (done) => {
    service.streamQuotes([]).subscribe({
      next: () => done.fail('should not emit quotes'),
      complete: () => done()
    });
  });

  it('streams quotes at configured interval', async () => {
    jest.useFakeTimers();
    const mockQuote: PriceQuote = {
      symbol,
      price: 100,
      changeAbs: 0,
      changePct: 0,
      asOf: '2024-01-01T00:00:00.000Z'
    };
    const streamingCache = new CacheService();
    const streamingService = new AlphaVantageApiService(
      httpClient,
      { ...baseConfig, minRequestSpacingMs: 1000 },
      streamingCache
    );
    const getQuotesSpy = jest
      .spyOn(streamingService, 'getQuotes')
      .mockResolvedValue([mockQuote]);
    const emissions: PriceQuote[] = [];
    const subscription = streamingService.streamQuotes([symbol]).subscribe((quote) => {
      emissions.push(quote);
    });

    expect(emissions).toHaveLength(0);
    jest.advanceTimersByTime(0);
    await flushAsync();
    expect(emissions).toHaveLength(1);

    jest.advanceTimersByTime(1000);
    await flushAsync();
    expect(emissions.length).toBeGreaterThanOrEqual(2);

    subscription.unsubscribe();
    getQuotesSpy.mockRestore();
    streamingCache.clear();
  });
});
