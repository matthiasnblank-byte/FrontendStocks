import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject, firstValueFrom } from 'rxjs';

import { PRICE_API } from '../../../core/api/price-api.token';
import { PriceApiPort, ListSymbol } from '../../../core/api/price-api.port';
import { asSymbol } from '../../../domain/models/symbol.brand';
import * as StocksActions from './stocks.actions';
import { StocksEffects } from './stocks.effects';

describe('StocksEffects', () => {
  let actionsSubject: ReplaySubject<unknown>;
  let effects: StocksEffects;

  const priceApi: jest.Mocked<PriceApiPort> = {
    listSymbols: jest.fn(),
    getQuotes: jest.fn(),
    getTimeSeries: jest.fn(),
    streamQuotes: jest.fn(),
  };

  const sampleSymbols: ListSymbol[] = [
    { symbol: asSymbol('AAPL'), name: 'Apple', currency: 'USD' },
  ];

  beforeEach(() => {
    actionsSubject = new ReplaySubject<unknown>(1);
    TestBed.configureTestingModule({
      providers: [
        StocksEffects,
        provideMockActions(() => actionsSubject.asObservable()),
        { provide: PRICE_API, useValue: priceApi },
      ],
    });
    effects = TestBed.inject(StocksEffects);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('emits success when symbols load', async () => {
    priceApi.listSymbols.mockResolvedValue(sampleSymbols);
    actionsSubject.next(StocksActions.loadSymbolsRequested());
    const result = await firstValueFrom(effects.loadSymbolsRequested$);
    expect(result).toEqual(StocksActions.loadSymbolsSucceeded({ symbols: sampleSymbols }));
  });

  it('emits failure when symbols load fails', async () => {
    priceApi.listSymbols.mockRejectedValue(new Error('boom'));
    actionsSubject.next(StocksActions.loadSymbolsRequested());
    const result = await firstValueFrom(effects.loadSymbolsRequested$);
    expect(result.type).toBe(StocksActions.loadSymbolsFailed.type);
    expect((result as ReturnType<typeof StocksActions.loadSymbolsFailed>).error.code).toBe('API/STOCKS');
  });
});
