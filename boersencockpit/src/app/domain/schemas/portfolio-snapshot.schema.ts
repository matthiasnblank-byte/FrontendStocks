import { z } from 'zod';

import { wrapZodError } from '../../core/errors/app-error';
import { PortfolioSnapshot } from '../models/portfolio-snapshot';
import { isoStringSchema } from './common';

export const portfolioSnapshotSchema = z.object({
  asOf: isoStringSchema,
  totalValue: z.number(),
  invested: z.number(),
  pnlAbs: z.number(),
  pnlPct: z.number()
});

export const parsePortfolioSnapshot = (input: unknown): PortfolioSnapshot => {
  try {
    return portfolioSnapshotSchema.parse(input);
  } catch (error) {
    throw wrapZodError(error, 'VAL/PORTFOLIO', 'PortfolioSnapshot');
  }
};
