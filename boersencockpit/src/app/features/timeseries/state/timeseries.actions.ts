import { createAction, props } from '@ngrx/store';

import { SerializableError } from '../../../core/errors/serializable-error';
import { RangeKey } from '../../../core/api/price-api.port';
import { TimeSeries } from '../../../domain/models/candle';
import { Symbol } from '../../../domain/models/symbol.brand';

export const timeSeriesRequested = createAction(
  '[TimeSeries] Load Requested',
  props<{ readonly symbol: Symbol; readonly range: RangeKey }>()
);

export const timeSeriesSucceeded = createAction(
  '[TimeSeries] Load Succeeded',
  props<{ readonly symbol: Symbol; readonly range: RangeKey; readonly series: TimeSeries }>()
);

export const timeSeriesFailed = createAction(
  '[TimeSeries] Load Failed',
  props<{ readonly symbol: Symbol; readonly range: RangeKey; readonly error: SerializableError }>()
);

export const timeSeriesEvictRange = createAction(
  '[TimeSeries] Evict Range',
  props<{ readonly symbol: Symbol; readonly range: RangeKey }>()
);
