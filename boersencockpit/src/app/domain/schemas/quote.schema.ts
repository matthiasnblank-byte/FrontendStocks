import { z } from 'zod';

import { wrapZodError } from '../../core/errors/app-error';
import { PriceQuote } from '../models/quote';
import { isoStringSchema } from './common';
import { symbolSchema } from './symbol.schema';

export const quoteSchema = z.object({
  symbol: symbolSchema,
  price: z.number().min(0, 'Price must be greater or equal to 0.'),
  changeAbs: z.number(),
  changePct: z.number(),
  asOf: isoStringSchema
});

const quotesArraySchema = z.array(quoteSchema);

export const parseQuote = (input: unknown): PriceQuote => {
  try {
    return quoteSchema.parse(input);
  } catch (error) {
    throw wrapZodError(error, 'VAL/QUOTE', 'Quote');
  }
};

export const parseQuotesArray = (input: unknown): readonly PriceQuote[] => {
  try {
    return quotesArraySchema.parse(input);
  } catch (error) {
    throw wrapZodError(error, 'VAL/QUOTE', 'Quotes');
  }
};

export const isQuote = (value: unknown): value is PriceQuote =>
  quoteSchema.safeParse(value).success;
