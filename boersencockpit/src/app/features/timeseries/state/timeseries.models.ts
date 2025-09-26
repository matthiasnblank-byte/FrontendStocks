import { RangeKey } from '../../../core/api/price-api.port';
import { SerializableError } from '../../../core/errors/serializable-error';
import { TimeSeries } from '../../../domain/models/candle';
import { Symbol } from '../../../domain/models/symbol.brand';

export type RangeStateMap<T> = Readonly<Record<RangeKey, T>>;

export interface TimeSeriesState {
  readonly series: Readonly<Record<Symbol, Partial<Record<RangeKey, TimeSeries>>>>;
  readonly loading: Readonly<Record<Symbol, Partial<Record<RangeKey, boolean>>>>;
  readonly errors: Readonly<Record<Symbol, Partial<Record<RangeKey, SerializableError | null>>>>;
}

export const TIMESERIES_FEATURE_KEY = 'timeseries';
