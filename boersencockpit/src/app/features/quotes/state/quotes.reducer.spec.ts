import { asSymbol } from '../../../domain/models/symbol.brand';
import { PriceQuote } from '../../../domain/models/quote';
import { serializeError } from '../../../core/errors/serializable-error';
import * as QuotesActions from './quotes.actions';
import { initialQuotesState, quotesReducer } from './quotes.reducer';

describe('quotesReducer', () => {
  const quote: PriceQuote = {
    symbol: asSymbol('AAPL'),
    price: 100,
    changeAbs: 1,
    changePct: 1,
    asOf: '2024-01-01T00:00:00.000Z',
  };

  it('returns initial state for unknown action', () => {
    const state = quotesReducer(undefined, { type: 'Unknown' });
    expect(state).toEqual(initialQuotesState);
  });

  it('sets loading on snapshot requested', () => {
    const state = quotesReducer(initialQuotesState, QuotesActions.quotesSnapshotRequested({ symbols: [quote.symbol] }));
    expect(state.loading).toBe(true);
    expect(state.pollingSymbols).toContain(quote.symbol);
  });

  it('starts polling on poll start', () => {
    const state = quotesReducer(initialQuotesState, QuotesActions.quotesPollStart({ symbols: [quote.symbol] }));
    expect(state.polling).toBe(true);
  });

  it('upserts quotes on tick', () => {
    const state = quotesReducer(initialQuotesState, QuotesActions.quotesTickArrived({ quotes: [quote] }));
    expect(state.entities[quote.symbol]).toEqual(quote);
    expect(state.loading).toBe(false);
    expect(state.lastUpdated).toEqual(quote.asOf);
  });

  it('stores error on failure', () => {
    const error = serializeError(new Error('failed'), 'TEST');
    const state = quotesReducer(initialQuotesState, QuotesActions.quotesTickFailed({ error }));
    expect(state.error).toEqual(error);
  });
});
