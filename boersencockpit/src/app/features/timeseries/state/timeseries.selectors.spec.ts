import { asSymbol } from '../../../domain/models/symbol.brand';
import { TimeSeries } from '../../../domain/models/candle';
import {
  selectTimeSeries,
  selectHasTimeSeries,
  selectTimeSeriesLoading,
} from './timeseries.selectors';
import { initialTimeSeriesState } from './timeseries.reducer';

const symbol = asSymbol('AAPL');
const range = '1M' as const;
const series: TimeSeries = {
  symbol,
  candles: [{ t: '2024-01-01T00:00:00.000Z', o: 1, h: 1, l: 1, c: 1 }],
};

describe('time series selectors', () => {
  const state = {
    ...initialTimeSeriesState,
    series: { [symbol]: { [range]: series } },
    loading: { [symbol]: { [range]: true } },
  };
  const rootState = { timeseries: state } as { timeseries: typeof state };

  it('selectTimeSeries returns cached series', () => {
    const selector = selectTimeSeries(symbol, range);
    expect(selector(rootState)).toEqual(series);
  });

  it('selectHasTimeSeries returns true when present', () => {
    const selector = selectHasTimeSeries(symbol, range);
    expect(selector(rootState)).toBe(true);
  });

  it('selectTimeSeriesLoading reflects loading flag', () => {
    const selector = selectTimeSeriesLoading(symbol, range);
    expect(selector(rootState)).toBe(true);
  });
});
