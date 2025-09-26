import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import { EMPTY, from, merge, of } from 'rxjs';
import { catchError, filter, map, switchMap, takeUntil, withLatestFrom } from 'rxjs/operators';
import { retry } from 'rxjs';

import { PRICE_API } from '../../../core/api/price-api.token';
import { serializeError } from '../../../core/errors/serializable-error';
import * as QuotesActions from './quotes.actions';
import * as StocksActions from '../../stocks/state/stocks.actions';
import { selectAllStocks, selectWatchedSymbols } from '../../stocks/state/stocks.selectors';
import { selectPollingSymbols } from './quotes.selectors';
import { Symbol } from '../../../domain/models/symbol.brand';

@Injectable()
export class QuotesEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly priceApi = inject(PRICE_API);

  readonly loadSnapshotOnSymbols$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StocksActions.loadSymbolsSucceeded),
      map(({ symbols }) => symbols.map((item) => item.symbol)),
      filter((symbols) => symbols.length > 0),
      map((symbols) => QuotesActions.quotesSnapshotRequested({ symbols }))
    )
  );

  readonly loadSnapshotOnNavigation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(routerNavigatedAction),
      map((action) => action.payload.event.urlAfterRedirects),
      filter((url) => isMarketAwareRoute(url)),
      withLatestFrom(
        this.store.select(selectWatchedSymbols),
        this.store.select(selectAllStocks)
      ),
      map(([, watchlist, stocks]) => (watchlist.length > 0 ? watchlist : stocks.map((stock) => stock.symbol))),
      map((symbols) => ensureUniqueSymbols(symbols)),
      filter((symbols) => symbols.length > 0),
      map((symbols) => QuotesActions.quotesSnapshotRequested({ symbols }))
    )
  );

  readonly snapshotRequested$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuotesActions.quotesSnapshotRequested),
      map(({ symbols }) => ensureUniqueSymbols(symbols)),
      filter((symbols) => symbols.length > 0),
      switchMap((symbols) =>
        from(this.priceApi.getQuotes(symbols)).pipe(
          map((quotes) => QuotesActions.quotesTickArrived({ quotes })),
          catchError((error) =>
            of(
              QuotesActions.quotesTickFailed({
                error: serializeError(error, 'API/QUOTES_SNAPSHOT'),
              })
            )
          )
        )
      )
    )
  );

  readonly pollQuotes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuotesActions.quotesPollStart),
      map(({ symbols }) => ensureUniqueSymbols(symbols)),
      switchMap((symbols) => {
        if (symbols.length === 0) {
          return EMPTY;
        }
        const stop$ = merge(
          this.actions$.pipe(ofType(QuotesActions.quotesPollStop)),
          this.actions$.pipe(
            ofType(routerNavigatedAction),
            filter((action) => !isMarketAwareRoute(action.payload.event.urlAfterRedirects))
          )
        );
        return this.priceApi.streamQuotes(symbols).pipe(
          retry({ count: 3, delay: 1000 }),
          map((quote) => QuotesActions.quotesTickArrived({ quotes: [quote] })),
          takeUntil(stop$),
          catchError((error) =>
            of(
              QuotesActions.quotesTickFailed({
                error: serializeError(error, 'API/QUOTES_STREAM'),
              })
            )
          )
        );
      })
    )
  );

  readonly restartPollingOnWatchlistChange$ = createEffect(() =>
    this.store.select(selectWatchedSymbols).pipe(
      withLatestFrom(this.store.select(selectPollingSymbols)),
      map(([watchlist, pollingSymbols]) => ({ watchlist: ensureUniqueSymbols(watchlist), pollingSymbols })),
      filter(({ watchlist, pollingSymbols }) =>
        watchlist.length > 0 &&
        (pollingSymbols.length !== watchlist.length || !pollingSymbols.every((symbol) => watchlist.includes(symbol)))
      ),
      map(({ watchlist }) => QuotesActions.quotesPollStart({ symbols: watchlist }))
    )
  );

  readonly stopPollingWhenEmptyWatchlist$ = createEffect(() =>
    this.store.select(selectWatchedSymbols).pipe(
      withLatestFrom(this.store.select(selectPollingSymbols)),
      map(([watchlist, pollingSymbols]) => ({
        watchlist: ensureUniqueSymbols(watchlist),
        pollingSymbols,
      })),
      filter(({ watchlist, pollingSymbols }) => watchlist.length === 0 && pollingSymbols.length > 0),
      map(() => QuotesActions.quotesPollStop())
    )
  );
}

const isMarketAwareRoute = (url: string): boolean => /^(\/portfolio|\/stocks)/.test(url);

const ensureUniqueSymbols = (symbols: readonly Symbol[]): readonly Symbol[] =>
  Array.from(new Set(symbols)).sort((a, b) => a.localeCompare(b)) as readonly Symbol[];
