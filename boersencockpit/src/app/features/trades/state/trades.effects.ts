import { inject, Injectable } from '@angular/core';
import { Actions, OnInitEffects, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { filter, map, withLatestFrom } from 'rxjs/operators';

import { serializeError } from '../../../core/errors/serializable-error';
import { AppError } from '../../../core/errors/app-error';
import { parseTrade } from '../../../domain/schemas/trade.schema';
import { Trade } from '../../../domain/models/trade';
import { asSymbol } from '../../../domain/models/symbol.brand';
import * as TradesActions from './trades.actions';
import { selectTradeCount, selectTradesEntities } from './trades.selectors';

export const DEMO_TRADES: readonly Trade[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    symbol: asSymbol('SAP'),
    side: 'BUY',
    quantity: 25,
    price: 119.75,
    timestamp: '2024-01-15T09:15:00.000Z',
    note: 'Erster Aufbau',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    symbol: asSymbol('DTE'),
    side: 'BUY',
    quantity: 40,
    price: 21.4,
    timestamp: '2024-02-05T10:30:00.000Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    symbol: asSymbol('SAP'),
    side: 'SELL',
    quantity: 10,
    price: 123.5,
    timestamp: '2024-03-12T13:05:00.000Z',
    note: 'Teilgewinn realisiert',
  },
] as const;

@Injectable()
export class TradesEffects implements OnInitEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  ngrxOnInitEffects(): Action {
    return TradesActions.loadTradesHydrateRequested();
  }

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
      withLatestFrom(this.store.select(selectTradeCount)),
      filter(([, tradeCount]) => tradeCount === 0),
      map(() => TradesActions.loadTradesHydrateSucceeded({ trades: DEMO_TRADES }))
    )
  );

}
