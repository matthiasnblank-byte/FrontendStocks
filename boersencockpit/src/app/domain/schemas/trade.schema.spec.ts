import { asSymbol } from '../models/symbol.brand';
import { parseTrade, parseTradesArray, isTrade } from './trade.schema';
import { AppError } from '../../core/errors/app-error';

describe('tradeSchema', () => {
  const baseTrade = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    symbol: 'AAPL',
    side: 'BUY' as const,
    quantity: 10,
    price: 120,
    timestamp: '2024-01-02T00:00:00.000Z',
    note: 'Initial position'
  };

  it('parses a valid trade', () => {
    const trade = parseTrade(baseTrade);
    expect(trade.symbol).toEqual(asSymbol('AAPL'));
    expect(trade.quantity).toBe(10);
  });

  it('throws AppError for invalid quantity', () => {
    expect(() => parseTrade({ ...baseTrade, quantity: 0 })).toThrow(AppError);
  });

  it('parses an array of trades', () => {
    const trades = parseTradesArray([
      baseTrade,
      { ...baseTrade, id: '123e4567-e89b-12d3-a456-426614174000', side: 'SELL' }
    ]);
    expect(trades).toHaveLength(2);
  });

  it('rejects lowercase symbol', () => {
    expect(() => parseTrade({ ...baseTrade, symbol: 'aapl' })).toThrow(AppError);
  });

  it('guards valid trade', () => {
    expect(isTrade(parseTrade(baseTrade))).toBe(true);
    expect(isTrade({})).toBe(false);
  });
});
