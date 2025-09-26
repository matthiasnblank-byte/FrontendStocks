import { parsePortfolioSnapshot } from './portfolio-snapshot.schema';
import { AppError } from '../../core/errors/app-error';

describe('portfolioSnapshotSchema', () => {
  const snapshot = {
    asOf: '2024-03-01T00:00:00.000Z',
    totalValue: 1000,
    invested: 800,
    pnlAbs: 200,
    pnlPct: 25
  };

  it('parses portfolio snapshot', () => {
    expect(parsePortfolioSnapshot(snapshot)).toEqual(snapshot);
  });

  it('rejects invalid timestamp', () => {
    expect(() => parsePortfolioSnapshot({ ...snapshot, asOf: 'invalid' })).toThrow(AppError);
  });
});
