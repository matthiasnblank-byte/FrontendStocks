import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { environment } from '../../environments/environment';
import { StocksEffects } from '../features/stocks/state/stocks.effects';
import { TradesEffects } from '../features/trades/state/trades.effects';
import { QuotesEffects } from '../features/quotes/state/quotes.effects';
import { TimeSeriesEffects } from '../features/timeseries/state/timeseries.effects';
import { PortfolioEffects } from '../features/portfolio/state/portfolio.effects';
import { appReducers } from './app.state';

export const provideAppStore = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideStore(appReducers, {
      runtimeChecks: {
        strictStateImmutability: true,
        strictActionImmutability: true,
        strictStateSerializability: true,
        strictActionSerializability: true,
      },
    }),
    provideEffects([StocksEffects, TradesEffects, QuotesEffects, TimeSeriesEffects, PortfolioEffects]),
    provideRouterStore(),
    ...(environment.production
      ? []
      : [provideStoreDevtools({ maxAge: 25, logOnly: environment.production })]),
  ]);
