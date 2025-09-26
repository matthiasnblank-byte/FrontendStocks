import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { combineLatest, EMPTY, from, of } from 'rxjs';
import { catchError, concatMap, map, switchMap, take } from 'rxjs/operators';

import { PRICE_API } from '../../../core/api/price-api.token';
import { serializeError } from '../../../core/errors/serializable-error';
import * as TimeSeriesActions from './timeseries.actions';
import { selectHasTimeSeries, selectTimeSeriesLoading } from './timeseries.selectors';

@Injectable()
export class TimeSeriesEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly priceApi = inject(PRICE_API);

  readonly loadTimeSeries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeSeriesActions.timeSeriesRequested),
      concatMap(({ symbol, range }) =>
        combineLatest([
          this.store.select(selectHasTimeSeries(symbol, range)).pipe(take(1)),
          this.store.select(selectTimeSeriesLoading(symbol, range)).pipe(take(1)),
        ]).pipe(
          switchMap(([hasSeries, isLoading]) => {
            if (hasSeries || isLoading) {
              return EMPTY;
            }
            return from(this.priceApi.getTimeSeries(symbol, range)).pipe(
              map((series) => TimeSeriesActions.timeSeriesSucceeded({ symbol, range, series })),
              catchError((error) =>
                of(
                  TimeSeriesActions.timeSeriesFailed({
                    symbol,
                    range,
                    error: serializeError(error, 'API/TIMESERIES'),
                  })
                )
              )
            );
          })
        )
      )
    )
  );
}
