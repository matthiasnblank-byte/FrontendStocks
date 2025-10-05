import {
  NonNullableFormBuilder,
  Validators,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { z } from 'zod';

import { isoStringSchema } from '../../../domain/schemas/common';
import { symbolSchema } from '../../../domain/schemas/symbol.schema';

const PRICE_DECIMAL_FACTOR = 100;

const priceHasTwoDecimals = (value: number) =>
  Number.isFinite(value) && Math.abs(Math.round(value * PRICE_DECIMAL_FACTOR) - value * PRICE_DECIMAL_FACTOR) < 1e-6;

const notePreprocessor = (value: unknown) => (typeof value === 'string' ? value.trim() : value);

const hasTimezoneInformation = (value: string): boolean => /Z$|[+-]\d{2}:\d{2}$/.test(value);

const ensureIsoTimestamp = (value: string): string => {
  if (!value || hasTimezoneInformation(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
};

const toLocalDateTimeInput = (value: string): string => {
  if (!value) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const offset = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
};

const normalizeForValidation = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const record = value as Record<string, unknown>;
  const timestamp = record['timestamp'];
  if (typeof timestamp !== 'string') {
    return value;
  }
  const normalized = ensureIsoTimestamp(timestamp);
  if (normalized === timestamp) {
    return value;
  }
  return { ...record, timestamp: normalized } satisfies Record<string, unknown>;
};

export const tradeFormSchema = z.object({
  symbol: z
    .string({ required_error: 'Symbol darf nicht leer sein.' })
    .trim()
    .min(1, 'Symbol darf nicht leer sein.')
    .transform((value) => value.toUpperCase())
    .pipe(symbolSchema),
  side: z.enum(['BUY', 'SELL']),
  quantity: z
    .number({ invalid_type_error: 'Menge muss eine Zahl sein.' })
    .int('Menge muss eine ganze Zahl sein.')
    .min(1, 'Menge muss größer als 0 sein.'),
  price: z
    .number({ invalid_type_error: 'Preis muss eine Zahl sein.' })
    .min(0, 'Preis muss größer oder gleich 0 sein.')
    .refine(priceHasTwoDecimals, 'Preis darf maximal zwei Nachkommastellen haben.'),
  timestamp: isoStringSchema.refine(
    (value) => new Date(value).getTime() <= Date.now(),
    'Zeitstempel darf nicht in der Zukunft liegen.'
  ),
  note: z
    .preprocess(notePreprocessor, z.string().max(500, 'Notiz darf maximal 500 Zeichen enthalten.'))
    .optional()
    .transform((value) => (value ? value : undefined))
});

export type TradeFormSchema = typeof tradeFormSchema;
export type TradeFormRawValue = z.input<TradeFormSchema>;
export type TradeFormValue = z.output<TradeFormSchema>;

export interface TradeFormGroupControls {
  readonly symbol: FormControl<string>;
  readonly side: FormControl<'BUY' | 'SELL'>;
  readonly quantity: FormControl<number>;
  readonly price: FormControl<number>;
  readonly timestamp: FormControl<string>;
  readonly note: FormControl<string>;
}

export type TradeFormGroup = FormGroup<TradeFormGroupControls>;

const normalizeTradeFormRawValue = (value: TradeFormRawValue): TradeFormRawValue => ({
  ...value,
  timestamp: ensureIsoTimestamp(value.timestamp),
});

const createZodGroupValidator = (schema: TradeFormSchema): ValidatorFn => {
  return (control) => {
    const value = control instanceof FormGroup ? control.getRawValue() : control.value;
    const result = schema.safeParse(normalizeForValidation(value));
    if (result.success) {
      return null;
    }

    return {
      zod: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    } satisfies ValidationErrors;
  };
};

const defaultTradeFormValue = (): TradeFormRawValue => ({
  symbol: '',
  side: 'BUY',
  quantity: 1,
  price: 0,
  timestamp: new Date().toISOString(),
  note: '',
});

export const buildTradeFormGroup = (
  formBuilder: NonNullableFormBuilder,
  initialValue?: Partial<TradeFormRawValue>
): TradeFormGroup => {
  const rawValue = { ...defaultTradeFormValue(), ...initialValue } satisfies TradeFormRawValue;
  const noteValue = typeof rawValue.note === 'string' ? rawValue.note : '';
  const group = formBuilder.group<TradeFormGroupControls>({
    symbol: formBuilder.control<string>(rawValue.symbol, {
      validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9.-]+$/)]
    }),
    side: formBuilder.control<'BUY' | 'SELL'>(rawValue.side),
    quantity: formBuilder.control<number>(rawValue.quantity, {
      validators: [Validators.required, Validators.min(1)]
    }),
    price: formBuilder.control<number>(rawValue.price, {
      validators: [Validators.required, Validators.min(0)],
    }),
    timestamp: formBuilder.control<string>(toLocalDateTimeInput(rawValue.timestamp), {
      validators: [Validators.required],
    }),
    note: formBuilder.control<string>(noteValue),
  });

  group.addValidators(createZodGroupValidator(tradeFormSchema));

  return group;
};

export const parseTradeFormValue = (value: TradeFormRawValue): TradeFormValue =>
  tradeFormSchema.parse(normalizeTradeFormRawValue(value));

export const parseTradeFormGroup = (group: TradeFormGroup): TradeFormValue =>
  tradeFormSchema.parse(normalizeTradeFormRawValue(group.getRawValue()));
