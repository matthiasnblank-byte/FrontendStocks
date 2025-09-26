import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable } from 'rxjs';

import { runMarbles } from '../../../testing/marble-helpers';
import { asSymbol } from '../../../domain/models/symbol.brand';
import * as TradesActions from './trades.actions';
import { TradesEffects } from './trades.effects';
import { tradesAdapter, initialTradesState } from './trades.reducer';
import { TradesState } from './trades.models';

const baseTrade = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: asSymbol('AAPL'),
  side: 'BUY' as const,
  quantity: 5,
  price: 100,
  timestamp: '2024-01-01T00:00:00.000Z',
};

describe('TradesEffects', () => {
  let actions$: Observable<unknown>;
  let effects: TradesEffects;
  let store: MockStore<{ trades: TradesState }>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TradesEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { trades: initialTradesState } }),
      ],
    });
    effects = TestBed.inject(TradesEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits addTradeSucceeded when trade is valid', () => {
    runMarbles(({ hot, expectObservable }) => {
      actions$ = hot('-a', { a: TradesActions.addTradeRequested({ tradeInput: baseTrade }) });
      const expected = '-b';
      const expectedValues = {
        b: TradesActions.addTradeSucceeded({ trade: baseTrade }),
      };
      expectObservable(effects.addTradeRequested$).toBe(expected, expectedValues);
    });
  });

  it('emits addTradeFailed when trade is invalid', () => {
    const invalidTrade = { ...baseTrade, quantity: 0 };
    runMarbles(({ hot, expectObservable }) => {
      actions$ = hot('-a', { a: TradesActions.addTradeRequested({ tradeInput: invalidTrade }) });
      const expected = '-b';
      expectObservable(effects.addTradeRequested$).toBe(expected, {
        b: expect.objectContaining({
          type: TradesActions.addTradeFailed.type,
          error: expect.objectContaining({ code: 'VAL/TRADE' }),
        }) as unknown,
      });
    });
  });

  it('emits removeTradeSucceeded when trade exists', () => {
    const stateWithTrade = tradesAdapter.addOne(baseTrade, initialTradesState);
    store.setState({ trades: stateWithTrade });

    runMarbles(({ hot, expectObservable }) => {
      actions$ = hot('-a', { a: TradesActions.removeTradeRequested({ id: baseTrade.id }) });
      const expected = '-b';
      const expectedValues = {
        b: TradesActions.removeTradeSucceeded({ id: baseTrade.id }),
      };
      expectObservable(effects.removeTradeRequested$).toBe(expected, expectedValues);
    });
  });

  it('emits removeTradeFailed when trade does not exist', () => {
    store.setState({ trades: initialTradesState });

    runMarbles(({ hot, expectObservable }) => {
      actions$ = hot('-a', { a: TradesActions.removeTradeRequested({ id: 'missing' }) });
      const expected = '-b';
      expectObservable(effects.removeTradeRequested$).toBe(expected, {
        b: expect.objectContaining({
          type: TradesActions.removeTradeFailed.type,
          error: expect.objectContaining({ code: 'VAL/TRADE_NOT_FOUND' }),
        }) as unknown,
      });
    });
  });

  it('hydrates with empty array on load request', () => {
    runMarbles(({ hot, expectObservable }) => {
      actions$ = hot('-a', { a: TradesActions.loadTradesHydrateRequested() });
      const expected = '-b';
      const expectedValues = {
        b: TradesActions.loadTradesHydrateSucceeded({ trades: [] }),
      };
      expectObservable(effects.loadTradesHydrateRequested$).toBe(expected, expectedValues);
    });
  });
});
