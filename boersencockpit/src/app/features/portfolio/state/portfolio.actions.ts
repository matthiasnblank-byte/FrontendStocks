import { createAction, props } from '@ngrx/store';

import { RangeKey } from '../../../core/api/price-api.port';

export const portfolioRangeChanged = createAction(
  '[Portfolio] Range Changed',
  props<{ readonly range: RangeKey }>()
);

export const portfolioRecomputeRequested = createAction('[Portfolio] Recompute Requested');
