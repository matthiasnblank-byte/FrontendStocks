/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['**/+(*.)+(spec).+(ts)'],
  transform: {
    '^.+\\.(ts|mjs|html|js)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|css)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],
  reporters: ['default'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/src/app/features/',
    '/src/app/layout/',
    '/src/app/testing/',
    '/src/app/core/errors/',
    '/src/app/core/services/theme.service.ts',
    '/src/app/core/services/cache.service.ts',
    '/src/app/domain/schemas/time-series.schema.ts',
    '/src/app/domain/utils/portfolio.ts',
    '/src/app/domain/utils/seeded-rng.ts',
    '/src/app/core/api/mock-price-api.service.ts',
    '/src/app/store/app.store.module.ts',
    '/src/types/',
    '/src/environments/'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
