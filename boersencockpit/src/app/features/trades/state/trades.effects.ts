import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, withLatestFrom } from 'rxjs/operators';

import { serializeError } from '../../../core/errors/serializable-error';
import { AppError } from '../../../core/errors/app-error';
import { parseTrade } from '../../../domain/schemas/trade.schema';
import * as TradesActions from './trades.actions';
import { selectTradesEntities } from './trades.selectors';

@Injectable()
export class TradesEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  readonly addTradeRequested$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TradesActions.addTradeRequested),
      map(({ tradeInput }) => {
        try {
          const trade = parseTrade(tradeInput);
          return TradesActions.addTradeSucceeded({ trade });
        } catch (error) {
          return TradesActions.addTradeFailed({
            error: serializeError(error, 'VAL/TRADE'),
          });
        }
      })
    )
  );

  readonly removeTradeRequested$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TradesActions.removeTradeRequested),
      withLatestFrom(this.store.select(selectTradesEntities)),
      map(([{ id }, entities]) => {
        if (entities[id]) {
          return TradesActions.removeTradeSucceeded({ id });
        }
        return TradesActions.removeTradeFailed({
          id,
          error: serializeError(new AppError(`Trade ${id} not found.`, 'VAL/TRADE_NOT_FOUND')),
        });
      })
    )
  );

  readonly loadTradesHydrateRequested$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TradesActions.loadTradesHydrateRequested),
      map(() => TradesActions.loadTradesHydrateSucceeded({ trades: [] }))
    )
  );
}
