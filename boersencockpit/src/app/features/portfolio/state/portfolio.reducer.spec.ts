import * as PortfolioActions from './portfolio.actions';
import { initialPortfolioState, portfolioReducer } from './portfolio.reducer';

describe('portfolioReducer', () => {
  it('returns initial state for unknown action', () => {
    const state = portfolioReducer(undefined, { type: 'Unknown' });
    expect(state).toEqual(initialPortfolioState);
  });

  it('updates range and revision on range change', () => {
    const state = portfolioReducer(
      initialPortfolioState,
      PortfolioActions.portfolioRangeChanged({ range: '3M' })
    );
    expect(state.selectedRange).toBe('3M');
    expect(state.revision).toBe(initialPortfolioState.revision + 1);
  });

  it('increments revision on recompute requested', () => {
    const state = portfolioReducer(
      initialPortfolioState,
      PortfolioActions.portfolioRecomputeRequested()
    );
    expect(state.revision).toBe(initialPortfolioState.revision + 1);
  });
});
