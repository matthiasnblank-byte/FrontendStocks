import { createSelector } from '@ngrx/store';
import { createFeature } from '@ngrx/store';

import { STOCKS_FEATURE_KEY } from './stocks.models';
import { stocksAdapter, stocksReducer } from './stocks.reducer';
import { Symbol } from '../../../domain/models/symbol.brand';

const { selectAll, selectEntities } = stocksAdapter.getSelectors();

export const stocksFeature = createFeature({
  name: STOCKS_FEATURE_KEY,
  reducer: stocksReducer,
  extraSelectors: ({ selectStocksState }) => ({
    selectAllStocks: createSelector(selectStocksState, selectAll),
    selectStockEntities: createSelector(selectStocksState, selectEntities),
    selectWatchlist: createSelector(selectStocksState, (state) => state.watchlist),
    selectWatchedSymbols: createSelector(selectStocksState, (state) => state.watchlist),
  }),
});

export const {
  name: stocksFeatureKey,
  reducer: stocksFeatureReducer,
  selectStocksState,
  selectAllStocks,
  selectStockEntities,
  selectWatchlist,
  selectWatchedSymbols,
} = stocksFeature;

export const selectStockBySymbol = (symbol: Symbol) =>
  createSelector(selectStockEntities, (entities) => entities[symbol]);
