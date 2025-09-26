import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

const existingCrypto = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;

Object.defineProperty(globalThis, 'crypto', {
  value: {
    ...existingCrypto,
    randomUUID: (): string => 'test-id'
  },
  configurable: true
});

import { StockDetailPageComponent } from './stock-detail.page';
import { asSymbol } from '../../../domain/models/symbol.brand';
import { ListSymbol } from '../../../core/api/price-api.port';
import { PriceQuote } from '../../../domain/models/quote';
import { TradeFormValue } from '../forms/trade.schema';
import * as TimeSeriesActions from '../../timeseries/state/timeseries.actions';
import * as TradesActions from '../../trades/state/trades.actions';
import { selectStockBySymbol } from '../state/stocks.selectors';
import { selectQuoteBySymbol } from '../../quotes/state/quotes.selectors';
import { selectTradesBySymbol, selectPositions } from '../../trades/state/trades.selectors';
import { selectTimeSeries, selectTimeSeriesError, selectTimeSeriesLoading } from '../../timeseries/state/timeseries.selectors';
import { TimeSeries } from '../../../domain/models/candle';

describe('StockDetailPageComponent', () => {
  let component: StockDetailPageComponent;
  let store: MockStore;

  const symbol = asSymbol('SAP');
  const listSymbol: ListSymbol = { symbol, name: 'SAP SE', currency: 'EUR' };
  const quote: PriceQuote = {
    symbol,
    price: 120,
    changeAbs: 2,
    changePct: 1.8,
    asOf: '2024-01-01T00:00:00.000Z'
  };
  const series: TimeSeries = { symbol, candles: [] };

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectStockBySymbol(symbol), value: listSymbol },
            { selector: selectQuoteBySymbol(symbol), value: quote },
            { selector: selectTradesBySymbol(symbol), value: [] },
            { selector: selectPositions, value: [] },
            { selector: selectTimeSeries(symbol, '1M'), value: series },
            { selector: selectTimeSeriesLoading(symbol, '1M'), value: false },
            { selector: selectTimeSeriesError(symbol, '1M'), value: null }
          ]
        }),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ symbol: 'SAP' })) }
        },
        {
          provide: DestroyRef,
          useValue: { onDestroy: (): void => undefined }
        }
      ]
    });
    store = TestBed.inject(MockStore);
    jest.spyOn(store, 'dispatch');
    component = TestBed.runInInjectionContext(() => new StockDetailPageComponent());
  });

  it('dispatches time series request when range changes', async (): Promise<void> => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    dispatchSpy.mockClear();
    component['handleRangeChange']('1W');
    await Promise.resolve();
    expect(dispatchSpy).toHaveBeenCalledWith(TimeSeriesActions.timeSeriesRequested({ symbol, range: '1W' }));
  });

  it('dispatches addTradeRequested when submitting a trade', (): void => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    dispatchSpy.mockClear();
    component['handleTradeSubmit']({
      symbol,
      side: 'BUY',
      quantity: 1,
      price: 100,
      timestamp: '2024-01-01T00:00:00.000Z'
    } as TradeFormValue);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TradesActions.addTradeRequested.type,
        tradeInput: expect.objectContaining({ symbol })
      })
    );
  });
});
