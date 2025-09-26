import { asSymbol } from '../../../domain/models/symbol.brand';
import { TimeSeries } from '../../../domain/models/candle';
import { serializeError } from '../../../core/errors/serializable-error';
import * as TimeSeriesActions from './timeseries.actions';
import { initialTimeSeriesState, timeSeriesReducer } from './timeseries.reducer';

const symbol = asSymbol('AAPL');
const range = '1M' as const;
const series: TimeSeries = {
  symbol,
  candles: [
    { t: '2024-01-01T00:00:00.000Z', o: 1, h: 2, l: 0.5, c: 1.5 },
    { t: '2024-01-02T00:00:00.000Z', o: 1.5, h: 2, l: 1, c: 1.8 },
  ],
};

describe('timeSeriesReducer', () => {
  it('returns initial state for unknown action', () => {
    const state = timeSeriesReducer(undefined, { type: 'Unknown' });
    expect(state).toEqual(initialTimeSeriesState);
  });

  it('sets loading on request', () => {
    const state = timeSeriesReducer(
      initialTimeSeriesState,
      TimeSeriesActions.timeSeriesRequested({ symbol, range })
    );
    expect(state.loading[symbol]?.[range]).toBe(true);
  });

  it('stores series on success', () => {
    const state = timeSeriesReducer(
      initialTimeSeriesState,
      TimeSeriesActions.timeSeriesSucceeded({ symbol, range, series })
    );
    expect(state.series[symbol]?.[range]).toEqual(series);
  });

  it('stores error on failure', () => {
    const error = serializeError(new Error('fail'), 'TEST');
    const state = timeSeriesReducer(
      initialTimeSeriesState,
      TimeSeriesActions.timeSeriesFailed({ symbol, range, error })
    );
    expect(state.errors[symbol]?.[range]).toEqual(error);
  });

  it('evicts cached range', () => {
    const withSeries = timeSeriesReducer(
      initialTimeSeriesState,
      TimeSeriesActions.timeSeriesSucceeded({ symbol, range, series })
    );
    const state = timeSeriesReducer(withSeries, TimeSeriesActions.timeSeriesEvictRange({ symbol, range }));
    expect(state.series[symbol]).toBeUndefined();
  });
});
