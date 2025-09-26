import { createFeature } from '@ngrx/store';
import { createSelector } from '@ngrx/store';

import { PORTFOLIO_FEATURE_KEY } from './portfolio.models';
import { portfolioReducer } from './portfolio.reducer';
import { selectPositions as selectTradePositions } from '../../trades/state/trades.selectors';
import { selectAllQuotes, selectQuoteBySymbol } from '../../quotes/state/quotes.selectors';
import { computeSnapshot } from '../../../domain/utils/portfolio';
import { PortfolioSnapshot } from '../../../domain/models/portfolio-snapshot';
import { PriceQuote } from '../../../domain/models/quote';
import { Position } from '../../../domain/models/position';
import { Symbol } from '../../../domain/models/symbol.brand';

export const portfolioFeature = createFeature({
  name: PORTFOLIO_FEATURE_KEY,
  reducer: portfolioReducer,
  extraSelectors: ({ selectPortfolioState }) => ({
    selectSelectedRange: createSelector(selectPortfolioState, (state) => state.selectedRange),
    selectRevision: createSelector(selectPortfolioState, (state) => state.revision),
  }),
});

export const {
  name: portfolioFeatureKey,
  reducer: portfolioFeatureReducer,
  selectPortfolioState,
  selectSelectedRange,
  selectRevision,
} = portfolioFeature;

export const selectPositions = selectTradePositions;

export const selectPortfolioMetrics = createSelector(
  selectPositions,
  selectAllQuotes,
  (positions: readonly Position[], quotes: readonly PriceQuote[]): PortfolioSnapshot => {
    if (positions.length === 0) {
      return {
        asOf: '1970-01-01T00:00:00.000Z',
        totalValue: 0,
        invested: 0,
        pnlAbs: 0,
        pnlPct: 0,
      };
    }
    const asOf = quotes.reduce((latest, quote) => (quote.asOf > latest ? quote.asOf : latest), '1970-01-01T00:00:00.000Z');
    return computeSnapshot(asOf, positions, quotes);
  }
);

export const selectPortfolioSnapshot = (asOf: string) =>
  createSelector(selectPositions, selectAllQuotes, (positions: readonly Position[], quotes: readonly PriceQuote[]) =>
    computeSnapshot(asOf, positions, quotes)
  );

export const selectTopFlop = (count: number) =>
  createSelector(selectPositions, selectAllQuotes, (positions: readonly Position[], quotes: readonly PriceQuote[]) => {
    const quoteMap = new Map<Symbol, PriceQuote>(quotes.map((quote) => [quote.symbol, quote]));
    const relevant = positions
      .map((position) => ({ position, quote: quoteMap.get(position.symbol) }))
      .filter((entry): entry is { position: typeof positions[number]; quote: PriceQuote } => Boolean(entry.quote));

    const sortedByChange = [...relevant].sort(
      (a, b) => b.quote.changePct - a.quote.changePct
    );
    const top = sortedByChange.slice(0, count).map((entry) => entry.quote);
    const flop = [...sortedByChange].reverse().slice(0, count).map((entry) => entry.quote);
    return { top, flop };
  });
