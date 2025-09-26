import { asSymbol } from '../../../domain/models/symbol.brand';
import { Trade } from '../../../domain/models/trade';
import { tradesAdapter, initialTradesState } from './trades.reducer';
import { selectAllTrades, selectTradeCount, selectTradesBySymbol, selectPositions } from './trades.selectors';

const trades: Trade[] = [
  {
    id: 't1',
    symbol: asSymbol('SAP'),
    side: 'BUY',
    quantity: 10,
    price: 100,
    timestamp: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 't2',
    symbol: asSymbol('SAP'),
    side: 'SELL',
    quantity: 4,
    price: 120,
    timestamp: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 't3',
    symbol: asSymbol('AAPL'),
    side: 'BUY',
    quantity: 5,
    price: 80,
    timestamp: '2024-01-03T00:00:00.000Z',
  },
];

describe('trades selectors', () => {
  const state = tradesAdapter.setAll(trades, initialTradesState);
  const rootState = { trades: state } as { trades: typeof state };

  it('selectAllTrades returns all trades', () => {
    expect(selectAllTrades.projector(state)).toHaveLength(trades.length);
  });

  it('selectTradeCount returns total count', () => {
    expect(selectTradeCount.projector(state)).toBe(trades.length);
  });

  it('selectTradesBySymbol filters trades', () => {
    const selector = selectTradesBySymbol(asSymbol('SAP'));
    expect(selector(rootState)).toHaveLength(2);
  });

  it('selectPositions computes FIFO positions', () => {
    const [firstPosition, secondPosition] = selectPositions.projector(trades);
    expect(firstPosition.symbol).toEqual(asSymbol('AAPL'));
    expect(secondPosition.totalQuantity).toBe(6);
    expect(secondPosition.realizedPnL).toBeCloseTo(80);
  });
});
