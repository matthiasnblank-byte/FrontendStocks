import { Symbol } from './symbol.brand';

export interface Trade {
  readonly id: string;
  readonly symbol: Symbol;
  readonly side: 'BUY' | 'SELL';
  readonly quantity: number;
  readonly price: number;
  readonly timestamp: string;
  readonly note?: string;
}
