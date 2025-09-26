import { Candle } from '../models/candle';
import { computePositions, computeSnapshot, buildPositionTimeline, computePortfolioSeries } from './portfolio';
import { asSymbol } from '../models/symbol.brand';
import { Trade } from '../models/trade';
import { PriceQuote } from '../models/quote';
import { RangeKey } from '../../core/api/price-api.port';

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

  it('builds a position timeline per candle', () => {
    const candles: Candle[] = [
      { t: '2024-01-01T00:00:00.000Z', o: 0, h: 0, l: 0, c: 100 },
      { t: '2024-01-02T00:00:00.000Z', o: 0, h: 0, l: 0, c: 120 },
      { t: '2024-01-03T00:00:00.000Z', o: 0, h: 0, l: 0, c: 130 },
    ];

    const timeline = buildPositionTimeline(trades, candles);

    expect(timeline).toHaveLength(3);
    expect(timeline[0]).toEqual({ t: candles[0].t, qty: 10, invested: 1000 });
    expect(timeline[1]).toEqual({ t: candles[1].t, qty: 15, invested: 1600 });
    expect(timeline[2]).toEqual({ t: candles[2].t, qty: 7, invested: 800 });
  });

  it('computes aggregated portfolio series with intersection of dates', () => {
    const sap = asSymbol('SAP');
    const dte = asSymbol('DTE');
    const sapTrades: Trade[] = trades;
    const dteTrades: Trade[] = [
      {
        id: 'd1',
        symbol: dte,
        side: 'BUY',
        quantity: 5,
        price: 50,
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    ];

    const sapCandles: Candle[] = [
      { t: '2024-01-01T00:00:00.000Z', o: 0, h: 0, l: 0, c: 100 },
      { t: '2024-01-02T00:00:00.000Z', o: 0, h: 0, l: 0, c: 120 },
      { t: '2024-01-03T00:00:00.000Z', o: 0, h: 0, l: 0, c: 130 },
    ];
    const dteCandles: Candle[] = [
      { t: '2024-01-01T00:00:00.000Z', o: 0, h: 0, l: 0, c: 50 },
      { t: '2024-01-02T00:00:00.000Z', o: 0, h: 0, l: 0, c: 55 },
      { t: '2024-01-04T00:00:00.000Z', o: 0, h: 0, l: 0, c: 60 },
    ];

    const positionsByDate = new Map([
      [sap, buildPositionTimeline(sapTrades, sapCandles)],
      [dte, buildPositionTimeline(dteTrades, dteCandles)],
    ]);

    const seriesBySymbol = new Map([
      [sap, sapCandles],
      [dte, dteCandles],
    ]);

    const range: RangeKey = '1M';
    const result = computePortfolioSeries(range, positionsByDate, seriesBySymbol);

    expect(result).toHaveLength(2);
    expect(result[0].t).toBe('2024-01-01T00:00:00.000Z');
    expect(result[1].t).toBe('2024-01-02T00:00:00.000Z');
    expect(result[0].totalValue).toBeCloseTo(10 * 100 + 5 * 50);
    expect(result[1].totalValue).toBeCloseTo(15 * 120 + 5 * 55);
    expect(result[1].invested).toBeCloseTo(1600 + 250);
  });
});
