import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { PRICE_API } from '../../../core/api/price-api.token';
import { serializeError } from '../../../core/errors/serializable-error';
import * as StocksActions from './stocks.actions';

@Injectable()
export class StocksEffects {
  private readonly actions$ = inject(Actions);
  private readonly priceApi = inject(PRICE_API);

  readonly loadSymbolsRequested$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StocksActions.loadSymbolsRequested),
      switchMap(() =>
        from(this.priceApi.listSymbols()).pipe(
          map((symbols) => StocksActions.loadSymbolsSucceeded({ symbols })),
          catchError((error) =>
            of(
              StocksActions.loadSymbolsFailed({
                error: serializeError(error, 'API/STOCKS'),
              })
            )
          )
        )
      )
    )
  );
}
