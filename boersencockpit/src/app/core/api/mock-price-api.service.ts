import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import {
  defer,
  firstValueFrom,
  from,
  interval,
  map,
  mergeMap,
  Observable,
  SchedulerLike,
  asyncScheduler
} from 'rxjs';
import { z } from 'zod';

import { PriceQuote } from '../../domain/models/quote';
import { Candle, TimeSeries } from '../../domain/models/candle';
import { Symbol } from '../../domain/models/symbol.brand';
import { quoteSchema } from '../../domain/schemas/quote.schema';
import { isoStringSchema } from '../../domain/schemas/common';
import { symbolSchema } from '../../domain/schemas/symbol.schema';
import { parseTimeSeries, timeSeriesSchema } from '../../domain/schemas/time-series.schema';
import { createRandomWalk, createSeededRng } from '../../domain/utils/seeded-rng';
import { AppError, wrapZodError } from '../errors/app-error';
import { ListSymbol, PriceApiPort, RangeKey } from './price-api.port';

export const MOCK_STREAM_SCHEDULER = new InjectionToken<SchedulerLike>(
  'MOCK_STREAM_SCHEDULER'
);

export const MOCK_STREAM_INTERVAL = new InjectionToken<number>(
  'MOCK_STREAM_INTERVAL'
);

const listSymbolSchema = z.object({
  symbol: symbolSchema,
  name: z.string().min(1, 'Name is required.'),
  currency: z.enum(['EUR', 'USD', 'CHF', 'GBP']),
  exchange: z.string().min(1).optional()
});

@Injectable({ providedIn: 'root' })
export class MockPriceApiService implements PriceApiPort {
  private readonly basePath = 'assets/mock-data';
  private readonly quotesPath = `${this.basePath}/quotes`;

  private symbolsCache?: Promise<readonly ListSymbol[]>;
  private timeSeriesCache = new Map<Symbol, Promise<TimeSeries>>();
  private readonly scheduler: SchedulerLike;
  private readonly streamInterval: number;

  constructor(
    private readonly http: HttpClient,
    @Optional() @Inject(MOCK_STREAM_SCHEDULER) scheduler?: SchedulerLike,
    @Optional() @Inject(MOCK_STREAM_INTERVAL) streamInterval?: number
  ) {
    this.scheduler = scheduler ?? asyncScheduler;
    this.streamInterval = streamInterval ?? 2000;
  }

  listSymbols(): Promise<readonly ListSymbol[]> {
    if (!this.symbolsCache) {
      this.symbolsCache = this.loadSymbols();
    }
    return this.symbolsCache;
  }

  async getQuotes(symbols: readonly Symbol[]): Promise<readonly PriceQuote[]> {
    const series = await Promise.all(symbols.map((symbol) => this.loadTimeSeries(symbol)));
    return series.map((timeSeries) => this.buildQuoteFromSeries(timeSeries));
  }

  async getTimeSeries(symbol: Symbol, range: RangeKey): Promise<TimeSeries> {
    const fullSeries = await this.loadTimeSeries(symbol);
    const candles = this.sliceCandles(fullSeries.candles, range);
    if (candles.length === 0) {
      throw new AppError(`No candles available for ${symbol} in range ${range}.`, 'VAL/TIMESERIES');
    }
    try {
      return timeSeriesSchema.parse({ symbol: fullSeries.symbol, candles });
    } catch (error) {
      throw wrapZodError(error, 'VAL/TIMESERIES', `TimeSeries(${symbol})`);
    }
  }

  streamQuotes(symbols: readonly Symbol[]): Observable<PriceQuote> {
    return defer(async () => {
      const baseQuotes = await this.getQuotes(symbols);
      const state = new Map<Symbol, {
        previous: number;
        walker: () => number;
        lastAsOf: string;
      }>();
      let baseTimestamp = 0;
      for (const quote of baseQuotes) {
        const seed = this.seedForSymbol(quote.symbol);
        const rng = createSeededRng(seed);
        const walker = createRandomWalk(quote.price, rng, 0.6);
        state.set(quote.symbol, {
          previous: quote.price,
          walker,
          lastAsOf: quote.asOf
        });
        const timestamp = Date.parse(quote.asOf);
        if (timestamp > baseTimestamp) {
          baseTimestamp = timestamp;
        }
      }
      return { state, baseTimestamp };
    }).pipe(
      mergeMap(({ state, baseTimestamp }) => {
        let tick = 0;
        return interval(this.streamInterval, this.scheduler).pipe(
          map(() => {
            tick += 1;
            const tickTimestamp = new Date(baseTimestamp + tick * 2000).toISOString();
            return { tickTimestamp, state };
          }),
          mergeMap(({ tickTimestamp, state: innerState }) =>
            from(symbols).pipe(
              map((symbol) => {
                const entry = innerState.get(symbol);
                if (!entry) {
                  throw new AppError(`No state for symbol ${symbol as string}.`, 'MOCK/NOT_FOUND');
                }
                const nextPrice = Number(entry.walker().toFixed(2));
                const changeAbs = Number((nextPrice - entry.previous).toFixed(6));
                const changePct = entry.previous !== 0 ? (changeAbs / entry.previous) * 100 : 0;
                entry.previous = nextPrice;
                entry.lastAsOf = tickTimestamp;
                try {
                  return quoteSchema.parse({
                    symbol,
                    price: nextPrice,
                    changeAbs,
                    changePct,
                    asOf: tickTimestamp
                  });
                } catch (error) {
                  throw wrapZodError(error, 'VAL/QUOTE', `StreamQuote(${symbol as string})`);
                }
              })
            )
          )
        );
      })
    );
  }

  private async loadSymbols(): Promise<readonly ListSymbol[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.basePath}/symbols.json`)
      );
      const parsed = z.array(listSymbolSchema).parse(data);
      return parsed;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw wrapZodError(error, 'VAL/SYMBOLS', 'Symbols');
      }
      throw new AppError('Mock symbols not found.', 'MOCK/NOT_FOUND', error);
    }
  }

  private async loadTimeSeries(symbol: Symbol): Promise<TimeSeries> {
    const cached = this.timeSeriesCache.get(symbol);
    if (cached) {
      return cached;
    }
    const request = this.fetchTimeSeries(symbol);
    this.timeSeriesCache.set(symbol, request);
    return request;
  }

  private async fetchTimeSeries(symbol: Symbol): Promise<TimeSeries> {
    try {
      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.quotesPath}/${symbol}.json`)
      );
      return parseTimeSeries(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw wrapZodError(error, 'VAL/TIMESERIES', `TimeSeries(${symbol})`);
      }
      throw new AppError(`Mock time series for ${symbol} not found.`, 'MOCK/NOT_FOUND', error);
    }
  }

  private buildQuoteFromSeries(series: TimeSeries): PriceQuote {
    const candles = series.candles;
    if (candles.length === 0) {
      throw new AppError(`No candles available for ${series.symbol}.`, 'VAL/TIMESERIES');
    }
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2] ?? last;
    const changeAbs = Number((last.c - prev.c).toFixed(6));
    const changePct = prev.c !== 0 ? (changeAbs / prev.c) * 100 : 0;
    try {
      return quoteSchema.parse({
        symbol: series.symbol,
        price: last.c,
        changeAbs,
        changePct,
        asOf: last.t
      });
    } catch (error) {
      throw wrapZodError(error, 'VAL/QUOTE', `Quote(${series.symbol as string})`);
    }
  }

  private sliceCandles(candles: readonly Candle[], range: RangeKey): readonly Candle[] {
    if (candles.length === 0) {
      return [];
    }
    switch (range) {
      case '1W':
        return candles.slice(-5);
      case '1M':
        return candles.slice(-22);
      case '3M':
        return candles.slice(-66);
      case '6M':
        return candles.slice(-132);
      case '1Y':
        return candles.slice(-264);
      case 'MAX':
        return candles;
      case 'YTD': {
        const last = candles[candles.length - 1];
        const asOf = isoStringSchema.parse(last.t);
        const year = new Date(asOf).getUTCFullYear();
        const startOfYear = Date.parse(`${year}-01-01T00:00:00.000Z`);
        return candles.filter((candle) => Date.parse(candle.t) >= startOfYear);
      }
      default:
        return candles;
    }
  }

  private seedForSymbol(symbol: Symbol): number {
    let seed = 0;
    for (let i = 0; i < symbol.length; i += 1) {
      seed = (seed * 31 + symbol.charCodeAt(i)) >>> 0;
    }
    return seed;
  }
}
