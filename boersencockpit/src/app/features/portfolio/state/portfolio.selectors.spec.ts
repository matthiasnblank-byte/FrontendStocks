import { asSymbol } from '../../../domain/models/symbol.brand';
import { PortfolioSnapshot } from '../../../domain/models/portfolio-snapshot';
import { PriceQuote } from '../../../domain/models/quote';
import { Position } from '../../../domain/models/position';
import {
  selectPortfolioMetrics,
  selectPortfolioSnapshot,
  selectTopFlop,
  selectSelectedRange,
} from './portfolio.selectors';
import { initialPortfolioState } from './portfolio.reducer';

const positions: Position[] = [
  { symbol: asSymbol('AAPL'), totalQuantity: 5, avgBuyPrice: 100, realizedPnL: 0 },
  { symbol: asSymbol('SAP'), totalQuantity: 3, avgBuyPrice: 80, realizedPnL: 20 },
];

const quotes: PriceQuote[] = [
  { symbol: asSymbol('AAPL'), price: 120, changeAbs: 5, changePct: 4.35, asOf: '2024-01-01T00:00:00.000Z' },
  { symbol: asSymbol('SAP'), price: 70, changeAbs: -2, changePct: -2.78, asOf: '2024-01-01T00:00:00.000Z' },
];

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

  it('selectTopFlop separates winners and losers', () => {
    const selector = selectTopFlop(1) as unknown as {
      projector: (positions: readonly Position[], quotes: readonly PriceQuote[]) => {
        top: readonly PriceQuote[];
        flop: readonly PriceQuote[];
      };
    };
    const result = selector.projector(positions, quotes);
    expect(result.top[0].symbol).toEqual(asSymbol('AAPL'));
    expect(result.flop[0].symbol).toEqual(asSymbol('SAP'));
  });

  it('selectSelectedRange returns current range', () => {
    expect(selectSelectedRange.projector(initialPortfolioState)).toBe('1M');
  });
});
