import { HttpClient } from '@angular/common/http';
import { Provider } from '@angular/core';

import { environment } from '../../../environments/environment';
import { PRICE_API } from './price-api.token';
import { PriceApiPort } from './price-api.port';
import { AlphaVantageApiService } from './alphavantage-api.service';
import { MockPriceApiService } from './mock-price-api.service';
import { CacheService } from '../services/cache.service';

export const PRICE_API_PROVIDER: Provider = {
  provide: PRICE_API,
  deps: [HttpClient, CacheService],
  useFactory: (http: HttpClient, cache: CacheService): PriceApiPort => {
    if (environment.dataSource === 'alpha') {
      return new AlphaVantageApiService(http, environment.alphaVantage, cache);
    }
    return new MockPriceApiService(http);
  }
};
