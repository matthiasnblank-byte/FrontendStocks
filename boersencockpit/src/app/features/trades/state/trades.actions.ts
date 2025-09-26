import { createAction, props } from '@ngrx/store';

import { SerializableError } from '../../../core/errors/serializable-error';
import { Trade } from '../../../domain/models/trade';

export const addTradeRequested = createAction(
  '[Trades] Add Trade Requested',
  props<{ readonly tradeInput: unknown }>()
);

export const addTradeSucceeded = createAction(
  '[Trades] Add Trade Succeeded',
  props<{ readonly trade: Trade }>()
);

export const addTradeFailed = createAction(
  '[Trades] Add Trade Failed',
  props<{ readonly error: SerializableError }>()
);

export const removeTradeRequested = createAction(
  '[Trades] Remove Trade Requested',
  props<{ readonly id: string }>()
);

export const removeTradeSucceeded = createAction(
  '[Trades] Remove Trade Succeeded',
  props<{ readonly id: string }>()
);

export const removeTradeFailed = createAction(
  '[Trades] Remove Trade Failed',
  props<{ readonly id: string; readonly error: SerializableError }>()
);

export const loadTradesHydrateRequested = createAction('[Trades] Load Trades Hydrate Requested');

export const loadTradesHydrateSucceeded = createAction(
  '[Trades] Load Trades Hydrate Succeeded',
  props<{ readonly trades: readonly Trade[] }>()
);

export const loadTradesHydrateFailed = createAction(
  '[Trades] Load Trades Hydrate Failed',
  props<{ readonly error: SerializableError }>()
);
