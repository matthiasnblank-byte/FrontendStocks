import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  dataSource: 'alpha',
  alphaVantage: {
    apiKey: '',
    baseUrl: 'https://www.alphavantage.co/query',
    maxRequestsPerMinute: 5,
    minRequestSpacingMs: 15000,
    cacheTtlMs: 5 * 60 * 1000,
    enablePersistentCache: true,
  },
};
