import { EntityState } from '@ngrx/entity';

import { SerializableError } from '../../../core/errors/serializable-error';
import { Trade } from '../../../domain/models/trade';

export interface TradesState extends EntityState<Trade> {
  readonly loading: boolean;
  readonly error: SerializableError | null;
}

export const TRADES_FEATURE_KEY = 'trades';
