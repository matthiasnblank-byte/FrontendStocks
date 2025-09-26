import { z } from 'zod';

export const isoStringSchema = z
  .string()
  .refine((value) => /Z$/.test(value), {
    message: 'Timestamp must end with Z to indicate UTC.'
  })
  .refine((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString() === value;
  }, 'Invalid ISO 8601 timestamp.');
