import { Symbol } from './symbol.brand';

export interface Position {
  readonly symbol: Symbol;
  readonly totalQuantity: number;
  readonly avgBuyPrice?: number;
  readonly realizedPnL: number;
}
