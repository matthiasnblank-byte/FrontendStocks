export type DataSource = 'mock' | 'alpha';

export interface AlphaVantageEnvironmentConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly maxRequestsPerMinute: number;
  readonly minRequestSpacingMs: number;
  readonly cacheTtlMs: number;
  readonly enablePersistentCache: boolean;
}

export interface Environment {
  readonly production: boolean;
  readonly dataSource: DataSource;
  readonly alphaVantage: AlphaVantageEnvironmentConfig;
}
