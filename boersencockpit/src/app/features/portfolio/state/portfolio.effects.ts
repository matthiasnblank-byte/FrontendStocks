import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map } from 'rxjs/operators';

import * as PortfolioActions from './portfolio.actions';
import * as TradesActions from '../../trades/state/trades.actions';
import * as QuotesActions from '../../quotes/state/quotes.actions';
import * as TimeSeriesActions from '../../timeseries/state/timeseries.actions';

@Injectable()
export class PortfolioEffects {
  private readonly actions$ = inject(Actions);

  readonly recomputeRequested$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        TradesActions.addTradeSucceeded,
        TradesActions.removeTradeSucceeded,
        QuotesActions.quotesTickArrived,
        TimeSeriesActions.timeSeriesSucceeded,
        PortfolioActions.portfolioRangeChanged
      ),
      map(() => PortfolioActions.portfolioRecomputeRequested())
    )
  );
}
