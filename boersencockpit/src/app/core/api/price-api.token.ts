import { InjectionToken } from '@angular/core';

import { PriceApiPort } from './price-api.port';

export const PRICE_API = new InjectionToken<PriceApiPort>('PRICE_API');
