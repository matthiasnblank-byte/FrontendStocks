import { createSelector, createFeatureSelector } from '@ngrx/store';

import { QUOTES_FEATURE_KEY, QuotesState } from './quotes.models';
import { quotesAdapter, quotesReducer } from './quotes.reducer';
import { Symbol } from '../../../domain/models/symbol.brand';
import { PriceQuote } from '../../../domain/models/quote';

const { selectAll, selectEntities } = quotesAdapter.getSelectors();

export const quotesFeatureKey = QUOTES_FEATURE_KEY;
export const quotesFeatureReducer = quotesReducer;

export const selectQuotesState = createFeatureSelector<QuotesState>(QUOTES_FEATURE_KEY);

export const selectAllQuotes = createSelector(selectQuotesState, (state) => selectAll(state));

export const selectQuotesEntities = createSelector(selectQuotesState, (state) => selectEntities(state));

export const selectPollingSymbols = createSelector(
  selectQuotesState,
  (state) => state.pollingSymbols
);

export const selectQuoteBySymbol = (symbol: Symbol) =>
  createSelector(selectQuotesEntities, (entities) => entities[symbol]);

export const selectPositiveSymbols = createSelector(selectAllQuotes, (quotes) =>
  quotes.filter((quote: PriceQuote) => quote.changePct > 0).map((quote) => quote.symbol)
);

export const selectNegativeSymbols = createSelector(selectAllQuotes, (quotes) =>
  quotes.filter((quote: PriceQuote) => quote.changePct < 0).map((quote) => quote.symbol)
);

export const selectTopMovers = (count: number) =>
  createSelector(selectAllQuotes, (quotes) =>
    [...quotes]
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, count)
  );
