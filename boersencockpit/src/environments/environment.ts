export const environment = {
  production: false,
  dataSource: 'mock' as const,
  alphaVantage: {
    apiKey: '',
    baseUrl: 'https://www.alphavantage.co/query',
    maxRequestsPerMinute: 5,
    minRequestSpacingMs: 15000,
    cacheTtlMs: 5 * 60 * 1000,
    enablePersistentCache: false
  }
} as const;
