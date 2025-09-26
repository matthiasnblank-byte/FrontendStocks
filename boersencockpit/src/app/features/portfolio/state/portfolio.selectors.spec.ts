import { asSymbol } from '../../../domain/models/symbol.brand';
import { PortfolioSnapshot } from '../../../domain/models/portfolio-snapshot';
import { PriceQuote } from '../../../domain/models/quote';
import { Position } from '../../../domain/models/position';
import {
  selectPortfolioMetrics,
  selectPortfolioSnapshot,
  selectSelectedRange,
  selectPortfolioSeries,
  selectDailyPerformance,
  selectTotalPerformance,
} from './portfolio.selectors';
import { initialPortfolioState } from './portfolio.reducer';
import { Trade } from '../../../domain/models/trade';
import { Candle } from '../../../domain/models/candle';
import { RangeKey } from '../../../core/api/price-api.port';

const aapl = asSymbol('AAPL');
const sap = asSymbol('SAP');

const positions: Position[] = [
  { symbol: aapl, totalQuantity: 5, avgBuyPrice: 100, realizedPnL: 0 },
  { symbol: sap, totalQuantity: 3, avgBuyPrice: 80, realizedPnL: 20 },
];

const quotes: PriceQuote[] = [
  { symbol: aapl, price: 120, changeAbs: 5, changePct: 4.35, asOf: '2024-01-01T00:00:00.000Z' },
  { symbol: sap, price: 70, changeAbs: -2, changePct: -2.78, asOf: '2024-01-01T00:00:00.000Z' },
];

const trades: Trade[] = [
  { id: 't1', symbol: aapl, side: 'BUY', quantity: 5, price: 100, timestamp: '2024-01-01T00:00:00.000Z' },
  { id: 't2', symbol: sap, side: 'BUY', quantity: 3, price: 80, timestamp: '2024-01-01T00:00:00.000Z' },
];

const rawSeries = {
  [aapl]: {
    '1M': {
      symbol: aapl,
      candles: [
        { t: '2024-01-01T00:00:00.000Z', o: 0, h: 0, l: 0, c: 120 },
        { t: '2024-01-02T00:00:00.000Z', o: 0, h: 0, l: 0, c: 125 },
      ] satisfies Candle[],
    },
  },
  [sap]: {
    '1M': {
      symbol: sap,
      candles: [
        { t: '2024-01-01T00:00:00.000Z', o: 0, h: 0, l: 0, c: 70 },
        { t: '2024-01-02T00:00:00.000Z', o: 0, h: 0, l: 0, c: 75 },
      ] satisfies Candle[],
    },
  },
} as const;

const stockEntities = {
  [aapl]: { symbol: aapl, name: 'Apple', currency: 'USD' },
  [sap]: { symbol: sap, name: 'SAP', currency: 'EUR' },
} as const;

describe('portfolio selectors', () => {
  it('selectPortfolioMetrics computes snapshot metrics', () => {
    const snapshot = selectPortfolioMetrics.projector(positions, quotes);
    expect(snapshot.totalValue).toBeCloseTo(5 * 120 + 3 * 70);
    expect(snapshot.invested).toBeCloseTo(5 * 100 + 3 * 80);
    expect(snapshot.pnlAbs).toBeCloseTo(snapshot.totalValue - snapshot.invested);
  });

  it('selectPortfolioSnapshot respects given asOf date', () => {
    const selector = selectPortfolioSnapshot('2024-02-01T00:00:00.000Z') as unknown as {
      projector: (positions: readonly Position[], quotes: readonly PriceQuote[]) => PortfolioSnapshot;
    };
    const snapshot = selector.projector(positions, quotes);
    expect(snapshot.asOf).toBe('2024-02-01T00:00:00.000Z');
  });

  it('selectPortfolioSeries aggregates timeline data', () => {
    const selector = selectPortfolioSeries('1M' as RangeKey) as unknown as {
      projector: (
        tradesInput: readonly Trade[],
        seriesMap: Readonly<Record<string, Partial<Record<string, { candles: readonly Candle[] }>>>>
      ) => readonly {
        readonly totalValue: number;
        readonly invested: number;
      }[] | null;
    };

    const result = selector.projector(trades, rawSeries);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result?.[0].totalValue).toBeCloseTo(5 * 120 + 3 * 70);
    expect(result?.[1].totalValue).toBeCloseTo(5 * 125 + 3 * 75);
  });

  it('selectDailyPerformance sorts by changePct', () => {
    const selector = selectDailyPerformance(1) as unknown as {
      projector: (
        positionsInput: readonly Position[],
        quotesInput: readonly PriceQuote[],
        stockEntitiesInput: Readonly<Record<string, { symbol: typeof aapl; name: string; currency: 'USD' | 'EUR' }>>
      ) => { top: readonly { symbol: typeof aapl; currency: string }[]; flop: readonly { symbol: typeof aapl; currency: string }[] };
    };

    const result = selector.projector(positions, quotes, stockEntities);
    expect(result.top[0].symbol).toBe(aapl);
    expect(result.top[0].currency).toBe('USD');
    expect(result.flop[0].symbol).toBe(sap);
    expect(result.flop[0].currency).toBe('EUR');
  });

  it('selectTotalPerformance sorts by pnlPct', () => {
    const selector = selectTotalPerformance(1) as unknown as {
      projector: (
        positionsInput: readonly Position[],
        quotesInput: readonly PriceQuote[],
        stockEntitiesInput: Readonly<Record<string, { symbol: typeof aapl; name: string; currency: 'USD' | 'EUR' }>>
      ) => { top: readonly { symbol: typeof aapl }[]; flop: readonly { symbol: typeof aapl }[] };
    };

    const result = selector.projector(positions, quotes, stockEntities);
    expect(result.top[0].symbol).toBe(aapl);
    expect(result.flop[0].symbol).toBe(sap);
  });

  it('selectSelectedRange returns current range', () => {
    expect(selectSelectedRange.projector(initialPortfolioState)).toBe('1M');
  });
});
