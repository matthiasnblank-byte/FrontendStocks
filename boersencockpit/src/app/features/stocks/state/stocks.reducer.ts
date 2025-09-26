import { createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';

import { ListSymbol } from '../../../core/api/price-api.port';
import { Symbol } from '../../../domain/models/symbol.brand';
import { StocksState } from './stocks.models';
import * as StocksActions from './stocks.actions';

export const stocksAdapter = createEntityAdapter<ListSymbol>({
  selectId: (symbol) => symbol.symbol,
  sortComparer: (a, b) => a.symbol.localeCompare(b.symbol),
});

export const initialStocksState: StocksState = stocksAdapter.getInitialState({
  loading: false,
  loaded: false,
  error: null,
  watchlist: [],
});

export const stocksReducer = createReducer(
  initialStocksState,
  on(StocksActions.loadSymbolsRequested, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(StocksActions.loadSymbolsSucceeded, (state, { symbols }) =>
    stocksAdapter.setAll([...symbols], {
      ...state,
      loading: false,
      loaded: true,
      watchlist: symbols.map<Symbol>((item) => item.symbol),
    })
  ),
  on(StocksActions.loadSymbolsFailed, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(StocksActions.watchSymbolRequested, (state, { symbol }) => ({
    ...state,
    watchlist: addToWatchlist(state.watchlist, symbol),
  })),
  on(StocksActions.unwatchSymbolRequested, (state, { symbol }) => ({
    ...state,
    watchlist: removeFromWatchlist(state.watchlist, symbol),
  }))
);

const addToWatchlist = (watchlist: readonly Symbol[], symbol: Symbol): readonly Symbol[] => {
  if (watchlist.includes(symbol)) {
    return watchlist;
  }
  return [...watchlist, symbol].sort((a, b) => a.localeCompare(b)) as readonly Symbol[];
};

const removeFromWatchlist = (watchlist: readonly Symbol[], symbol: Symbol): readonly Symbol[] =>
  watchlist.filter((entry) => entry !== symbol);

