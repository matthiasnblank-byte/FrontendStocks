import { createAction, props } from '@ngrx/store';

import { ListSymbol } from '../../../core/api/price-api.port';
import { SerializableError } from '../../../core/errors/serializable-error';
import { Symbol } from '../../../domain/models/symbol.brand';

export const loadSymbolsRequested = createAction('[Stocks] Load Symbols Requested');

export const loadSymbolsSucceeded = createAction(
  '[Stocks] Load Symbols Succeeded',
  props<{ readonly symbols: readonly ListSymbol[] }>()
);

export const loadSymbolsFailed = createAction(
  '[Stocks] Load Symbols Failed',
  props<{ readonly error: SerializableError }>()
);

export const watchSymbolRequested = createAction(
  '[Stocks] Watch Symbol Requested',
  props<{ readonly symbol: Symbol }>()
);

export const unwatchSymbolRequested = createAction(
  '[Stocks] Unwatch Symbol Requested',
  props<{ readonly symbol: Symbol }>()
);
