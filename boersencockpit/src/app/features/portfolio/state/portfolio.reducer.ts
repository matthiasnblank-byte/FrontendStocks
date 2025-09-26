import { createReducer, on } from '@ngrx/store';

import * as PortfolioActions from './portfolio.actions';
import { PortfolioState } from './portfolio.models';

export const initialPortfolioState: PortfolioState = {
  selectedRange: '1M',
  revision: 0,
};

export const portfolioReducer = createReducer(
  initialPortfolioState,
  on(PortfolioActions.portfolioRangeChanged, (state, { range }) => ({
    selectedRange: range,
    revision: state.revision + 1,
  })),
  on(PortfolioActions.portfolioRecomputeRequested, (state) => ({
    ...state,
    revision: state.revision + 1,
  }))
);
