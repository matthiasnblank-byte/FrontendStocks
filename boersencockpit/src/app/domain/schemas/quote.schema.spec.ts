import { asSymbol } from '../models/symbol.brand';
import { parseQuote, parseQuotesArray, isQuote } from './quote.schema';
import { AppError } from '../../core/errors/app-error';

describe('quoteSchema', () => {
  const baseQuote = {
    symbol: 'MSFT',
    price: 420.55,
    changeAbs: 1.2,
    changePct: 0.25,
    asOf: '2024-02-01T00:00:00.000Z'
  };

  it('parses valid quote', () => {
    const quote = parseQuote(baseQuote);
    expect(quote.symbol).toEqual(asSymbol('MSFT'));
    expect(quote.price).toBeCloseTo(420.55);
  });

  it('rejects negative price', () => {
    expect(() => parseQuote({ ...baseQuote, price: -1 })).toThrow(AppError);
  });

  it('parses array of quotes', () => {
    const quotes = parseQuotesArray([baseQuote, { ...baseQuote, symbol: 'AAPL' }]);
    expect(quotes).toHaveLength(2);
  });

  it('guards quote', () => {
    expect(isQuote(parseQuote(baseQuote))).toBe(true);
    expect(isQuote(null)).toBe(false);
  });
});
