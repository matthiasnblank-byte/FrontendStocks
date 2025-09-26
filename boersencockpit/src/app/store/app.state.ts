import { ActionReducerMap } from '@ngrx/store';

import { StocksState } from '../features/stocks/state/stocks.models';
import { stocksFeatureReducer } from '../features/stocks/state/stocks.selectors';
import { TradesState } from '../features/trades/state/trades.models';
import { tradesFeatureReducer } from '../features/trades/state/trades.selectors';
import { QuotesState } from '../features/quotes/state/quotes.models';
import { quotesFeatureReducer } from '../features/quotes/state/quotes.selectors';
import { TimeSeriesState } from '../features/timeseries/state/timeseries.models';
import { timeSeriesFeatureReducer } from '../features/timeseries/state/timeseries.selectors';
import { PortfolioState } from '../features/portfolio/state/portfolio.models';
import { portfolioFeatureReducer } from '../features/portfolio/state/portfolio.selectors';

export interface AppState {
  readonly stocks: StocksState;
  readonly trades: TradesState;
  readonly quotes: QuotesState;
  readonly timeseries: TimeSeriesState;
  readonly portfolio: PortfolioState;
}

export const appReducers: ActionReducerMap<AppState> = {
  stocks: stocksFeatureReducer,
  trades: tradesFeatureReducer,
  quotes: quotesFeatureReducer,
  timeseries: timeSeriesFeatureReducer,
  portfolio: portfolioFeatureReducer,
};
