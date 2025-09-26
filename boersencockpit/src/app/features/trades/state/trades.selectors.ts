import { createFeature } from '@ngrx/store';
import { createSelector } from '@ngrx/store';

import { TRADES_FEATURE_KEY } from './trades.models';
import { tradesAdapter, tradesReducer } from './trades.reducer';
import { Symbol } from '../../../domain/models/symbol.brand';
import { computePositions } from '../../../domain/utils/portfolio';

const { selectAll, selectEntities, selectTotal } = tradesAdapter.getSelectors();

export const tradesFeature = createFeature({
  name: TRADES_FEATURE_KEY,
  reducer: tradesReducer,
  extraSelectors: ({ selectTradesState }) => ({
    selectAllTrades: createSelector(selectTradesState, selectAll),
    selectTradesEntities: createSelector(selectTradesState, selectEntities),
    selectTradeCount: createSelector(selectTradesState, selectTotal),
  }),
});

export const {
  name: tradesFeatureKey,
  reducer: tradesFeatureReducer,
  selectTradesState,
  selectAllTrades,
  selectTradesEntities,
  selectTradeCount,
} = tradesFeature;

export const selectTradesBySymbol = (symbol: Symbol) =>
  createSelector(selectAllTrades, (trades) => trades.filter((trade) => trade.symbol === symbol));

export const selectPositions = createSelector(selectAllTrades, (trades) => computePositions(trades));
