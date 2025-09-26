import { z } from 'zod';

import { asSymbol, Symbol } from '../models/symbol.brand';

export const symbolSchema = z
  .string()
  .min(1, 'Symbol must not be empty.')
  .refine((value) => /^[A-Z0-9.-]+$/.test(value), {
    message: 'Symbol must contain only A-Z, 0-9, dot or dash.'
  })
  .transform((value) => asSymbol(value));

export type SymbolInput = z.input<typeof symbolSchema>;
export type SymbolOutput = Symbol;
