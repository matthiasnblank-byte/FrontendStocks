import { PortfolioTopflopComponent, DailyPerformanceViewModel, TotalPerformanceViewModel } from './portfolio-topflop';
import { asSymbol } from '../../../domain/models/symbol.brand';

describe('PortfolioTopflopComponent', () => {
  it('trackBySymbol returns stable symbol reference', () => {
    const component = new PortfolioTopflopComponent();
    const entry: DailyPerformanceViewModel = {
      symbol: asSymbol('SAP'),
      changePct: 1.2,
      changeAbs: 0.5,
      price: 100,
      currency: 'EUR',
    };
    expect(component['trackBySymbol'](0, entry)).toBe(entry.symbol);
  });

  it('reuses positivity helper for total performance', () => {
    const component = new PortfolioTopflopComponent();
    const negative: TotalPerformanceViewModel = {
      symbol: asSymbol('DTE'),
      pnlPct: -5,
      pnlAbs: -10,
      qty: 5,
      currency: 'EUR',
    };
    expect(component['isPositive'](negative.pnlPct)).toBe(false);
  });
});
