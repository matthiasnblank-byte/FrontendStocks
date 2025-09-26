import { createFeature } from '@ngrx/store';
import { createSelector } from '@ngrx/store';

import { TIMESERIES_FEATURE_KEY, TimeSeriesState } from './timeseries.models';
import { timeSeriesReducer } from './timeseries.reducer';
import { RangeKey } from '../../../core/api/price-api.port';
import { Symbol } from '../../../domain/models/symbol.brand';

export const timeSeriesFeature = createFeature({
  name: TIMESERIES_FEATURE_KEY,
  reducer: timeSeriesReducer,
});

export const {
  name: timeSeriesFeatureKey,
  reducer: timeSeriesFeatureReducer,
  selectTimeseriesState,
} = timeSeriesFeature;

export const selectTimeSeriesState = selectTimeseriesState;

export const selectSeriesMap = createSelector(
  selectTimeSeriesState,
  (state): TimeSeriesState['series'] => state.series
);

export const selectLoadingMap = createSelector(
  selectTimeSeriesState,
  (state): TimeSeriesState['loading'] => state.loading
);

export const selectErrorsMap = createSelector(
  selectTimeSeriesState,
  (state): TimeSeriesState['errors'] => state.errors
);

export const selectTimeSeries = (symbol: Symbol, range: RangeKey) =>
  createSelector(selectSeriesMap, (seriesMap) => seriesMap[symbol]?.[range] ?? null);

export const selectHasTimeSeries = (symbol: Symbol, range: RangeKey) =>
  createSelector(selectSeriesMap, (seriesMap) => Boolean(seriesMap[symbol]?.[range]));

export const selectTimeSeriesLoading = (symbol: Symbol, range: RangeKey) =>
  createSelector(selectLoadingMap, (loadingMap) => Boolean(loadingMap[symbol]?.[range]));

export const selectTimeSeriesError = (symbol: Symbol, range: RangeKey) =>
  createSelector(selectErrorsMap, (errorsMap) => errorsMap[symbol]?.[range] ?? null);
