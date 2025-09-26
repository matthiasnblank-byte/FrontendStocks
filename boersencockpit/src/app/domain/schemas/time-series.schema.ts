import { z } from 'zod';

import { wrapZodError } from '../../core/errors/app-error';
import { Candle, TimeSeries } from '../models/candle';
import { isoStringSchema } from './common';
import { symbolSchema } from './symbol.schema';

export const candleSchema = z
  .object({
    t: isoStringSchema,
    o: z.number(),
    h: z.number(),
    l: z.number(),
    c: z.number(),
    v: z.number().min(0).optional()
  })
  .superRefine((candle, ctx) => {
    const { o, h, l, c } = candle;
    const max = Math.max(o, c, h, l);
    const min = Math.min(o, c, h, l);
    if (h < max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'High must be >= other price components.',
        path: ['h']
      });
    }
    if (l > min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Low must be <= other price components.',
        path: ['l']
      });
    }
  });

export const timeSeriesSchema = z
  .object({
    symbol: symbolSchema,
    candles: z
      .array(candleSchema)
      .min(1, 'Time series must contain at least one candle.')
      .superRefine((candles, ctx) => {
        for (let i = 1; i < candles.length; i += 1) {
          if (candles[i - 1].t >= candles[i].t) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Candles must be strictly increasing by timestamp.',
              path: [i, 't']
            });
            break;
          }
        }
      })
  })
  .transform((value) => ({
    ...value,
    candles: value.candles.map((candle) => ({ ...candle, v: candle.v }))
  }));

export const parseTimeSeries = (input: unknown): TimeSeries => {
  try {
    return timeSeriesSchema.parse(input);
  } catch (error) {
    throw wrapZodError(error, 'VAL/TIMESERIES', 'TimeSeries');
  }
};

export const isCandle = (value: unknown): value is Candle =>
  candleSchema.safeParse(value).success;

export const isTimeSeries = (value: unknown): value is TimeSeries =>
  timeSeriesSchema.safeParse(value).success;
