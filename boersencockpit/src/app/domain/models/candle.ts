import { Symbol } from './symbol.brand';

export interface Candle {
  readonly t: string;
  readonly o: number;
  readonly h: number;
  readonly l: number;
  readonly c: number;
  readonly v?: number;
}

export interface TimeSeries {
  readonly symbol: Symbol;
  readonly candles: readonly Candle[];
}
