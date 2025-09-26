import { Observable } from 'rxjs';

import { Symbol } from '../../domain/models/symbol.brand';
import { PriceQuote } from '../../domain/models/quote';
import { TimeSeries } from '../../domain/models/candle';

export type RangeKey = '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'MAX';

export interface ListSymbol {
  readonly symbol: Symbol;
  readonly name: string;
  readonly currency: 'EUR' | 'USD' | 'CHF' | 'GBP';
  readonly exchange?: string;
}

export interface PriceApiPort {
  listSymbols(): Promise<readonly ListSymbol[]>;

  getQuotes(symbols: readonly Symbol[]): Promise<readonly PriceQuote[]>;

  getTimeSeries(symbol: Symbol, range: RangeKey): Promise<TimeSeries>;

  streamQuotes(symbols: readonly Symbol[]): Observable<PriceQuote>;
}
