import '@angular/common/locales/global/de';

import { PortfolioMetricsComponent } from './portfolio-metrics';

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const formatPercent = (value: number): string =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

describe('PortfolioMetricsComponent', () => {
  it('produces German formatted strings for currency and percent values', () => {
    const invested = formatCurrency(1234.56);
    const pnl = formatPercent(4.56);
    expect(invested).toContain('1.234,56');
    expect(pnl).toBe('4,56');
  });

  it('detects positive and negative values', () => {
    const component = new PortfolioMetricsComponent();
    expect(component['isPositive'](10)).toBe(true);
    expect(component['isPositive'](-1)).toBe(false);
  });
});
