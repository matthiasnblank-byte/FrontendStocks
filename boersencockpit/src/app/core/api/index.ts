import { HttpClient } from '@angular/common/http';
import { Provider } from '@angular/core';

import { environment } from '../../../environments/environment';
import { PRICE_API } from './price-api.token';
import { PriceApiPort } from './price-api.port';
import { AlphaVantageApiService } from './alphavantage-api.service';
import { MockPriceApiService } from './mock-price-api.service';
import { CacheService } from '../services/cache.service';
import { ALPHAVANTAGE_CONFIG } from './alphavantage-config.token';
import { AlphaVantageConfig } from './alphavantage-api.service';

export const PRICE_API_PROVIDER: Provider[] = [
  { provide: ALPHAVANTAGE_CONFIG, useValue: environment.alphaVantage satisfies AlphaVantageConfig },
  {
    provide: PRICE_API,
    deps: [HttpClient, ALPHAVANTAGE_CONFIG, CacheService],
    useFactory: (http: HttpClient, config: AlphaVantageConfig, cache: CacheService): PriceApiPort => {
      if (environment.dataSource === 'alpha') {
        return new AlphaVantageApiService(http, config, cache);
      }
      return new MockPriceApiService(http);
    }
  }
];
