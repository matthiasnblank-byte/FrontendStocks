import { createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';

import { TradesState } from './trades.models';
import * as TradesActions from './trades.actions';
import { Trade } from '../../../domain/models/trade';

export const tradesAdapter = createEntityAdapter<Trade>({
  selectId: (trade) => trade.id,
  sortComparer: (a, b) => a.timestamp.localeCompare(b.timestamp),
});

export const initialTradesState: TradesState = tradesAdapter.getInitialState({
  loading: false,
  error: null,
});

export const tradesReducer = createReducer(
  initialTradesState,
  on(TradesActions.loadTradesHydrateRequested, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(TradesActions.loadTradesHydrateSucceeded, (state, { trades }) =>
    tradesAdapter.setAll([...trades], {
      ...state,
      loading: false,
    })
  ),
  on(TradesActions.loadTradesHydrateFailed, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(TradesActions.addTradeRequested, (state) => ({
    ...state,
    loading: true,
  })),
  on(TradesActions.addTradeSucceeded, (state, { trade }) =>
    tradesAdapter.addOne(trade, {
      ...state,
      loading: false,
    })
  ),
  on(TradesActions.addTradeFailed, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(TradesActions.removeTradeRequested, (state) => ({
    ...state,
    loading: true,
  })),
  on(TradesActions.removeTradeSucceeded, (state, { id }) =>
    tradesAdapter.removeOne(id, {
      ...state,
      loading: false,
    })
  ),
  on(TradesActions.removeTradeFailed, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);
