import { asSymbol } from '../../../domain/models/symbol.brand';
import { Trade } from '../../../domain/models/trade';
import { serializeError } from '../../../core/errors/serializable-error';
import * as TradesActions from './trades.actions';
import { initialTradesState, tradesReducer } from './trades.reducer';

const baseTrade: Trade = {
  id: 'trade-1',
  symbol: asSymbol('AAPL'),
  side: 'BUY',
  quantity: 10,
  price: 100,
  timestamp: '2024-01-01T00:00:00.000Z',
};

describe('tradesReducer', () => {
  it('returns initial state for unknown action', () => {
    const state = tradesReducer(undefined, { type: 'Unknown' });
    expect(state).toEqual(initialTradesState);
  });

  it('sets loading on addTradeRequested', () => {
    const state = tradesReducer(initialTradesState, TradesActions.addTradeRequested({ tradeInput: baseTrade }));
    expect(state.loading).toBe(true);
  });

  it('adds trade on addTradeSucceeded', () => {
    const state = tradesReducer(initialTradesState, TradesActions.addTradeSucceeded({ trade: baseTrade }));
    expect(state.entities[baseTrade.id]).toEqual(baseTrade);
    expect(state.loading).toBe(false);
  });

  it('removes trade on removeTradeSucceeded', () => {
    const withTrade = tradesReducer(initialTradesState, TradesActions.addTradeSucceeded({ trade: baseTrade }));
    const state = tradesReducer(withTrade, TradesActions.removeTradeSucceeded({ id: baseTrade.id }));
    expect(state.entities[baseTrade.id]).toBeUndefined();
  });

  it('stores error on failure', () => {
    const error = serializeError(new Error('nope'), 'TEST/ERR');
    const state = tradesReducer(initialTradesState, TradesActions.addTradeFailed({ error }));
    expect(state.error).toEqual(error);
  });
});
