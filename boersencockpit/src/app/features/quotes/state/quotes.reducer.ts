import { createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';

import { PriceQuote } from '../../../domain/models/quote';
import { Symbol } from '../../../domain/models/symbol.brand';
import * as QuotesActions from './quotes.actions';
import { QuotesState } from './quotes.models';

export const quotesAdapter = createEntityAdapter<PriceQuote>({
  selectId: (quote) => quote.symbol,
  sortComparer: (a, b) => a.symbol.localeCompare(b.symbol),
});

export const initialQuotesState: QuotesState = quotesAdapter.getInitialState({
  loading: false,
  polling: false,
  pollingSymbols: [],
  error: null,
  lastUpdated: undefined,
});

export const quotesReducer = createReducer(
  initialQuotesState,
  on(QuotesActions.quotesSnapshotRequested, (state, { symbols }) => ({
    ...state,
    loading: true,
    error: null,
    pollingSymbols: ensureSymbolsUnique(symbols),
  })),
  on(QuotesActions.quotesPollStart, (state, { symbols }) => ({
    ...state,
    polling: true,
    pollingSymbols: ensureSymbolsUnique(symbols),
    error: null,
  })),
  on(QuotesActions.quotesPollStop, (state) => ({
    ...state,
    polling: false,
    pollingSymbols: [],
  })),
  on(QuotesActions.quotesTickArrived, (state, { quotes }) =>
    quotesAdapter.upsertMany([...quotes], {
      ...state,
      loading: false,
      lastUpdated: quotes.length
        ? quotes.map((quote) => quote.asOf).sort().slice(-1)[0]
        : state.lastUpdated,
    })
  ),
  on(QuotesActions.quotesTickFailed, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);

const ensureSymbolsUnique = (symbols: readonly Symbol[]): readonly Symbol[] =>
  Array.from(new Set(symbols)).sort((a, b) => a.localeCompare(b)) as readonly Symbol[];
