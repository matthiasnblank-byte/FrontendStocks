import { createReducer, on } from '@ngrx/store';

import * as TimeSeriesActions from './timeseries.actions';
import { TimeSeriesState } from './timeseries.models';

export const initialTimeSeriesState: TimeSeriesState = {
  series: {},
  loading: {},
  errors: {},
};

export const timeSeriesReducer = createReducer(
  initialTimeSeriesState,
  on(TimeSeriesActions.timeSeriesRequested, (state, { symbol, range }) => ({
    series: state.series,
    loading: setNestedFlag(state.loading, symbol, range, true),
    errors: setNestedError(state.errors, symbol, range, null),
  })),
  on(TimeSeriesActions.timeSeriesSucceeded, (state, { symbol, range, series }) => ({
    series: setNestedSeries(state.series, symbol, range, series),
    loading: setNestedFlag(state.loading, symbol, range, false),
    errors: setNestedError(state.errors, symbol, range, null),
  })),
  on(TimeSeriesActions.timeSeriesFailed, (state, { symbol, range, error }) => ({
    series: state.series,
    loading: setNestedFlag(state.loading, symbol, range, false),
    errors: setNestedError(state.errors, symbol, range, error),
  })),
  on(TimeSeriesActions.timeSeriesEvictRange, (state, { symbol, range }) => ({
    series: removeNestedEntry(state.series, symbol, range),
    loading: removeNestedEntry(state.loading, symbol, range),
    errors: removeNestedEntry(state.errors, symbol, range),
  }))
);

const setNestedFlag = <T extends Record<string, Partial<Record<string, boolean>>>>(
  state: T,
  symbol: string,
  range: string,
  value: boolean
): T => ({
  ...state,
  [symbol]: { ...(state[symbol] ?? {}), [range]: value },
});

const setNestedError = <T extends Record<string, Partial<Record<string, unknown>>>>(
  state: T,
  symbol: string,
  range: string,
  value: unknown
): T => ({
  ...state,
  [symbol]: { ...(state[symbol] ?? {}), [range]: value },
});

const setNestedSeries = <T>(
  state: Readonly<Record<string, Partial<Record<string, T>>>>,
  symbol: string,
  range: string,
  value: T
): Readonly<Record<string, Partial<Record<string, T>>>> => ({
  ...state,
  [symbol]: { ...(state[symbol] ?? {}), [range]: value },
});

const removeNestedEntry = <T extends Record<string, Partial<Record<string, unknown>>>>(
  state: T,
  symbol: string,
  range: string
): T => {
  const nested = state[symbol];
  if (!nested) {
    return state;
  }
  const { [range]: _, ...rest } = nested;
  if (Object.keys(rest).length === 0) {
    const { [symbol]: __, ...remaining } = state;
    return remaining as T;
  }
  return {
    ...state,
    [symbol]: rest,
  } as T;
};
