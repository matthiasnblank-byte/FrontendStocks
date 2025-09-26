export const environment = {
  production: true,
  dataSource: 'alpha' as const,
  alphaVantage: {
    apiKey: '',
    baseUrl: 'https://www.alphavantage.co/query',
    maxRequestsPerMinute: 5,
    minRequestSpacingMs: 15000,
    cacheTtlMs: 5 * 60 * 1000,
    enablePersistentCache: true
  }
} as const;
