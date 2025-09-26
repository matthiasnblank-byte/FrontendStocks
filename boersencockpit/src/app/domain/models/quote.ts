import { Symbol } from './symbol.brand';

export interface PriceQuote {
  readonly symbol: Symbol;
  readonly price: number;
  readonly changeAbs: number;
  readonly changePct: number;
  readonly asOf: string;
}
