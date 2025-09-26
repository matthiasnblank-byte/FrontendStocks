import { RangeKey } from '../../../core/api/price-api.port';

export interface PortfolioState {
  readonly selectedRange: RangeKey;
  readonly revision: number;
}

export const PORTFOLIO_FEATURE_KEY = 'portfolio';
