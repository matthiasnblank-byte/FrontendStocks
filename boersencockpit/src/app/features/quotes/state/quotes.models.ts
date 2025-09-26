import { EntityState } from '@ngrx/entity';

import { SerializableError } from '../../../core/errors/serializable-error';
import { PriceQuote } from '../../../domain/models/quote';
import { Symbol } from '../../../domain/models/symbol.brand';

export interface QuotesState extends EntityState<PriceQuote> {
  readonly loading: boolean;
  readonly polling: boolean;
  readonly pollingSymbols: readonly Symbol[];
  readonly error: SerializableError | null;
  readonly lastUpdated?: string;
}

export const QUOTES_FEATURE_KEY = 'quotes';
