import { InjectionToken } from '@angular/core';

import { AlphaVantageConfig } from './alphavantage-api.service';

export const ALPHAVANTAGE_CONFIG = new InjectionToken<AlphaVantageConfig>('ALPHAVANTAGE_CONFIG');
