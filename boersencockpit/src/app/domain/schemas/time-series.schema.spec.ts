import timeSeriesFixture from '../../../assets/mock-data/quotes/AAPL.json';

import { asSymbol } from '../models/symbol.brand';
import { AppError } from '../../core/errors/app-error';
import { parseTimeSeries, isTimeSeries, isCandle } from './time-series.schema';

describe('timeSeriesSchema', () => {
  it('parses fixture successfully', () => {
    const parsed = parseTimeSeries(timeSeriesFixture);
    expect(parsed.symbol).toEqual(asSymbol('AAPL'));
    expect(parsed.candles.length).toBeGreaterThan(0);
  });

  it('rejects unsorted candles', () => {
    const invalid = {
      ...timeSeriesFixture,
      candles: [
        { ...timeSeriesFixture.candles[1] },
        { ...timeSeriesFixture.candles[0] }
      ]
    };
    expect(() => parseTimeSeries(invalid)).toThrow(AppError);
  });

  it('guards candle and time series', () => {
    const parsed = parseTimeSeries(timeSeriesFixture);
    expect(isTimeSeries(parsed)).toBe(true);
    expect(isCandle(parsed.candles[0])).toBe(true);
    expect(isCandle({})).toBe(false);
  });
});
