import { createAction, props } from '@ngrx/store';

import { SerializableError } from '../../../core/errors/serializable-error';
import { PriceQuote } from '../../../domain/models/quote';
import { Symbol } from '../../../domain/models/symbol.brand';

export const quotesSnapshotRequested = createAction(
  '[Quotes] Snapshot Requested',
  props<{ readonly symbols: readonly Symbol[] }>()
);

export const quotesPollStart = createAction(
  '[Quotes] Poll Start',
  props<{ readonly symbols: readonly Symbol[] }>()
);

export const quotesPollStop = createAction('[Quotes] Poll Stop');

export const quotesTickArrived = createAction(
  '[Quotes] Tick Arrived',
  props<{ readonly quotes: readonly PriceQuote[] }>()
);

export const quotesTickFailed = createAction(
  '[Quotes] Tick Failed',
  props<{ readonly error: SerializableError }>()
);
