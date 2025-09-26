import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import symbolsFixture from '../../../assets/mock-data/symbols.json';
import aaplSeries from '../../../assets/mock-data/quotes/AAPL.json';
import msftSeries from '../../../assets/mock-data/quotes/MSFT.json';

import { MockPriceApiService } from './mock-price-api.service';
import { RangeKey } from './price-api.port';
import { asSymbol } from '../../domain/models/symbol.brand';
import { Symbol } from '../../domain/models/symbol.brand';
import { TimeSeries } from '../../domain/models/candle';
import { PriceQuote } from '../../domain/models/quote';
import { quoteSchema } from '../../domain/schemas/quote.schema';
import { createRandomWalk, createSeededRng } from '../../domain/utils/seeded-rng';

const symbolsUrl = 'assets/mock-data/symbols.json';
const seriesUrl = (symbol: string) => `assets/mock-data/quotes/${symbol}.json`;

describe('MockPriceApiService', () => {
  let service: MockPriceApiService;
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    service = new MockPriceApiService(httpClient, undefined, 5);
  });

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  httpMock.verify();
});

  it('lists symbols from fixtures', async () => {
    const promise = service.listSymbols();
    httpMock.expectOne(symbolsUrl).flush(symbolsFixture);
    const symbols = await promise;
    expect(symbols).toHaveLength(symbolsFixture.length);
    expect(symbols[0]).toHaveProperty('symbol');
  });

  it('gets time series for range slices', async () => {
    const symbol = asSymbol('AAPL');
    const promise = service.getTimeSeries(symbol, '1M');
    httpMock.expectOne(seriesUrl('AAPL')).flush(aaplSeries);
    const series = await promise;
    expect(series.candles).toHaveLength(22);
    expect(series.candles[0].t < series.candles[series.candles.length - 1].t).toBe(true);
  });

  it('computes quotes from last two candles', async () => {
    const symbol = asSymbol('MSFT');
    const promise = service.getQuotes([symbol]);
    httpMock.expectOne(seriesUrl('MSFT')).flush(msftSeries);
    const [quote] = await promise;
    const candles = msftSeries.candles;
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    expect(quote.price).toBe(last.c);
    expect(quote.changeAbs).toBeCloseTo(last.c - prev.c, 6);
    expect(quote.changePct).toBeCloseTo(((last.c - prev.c) / prev.c) * 100);
  });

  it('streams deterministic quotes', async () => {
    const symbol = asSymbol('AAPL');
    const warmupQuotesPromise = service.getQuotes([symbol]);
    httpMock.expectOne(seriesUrl('AAPL')).flush(aaplSeries);
    const [baseQuote] = await warmupQuotesPromise;

    const seed = 'AAPL'.split('').reduce((acc, char) => ((acc * 31 + char.charCodeAt(0)) >>> 0), 0);
    const expectedWalk = createRandomWalk(baseQuote.price, createSeededRng(seed), 0.6);

    const streamQuotesPromise = firstValueFrom(
      service.streamQuotes([symbol]).pipe(take(3), toArray())
    );

    const quotes = await streamQuotesPromise;
    expect(quotes).toHaveLength(3);
    const expectedPrices = [expectedWalk(), expectedWalk(), expectedWalk()].map((value) =>
      Number(value.toFixed(2))
    );
    expect(quotes.map((q) => q.price)).toEqual(expectedPrices);
  });

  it('throws for missing symbols file', async () => {
    const promise = service.listSymbols();
    httpMock
      .expectOne(symbolsUrl)
      .error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });
    await expect(promise).rejects.toMatchObject({ code: 'MOCK/NOT_FOUND' });
  });

  it('wraps invalid symbol payload', async () => {
    const promise = service.listSymbols();
    httpMock.expectOne(symbolsUrl).flush({ not: 'an array' });
    await expect(promise).rejects.toMatchObject({ code: 'VAL/SYMBOLS' });
  });

  it('throws when time series slice is empty', async () => {
    jest
      .spyOn(service as unknown as { loadTimeSeries: (symbol: Symbol) => Promise<TimeSeries> }, 'loadTimeSeries')
      .mockResolvedValueOnce({ symbol: asSymbol('AAPL'), candles: [] });
    await expect(service.getTimeSeries(asSymbol('AAPL'), '1W')).rejects.toMatchObject({ code: 'VAL/TIMESERIES' });
  });

  it('wraps parsing errors for time series', async () => {
    const [first, second] = aaplSeries.candles;
    jest
      .spyOn(service as unknown as { loadTimeSeries: (symbol: Symbol) => Promise<TimeSeries> }, 'loadTimeSeries')
      .mockResolvedValueOnce({ symbol: asSymbol('AAPL'), candles: [second, first] });
    await expect(service.getTimeSeries(asSymbol('AAPL'), 'MAX')).rejects.toMatchObject({ code: 'VAL/TIMESERIES' });
  });

  it('propagates HTTP errors for time series', async () => {
    const promise = service.getTimeSeries(asSymbol('AAPL'), 'MAX');
    httpMock
      .expectOne(seriesUrl('AAPL'))
      .error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });
    await expect(promise).rejects.toMatchObject({ code: 'MOCK/NOT_FOUND' });
  });

  it('throws when building quote from empty series', () => {
    expect(() =>
      (service as unknown as { buildQuoteFromSeries: (series: TimeSeries) => PriceQuote }).buildQuoteFromSeries({
        symbol: asSymbol('AAPL'),
        candles: []
      })
    ).toThrow(expect.objectContaining({ code: 'VAL/TIMESERIES' }));
  });

  it('wraps quote parsing errors in buildQuoteFromSeries', () => {
    expect(() =>
      (service as unknown as { buildQuoteFromSeries: (series: TimeSeries) => PriceQuote }).buildQuoteFromSeries({
        symbol: asSymbol('AAPL'),
        candles: [
          { t: '2024-01-01T00:00:00.000Z', o: 1, h: 1, l: 1, c: -1 }
        ]
      })
    ).toThrow(expect.objectContaining({ code: 'VAL/QUOTE' }));
  });

  it('throws when stream state is missing', async () => {
    jest.spyOn(service, 'getQuotes').mockResolvedValueOnce([]);
    await expect(
      firstValueFrom(service.streamQuotes([asSymbol('AAPL')]))
    ).rejects.toMatchObject({ code: 'MOCK/NOT_FOUND' });
  });

  it('wraps quote parsing errors from stream', async () => {
    const symbol = asSymbol('AAPL');
    const warmup = service.getQuotes([symbol]);
    httpMock.expectOne(seriesUrl('AAPL')).flush(aaplSeries);
    await warmup;
    jest.spyOn(quoteSchema, 'parse').mockImplementation(() => {
      throw new Error('parse failure');
    });
    await expect(firstValueFrom(service.streamQuotes([symbol]))).rejects.toMatchObject({ code: 'VAL/QUOTE' });
  });

  it('returns slices for various ranges', () => {
    const sliceCandles = (service as unknown as { sliceCandles: (candles: readonly any[], range: RangeKey) => readonly any[] })
      .sliceCandles.bind(service);
    const candles = aaplSeries.candles.slice(0, 30);
    expect(sliceCandles(candles, '1W').length).toBe(5);
    expect(sliceCandles(candles, '6M').length).toBe(30);
    expect(sliceCandles(candles, 'YTD').length).toBeGreaterThan(0);
    const defaultSlice = sliceCandles(candles, 'UNSUPPORTED' as RangeKey);
    expect(defaultSlice).toBe(candles);
  });
});
