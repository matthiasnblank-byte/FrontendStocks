import { FormBuilder } from '@angular/forms';

import { asSymbol } from '../../../domain/models/symbol.brand';
import { buildTradeFormGroup, parseTradeFormGroup, tradeFormSchema } from './trade.schema';

const NOW = new Date('2024-01-10T10:00:00.000Z').getTime();

describe('tradeFormSchema', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const baseInput = {
    symbol: 'sap',
    side: 'BUY' as const,
    quantity: 5,
    price: 120.5,
    timestamp: '2024-01-10T09:00:00.000Z',
    note: '  Erste Position  '
  };

  it('parses valid form input and normalises values', () => {
    const result = tradeFormSchema.parse(baseInput);

    expect(result.symbol).toEqual(asSymbol('SAP'));
    expect(result.note).toBe('Erste Position');
  });

  it('rejects zero quantity', () => {
    expect(() => tradeFormSchema.parse({ ...baseInput, quantity: 0 })).toThrow();
  });

  it('rejects negative price', () => {
    expect(() => tradeFormSchema.parse({ ...baseInput, price: -1 })).toThrow();
  });

  it('rejects price with more than two decimals', () => {
    expect(() => tradeFormSchema.parse({ ...baseInput, price: 1.239 })).toThrow();
  });

  it('rejects future timestamps', () => {
    const futureTimestamp = new Date(NOW + 60_000).toISOString();
    expect(() => tradeFormSchema.parse({ ...baseInput, timestamp: futureTimestamp })).toThrow();
  });
});

describe('buildTradeFormGroup', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a group with defaults and attaches zod validator', () => {
    const formBuilder = new FormBuilder().nonNullable;
    const group = buildTradeFormGroup(formBuilder);

    expect(group.controls.quantity.value).toBe(1);

    group.patchValue({ symbol: 'SAP', price: -1 });
    group.updateValueAndValidity();

    expect(group.invalid).toBe(true);
    expect(group.errors?.['zod']?.[0].message).toBe('Preis muss größer oder gleich 0 sein.');
  });

  it('accepts timestamp input without timezone information', () => {
    const formBuilder = new FormBuilder().nonNullable;
    const group = buildTradeFormGroup(formBuilder);

    group.patchValue({
      symbol: 'SAP',
      price: 120.5,
      timestamp: '2024-01-10T10:00',
    });

    group.updateValueAndValidity();

    expect(group.valid).toBe(true);
    const parsed = parseTradeFormGroup(group);
    expect(parsed.timestamp.endsWith('Z')).toBe(true);
  });

  it('parses group value via parseTradeFormGroup', () => {
    const formBuilder = new FormBuilder().nonNullable;
    const group = buildTradeFormGroup(formBuilder, {
      symbol: 'sap',
      side: 'SELL',
      quantity: 3,
      price: 99.5,
      timestamp: '2024-01-10T08:30:00.000Z',
      note: '  Teilverkauf '
    });

    const parsed = parseTradeFormGroup(group);

    expect(parsed.side).toBe('SELL');
    expect(parsed.symbol).toEqual(asSymbol('SAP'));
    expect(parsed.note).toBe('Teilverkauf');
  });
});
