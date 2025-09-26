import { asSymbol } from '../../../domain/models/symbol.brand';
import { PriceQuote } from '../../../domain/models/quote';
import { quotesAdapter, initialQuotesState } from './quotes.reducer';
import {
  selectAllQuotes,
  selectQuoteBySymbol,
  selectPositiveSymbols,
  selectNegativeSymbols,
  selectTopMovers,
} from './quotes.selectors';

const quotes: PriceQuote[] = [
  { symbol: asSymbol('AAPL'), price: 100, changeAbs: 1, changePct: 1, asOf: '2024-01-01T00:00:00.000Z' },
  { symbol: asSymbol('SAP'), price: 90, changeAbs: -2, changePct: -2.2, asOf: '2024-01-01T00:00:00.000Z' },
  { symbol: asSymbol('MSFT'), price: 150, changeAbs: 5, changePct: 3, asOf: '2024-01-01T00:00:00.000Z' },
];

describe('quotes selectors', () => {
  const state = quotesAdapter.setAll(quotes, initialQuotesState);
  const rootState = { quotes: state } as { quotes: typeof state };

  it('selectAllQuotes returns sorted quotes', () => {
    expect(selectAllQuotes.projector(state)[0].symbol).toEqual(asSymbol('AAPL'));
  });

  it('selectQuoteBySymbol returns quote', () => {
    const selector = selectQuoteBySymbol(asSymbol('SAP'));
    expect(selector(rootState)).toEqual(quotes[1]);
  });

  it('selectPositiveSymbols returns only positive movers', () => {
    expect(selectPositiveSymbols.projector(quotes)).toEqual([
      asSymbol('AAPL'),
      asSymbol('MSFT'),
    ]);
  });

  it('selectNegativeSymbols returns only negative movers', () => {
    expect(selectNegativeSymbols.projector(quotes)).toEqual([asSymbol('SAP')]);
  });

  it('selectTopMovers returns top movers by change percentage', () => {
    const selector = selectTopMovers(2);
    const result = selector(rootState);
    expect(result.map((quote) => quote.symbol)).toEqual([asSymbol('MSFT'), asSymbol('SAP')]);
  });
});
