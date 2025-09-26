import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { defer, firstValueFrom, from, mergeMap, Observable, switchMap, timer } from 'rxjs';
import { z } from 'zod';

import { PriceApiPort, RangeKey, ListSymbol } from './price-api.port';
import { Symbol, asSymbol } from '../../domain/models/symbol.brand';
import { PriceQuote } from '../../domain/models/quote';
import { parseQuote, parseQuotesArray } from '../../domain/schemas/quote.schema';
import { parseTimeSeries } from '../../domain/schemas/time-series.schema';
import { TimeSeries } from '../../domain/models/candle';
import { AppError, wrapZodError } from '../errors/app-error';
import { CacheService } from '../services/cache.service';
import { ALPHAVANTAGE_CONFIG } from './alphavantage-config.token';

export interface AlphaVantageConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly maxRequestsPerMinute: number;
  readonly minRequestSpacingMs: number;
  readonly cacheTtlMs: number;
  readonly enablePersistentCache: boolean;
}

type OutputSize = 'compact' | 'full';

interface AlphaVantageQuoteResponse {
  readonly 'Global Quote'?: Record<string, string> | undefined;
  readonly Note?: string;
  readonly Information?: string;
  readonly 'Error Message'?: string;
}

interface AlphaVantageSeriesResponse {
  readonly 'Time Series (Daily)'?: Record<string, Record<string, string>> | undefined;
  readonly Note?: string;
  readonly Information?: string;
  readonly 'Error Message'?: string;
}

const listSymbolSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  currency: z.enum(['EUR', 'USD', 'CHF', 'GBP']),
  exchange: z.string().min(1).optional()
});

const LIST_SYMBOLS_URL = 'assets/mock-data/symbols.json';

const BACKOFF_BASE_MS = 1000;
const BACKOFF_FACTOR = 2;
const BACKOFF_MAX_MS = 15000;
const MAX_RETRIES = 3;

const RANGE_TO_OUTPUTSIZE: Record<Exclude<RangeKey, 'MAX'>, OutputSize> = {
  '1W': 'compact',
  '1M': 'compact',
  '3M': 'compact',
  '6M': 'compact',
  '1Y': 'compact',
  YTD: 'compact'
};

const RANGE_TO_SLICE: Record<RangeKey, number | 'YTD' | 'ALL'> = {
  '1W': 5,
  '1M': 22,
  '3M': 66,
  '6M': 132,
  '1Y': 264,
  YTD: 'YTD',
  MAX: 'ALL'
};

@Injectable()
export class AlphaVantageApiService implements PriceApiPort {
  private readonly cachePrefix = 'av:';

  private queue: Promise<void> = Promise.resolve();

  private lastRequestStart = Number.NEGATIVE_INFINITY;

  private readonly requestTimestamps: number[] = [];

  constructor(
    private readonly http: HttpClient,
    @Inject(ALPHAVANTAGE_CONFIG) private readonly config: AlphaVantageConfig,
    private readonly cache: CacheService
  ) {
    if (!config.apiKey) {
      // We still allow instantiation but fail fast on calls.
    }
    this.cache.usePersistentNamespace(this.cachePrefix, config.enablePersistentCache);
  }

  listSymbols(): Promise<readonly ListSymbol[]> {
    return firstValueFrom(this.http.get<unknown>(LIST_SYMBOLS_URL)).then((data) => {
      try {
        const parsed = z.array(listSymbolSchema).parse(data);
        return parsed.map<ListSymbol>((item) => ({
          symbol: asSymbol(item.symbol),
          name: item.name,
          currency: item.currency,
          exchange: item.exchange
        }));
      } catch (error) {
        throw wrapZodError(error, 'VAL/SYMBOLS', 'AlphaVantageSymbols');
      }
    });
  }

  async getQuotes(symbols: readonly Symbol[]): Promise<readonly PriceQuote[]> {
    this.ensureApiKey();
    const tasks: Promise<PriceQuote>[] = [];
    for (const symbol of symbols) {
      const cacheKey = this.buildCacheKey('quote', symbol);
      const cached = this.cache.get<PriceQuote>(cacheKey);
      if (cached && this.cache.hasFresh(cacheKey)) {
        tasks.push(Promise.resolve(cached));
        continue;
      }
      tasks.push(
        this.enqueue(() => this.fetchQuote(symbol)).then((quote) => {
          this.cache.set(cacheKey, quote, this.config.cacheTtlMs);
          return quote;
        })
      );
    }
    const quotes = await Promise.all(tasks);
    return parseQuotesArray(quotes);
  }

  async getTimeSeries(symbol: Symbol, range: RangeKey): Promise<TimeSeries> {
    this.ensureApiKey();
    const outputSize: OutputSize = range === 'MAX' ? 'full' : RANGE_TO_OUTPUTSIZE[range] ?? 'compact';
    const cacheKey = this.buildCacheKey('timeseries', symbol, outputSize);
    const cached = this.cache.get<TimeSeries>(cacheKey);
    if (cached && this.cache.hasFresh(cacheKey)) {
      const trimmed = this.trimSeries(cached, range);
      return parseTimeSeries({ symbol: trimmed.symbol, candles: trimmed.candles });
    }
    const series = await this.enqueue(() => this.fetchTimeSeries(symbol, outputSize));
    this.cache.set(cacheKey, series, this.config.cacheTtlMs);
    const trimmed = this.trimSeries(series, range);
    return parseTimeSeries({ symbol: trimmed.symbol, candles: trimmed.candles });
  }

  streamQuotes(symbols: readonly Symbol[]): Observable<PriceQuote> {
    return defer(() => {
      if (symbols.length === 0) {
        return new Observable<PriceQuote>((subscriber) => subscriber.complete());
      }
      return timer(0, this.config.minRequestSpacingMs).pipe(
        switchMap(() => from(this.getQuotes(symbols))),
        mergeMap((quotes) => from(quotes))
      );
    });
  }

  private async fetchQuote(symbol: Symbol): Promise<PriceQuote> {
    const params = new HttpParams({
      fromObject: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: this.config.apiKey
      }
    });
    const response = await this.performRequest<AlphaVantageQuoteResponse>(params, {
      endpoint: 'GLOBAL_QUOTE',
      symbol
    });
    const rawQuote = response['Global Quote'];
    if (!rawQuote || Object.keys(rawQuote).length === 0) {
      throw new AppError(`No quote data returned for ${symbol as string}.`, 'VAL/QUOTE');
    }
    const price = this.parseNumber(rawQuote['05. price']);
    const changeAbs = this.parseNumber(rawQuote['09. change']);
    const changePct = this.parsePercentage(rawQuote['10. change percent']);
    const asOf = this.parseTradingDay(rawQuote['07. latest trading day']);
    return parseQuote({ symbol, price, changeAbs, changePct, asOf });
  }

  private async fetchTimeSeries(symbol: Symbol, outputSize: OutputSize): Promise<TimeSeries> {
    const params = new HttpParams({
      fromObject: {
        function: 'TIME_SERIES_DAILY_ADJUSTED',
        symbol,
        apikey: this.config.apiKey,
        outputsize: outputSize
      }
    });
    const response = await this.performRequest<AlphaVantageSeriesResponse>(params, {
      endpoint: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol
    });
    const rawSeries = response['Time Series (Daily)'];
    if (!rawSeries) {
      throw new AppError(`No time series returned for ${symbol as string}.`, 'VAL/TIMESERIES');
    }
    const candles = Object.entries(rawSeries)
      .map(([date, values]) => ({
        t: `${date}T00:00:00.000Z`,
        o: this.parseNumber(values['1. open']),
        h: this.parseNumber(values['2. high']),
        l: this.parseNumber(values['3. low']),
        // Adjusted close captures dividends/splits for portfolio valuations.
        c: this.parseNumber(values['5. adjusted close'] ?? values['4. close']),
        v: this.parseOptionalNumber(values['6. volume'])
      }))
      .filter((candle) => Number.isFinite(candle.o) && Number.isFinite(candle.h) && Number.isFinite(candle.l) && Number.isFinite(candle.c))
      .sort((a, b) => a.t.localeCompare(b.t));
    if (candles.length === 0) {
      throw new AppError(`Empty time series received for ${symbol as string}.`, 'VAL/TIMESERIES');
    }
    return parseTimeSeries({ symbol, candles });
  }

  private async performRequest<T>(params: HttpParams, context: { endpoint: string; symbol: Symbol }): Promise<T> {
    let attempt = 0;
    let lastError: unknown;
    while (attempt < MAX_RETRIES) {
      try {
        const result = await firstValueFrom(this.http.get<T>(this.config.baseUrl, { params }));
        this.validateApiMessage(result as unknown, context);
        return result;
      } catch (error) {
        const appError = this.mapHttpError(error, context);
        lastError = appError;
        attempt += 1;
        if (attempt >= MAX_RETRIES || appError.code === 'HTTP/CLIENT') {
          throw appError;
        }
        const backoff = this.nextBackoffDelay(attempt);
        await this.sleep(backoff);
      }
    }
    throw lastError instanceof AppError ? lastError : new AppError('Unexpected AlphaVantage error.', 'HTTP/UPSTREAM', lastError);
  }

  private validateApiMessage(response: unknown, context: { endpoint: string; symbol: Symbol }): void {
    if (!response || typeof response !== 'object') {
      return;
    }
    const payload = response as { Note?: string; Information?: string; 'Error Message'?: string };
    if (payload.Note) {
      throw new AppError(payload.Note, 'HTTP/RATE_LIMIT', { context });
    }
    if (payload.Information) {
      throw new AppError(payload.Information, 'HTTP/CLIENT', { context });
    }
    if (payload['Error Message']) {
      throw new AppError(payload['Error Message'], 'HTTP/CLIENT', { context });
    }
  }

  private mapHttpError(error: unknown, context: { endpoint: string; symbol: Symbol }): AppError {
    if (error instanceof AppError) {
      return error;
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 429) {
        return new AppError('Rate limit exceeded for AlphaVantage.', 'HTTP/RATE_LIMIT', {
          context,
          cause: error
        });
      }
      if (error.status >= 500 || error.status === 0) {
        return new AppError('Upstream AlphaVantage error.', 'HTTP/UPSTREAM', {
          context,
          cause: error
        });
      }
      return new AppError('AlphaVantage rejected the request.', 'HTTP/CLIENT', {
        context,
        cause: error
      });
    }
    return new AppError('Unexpected AlphaVantage failure.', 'HTTP/UPSTREAM', { context, cause: error });
  }

  private trimSeries(series: TimeSeries, range: RangeKey): TimeSeries {
    const policy = RANGE_TO_SLICE[range];
    if (policy === 'ALL') {
      return series;
    }
    if (policy === 'YTD') {
      const latest = series.candles[series.candles.length - 1];
      const asOf = new Date(latest.t);
      const startOfYear = Date.UTC(asOf.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      const candles = series.candles.filter((candle) => Date.parse(candle.t) >= startOfYear);
      return { symbol: series.symbol, candles };
    }
    const candles = series.candles.slice(-policy);
    return { symbol: series.symbol, candles };
  }

  private parseNumber(value: string | undefined): number {
    if (!value) {
      return NaN;
    }
    return Number.parseFloat(value);
  }

  private parseOptionalNumber(value: string | undefined): number | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parsePercentage(value: string | undefined): number {
    if (!value) {
      return NaN;
    }
    const normalized = value.endsWith('%') ? value.slice(0, -1) : value;
    return Number.parseFloat(normalized);
  }

  private parseTradingDay(value: string | undefined): string {
    if (!value) {
      throw new AppError('Missing latest trading day.', 'VAL/QUOTE');
    }
    return `${value}T00:00:00.000Z`;
  }

  private ensureApiKey(): void {
    if (!this.config.apiKey) {
      throw new AppError('AlphaVantage API key is missing.', 'HTTP/CLIENT');
    }
  }

  private enqueue<T>(executor: () => Promise<T>): Promise<T> {
    const task = this.queue.then(() => this.guardRateLimit(executor));
    this.queue = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }

  private async guardRateLimit<T>(executor: () => Promise<T>): Promise<T> {
    await this.ensureSpacing();
    try {
      const result = await executor();
      return result;
    } finally {
      // no-op
    }
  }

  private async ensureSpacing(): Promise<void> {
    const now = Date.now();
    const spacingWait = Math.max(this.config.minRequestSpacingMs - (now - this.lastRequestStart), 0);
    const minuteWindow = 60_000;
    while (this.requestTimestamps.length > 0 && now - this.requestTimestamps[0] >= minuteWindow) {
      this.requestTimestamps.shift();
    }
    let rateWait = 0;
    if (this.requestTimestamps.length >= this.config.maxRequestsPerMinute) {
      const earliest = this.requestTimestamps[0];
      rateWait = Math.max(minuteWindow - (now - earliest), 0);
    }
    const wait = Math.max(spacingWait, rateWait);
    if (wait > 0) {
      await this.sleep(wait);
    }
    const startedAt = Date.now();
    this.lastRequestStart = startedAt;
    this.requestTimestamps.push(startedAt);
  }

  // Full jitter backoff as described by AWS Architecture Blog.
  private nextBackoffDelay(attempt: number): number {
    const cappedAttempt = Math.min(attempt, 10);
    const exponential = Math.min(BACKOFF_BASE_MS * BACKOFF_FACTOR ** (cappedAttempt - 1), BACKOFF_MAX_MS);
    const jitter = Math.random() * exponential;
    return jitter;
  }

  private sleep(durationMs: number): Promise<void> {
    if (durationMs <= 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }

  private buildCacheKey(endpoint: string, symbol: Symbol, extra?: string): string {
    return `${this.cachePrefix}${endpoint}:${symbol}${extra ? `:${extra}` : ''}`;
  }
}
