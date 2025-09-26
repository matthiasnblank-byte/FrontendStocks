import { EntityState } from '@ngrx/entity';

import { ListSymbol } from '../../../core/api/price-api.port';
import { SerializableError } from '../../../core/errors/serializable-error';
import { Symbol } from '../../../domain/models/symbol.brand';

export interface StocksState extends EntityState<ListSymbol> {
  readonly loading: boolean;
  readonly loaded: boolean;
  readonly error: SerializableError | null;
  readonly watchlist: readonly Symbol[];
}

export const STOCKS_FEATURE_KEY = 'stocks';
