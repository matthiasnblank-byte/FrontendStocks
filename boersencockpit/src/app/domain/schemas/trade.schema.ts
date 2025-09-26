import { z } from 'zod';

import { wrapZodError } from '../../core/errors/app-error';
import { Trade } from '../models/trade';
import { isoStringSchema } from './common';
import { symbolSchema } from './symbol.schema';

export const tradeSchema = z.object({
  id: z.string().uuid('Trade id must be a UUID v4.'),
  symbol: symbolSchema,
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive('Quantity must be greater than 0.'),
  price: z.number().min(0, 'Price must be greater or equal to 0.'),
  timestamp: isoStringSchema,
  note: z.string().min(1).optional()
});

const tradesArraySchema = z.array(tradeSchema);

export const parseTrade = (input: unknown): Trade => {
  try {
    return tradeSchema.parse(input);
  } catch (error) {
    throw wrapZodError(error, 'VAL/TRADE', 'Trade');
  }
};

export const parseTradesArray = (input: unknown): readonly Trade[] => {
  try {
    return tradesArraySchema.parse(input);
  } catch (error) {
    throw wrapZodError(error, 'VAL/TRADE', 'Trades');
  }
};

export const isTrade = (value: unknown): value is Trade =>
  tradeSchema.safeParse(value).success;
