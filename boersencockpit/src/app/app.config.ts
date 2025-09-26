import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { APP_TIMEZONE } from './core/tokens/timezone.token';
import { routes } from './app.routes';
import { provideAppStore } from './store/app.store.module';
import { PRICE_API_PROVIDER } from './core/api/index';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideHttpClient(),
    provideAppStore(),
    { provide: LOCALE_ID, useValue: 'de-DE' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
    { provide: APP_TIMEZONE, useValue: 'Europe/Berlin' },
    ...PRICE_API_PROVIDER
  ],
};
