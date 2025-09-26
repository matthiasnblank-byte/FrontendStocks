import { computePositions, computeSnapshot } from './portfolio';
import { asSymbol } from '../models/symbol.brand';
import { Trade } from '../models/trade';
import { PriceQuote } from '../models/quote';

describe('portfolio utils', () => {
  const trades: Trade[] = [
    {
      id: 't1',
      symbol: asSymbol('SAP'),
      side: 'BUY',
      quantity: 10,
      price: 100,
      timestamp: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 't2',
      symbol: asSymbol('SAP'),
      side: 'BUY',
      quantity: 5,
      price: 120,
      timestamp: '2024-01-02T00:00:00.000Z'
    },
    {
      id: 't3',
      symbol: asSymbol('SAP'),
      side: 'SELL',
      quantity: 8,
      price: 130,
      timestamp: '2024-01-03T00:00:00.000Z'
    }
  ];

  it('computes positions with FIFO realized PnL', () => {
    const positions = computePositions(trades);
    expect(positions).toHaveLength(1);
    const [position] = positions;
    expect(position.totalQuantity).toBe(7);
    expect(position.avgBuyPrice).toBeCloseTo(114.285714, 6);
    expect(position.realizedPnL).toBeCloseTo(240);
  });

  it('handles short positions gracefully', () => {
    const shortTrades: Trade[] = [
      {
        id: 's1',
        symbol: asSymbol('DTE'),
        side: 'SELL',
        quantity: 3,
        price: 20,
        timestamp: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 's2',
        symbol: asSymbol('DTE'),
        side: 'BUY',
        quantity: 1,
        price: 18,
        timestamp: '2024-01-02T00:00:00.000Z'
      }
    ];
    const positions = computePositions(shortTrades);
    expect(positions[0].totalQuantity).toBe(-2);
    expect(positions[0].avgBuyPrice).toBeUndefined();
    expect(positions[0].realizedPnL).toBeCloseTo(2);
  });

  it('computes snapshot metrics', () => {
    const positions = computePositions(trades);
    const quotes: PriceQuote[] = [
      {
        symbol: asSymbol('SAP'),
        price: 140,
        changeAbs: 0,
        changePct: 0,
        asOf: '2024-01-04T00:00:00.000Z'
      }
    ];
    const snapshot = computeSnapshot('2024-01-04T00:00:00.000Z', positions, quotes);
    expect(snapshot.totalValue).toBeCloseTo(980);
    expect(snapshot.invested).toBeCloseTo(800);
    expect(snapshot.pnlAbs).toBeCloseTo(180);
    expect(snapshot.pnlPct).toBeCloseTo((180 / 800) * 100);
  });
});
