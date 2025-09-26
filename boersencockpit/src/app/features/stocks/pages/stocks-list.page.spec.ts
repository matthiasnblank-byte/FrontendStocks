import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { firstValueFrom } from 'rxjs';
import { skip } from 'rxjs/operators';

import { StocksListPageComponent } from './stocks-list.page';
import { ListSymbol } from '../../../core/api/price-api.port';
import { asSymbol } from '../../../domain/models/symbol.brand';
import { PriceQuote } from '../../../domain/models/quote';
import { selectAllStocks } from '../state/stocks.selectors';
import { selectQuotesEntities } from '../../quotes/state/quotes.selectors';

const symbols: ListSymbol[] = [
  { symbol: asSymbol('SAP'), name: 'SAP SE', currency: 'EUR' },
  { symbol: asSymbol('MSFT'), name: 'Microsoft', currency: 'USD' },
];

const quotes: Record<string, PriceQuote> = {
  [symbols[0].symbol]: {
    symbol: symbols[0].symbol,
    price: 120,
    changeAbs: 2,
    changePct: 1.8,
    asOf: '2024-01-01T00:00:00.000Z',
  },
  [symbols[1].symbol]: {
    symbol: symbols[1].symbol,
    price: 300,
    changeAbs: -5,
    changePct: -1.1,
    asOf: '2024-01-01T00:00:00.000Z',
  },
};

describe('StocksListPageComponent', () => {
  let component: StocksListPageComponent;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectAllStocks, value: symbols },
            { selector: selectQuotesEntities, value: quotes },
          ],
        }),
        {
          provide: DestroyRef,
          useValue: {
            onDestroy: () => undefined,
          },
        },
      ],
    });
    store = TestBed.inject(MockStore);
    jest.spyOn(store, 'dispatch');
    component = TestBed.runInInjectionContext(() => new StocksListPageComponent());
  });

  it('provides filtered stocks with matching quotes', async () => {
    const result = await firstValueFrom(component.filteredStocks$);
    expect(result).toHaveLength(2);
    expect(result[0].quote?.price).toBe(120);
  });

  it('filters stocks by search term', async () => {
    const resultPromise = firstValueFrom(component.filteredStocks$.pipe(skip(1)));
    component.searchControl.setValue('sap');
    const result = await resultPromise;
    expect(result).toHaveLength(1);
    expect(result[0].listSymbol.symbol).toEqual(symbols[0].symbol);
  });
});
