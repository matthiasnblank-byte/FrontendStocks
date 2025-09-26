import { asSymbol } from '../../../domain/models/symbol.brand';
import { ListSymbol } from '../../../core/api/price-api.port';
import { serializeError } from '../../../core/errors/serializable-error';
import * as StocksActions from './stocks.actions';
import { initialStocksState, stocksReducer } from './stocks.reducer';

const sampleSymbols: ListSymbol[] = [
  { symbol: asSymbol('AAPL'), name: 'Apple', currency: 'USD' },
  { symbol: asSymbol('SAP'), name: 'SAP', currency: 'EUR' },
];

describe('stocksReducer', () => {
  it('should return the initial state for unknown action', () => {
    const state = stocksReducer(undefined, { type: 'Unknown' });
    expect(state).toEqual(initialStocksState);
  });

  it('should set loading on loadSymbolsRequested', () => {
    const state = stocksReducer(initialStocksState, StocksActions.loadSymbolsRequested());
    expect(state.loading).toBe(true);
  });

  it('should populate symbols on loadSymbolsSucceeded', () => {
    const state = stocksReducer(initialStocksState, StocksActions.loadSymbolsSucceeded({ symbols: sampleSymbols }));
    expect(state.loading).toBe(false);
    expect(state.entities[sampleSymbols[0].symbol]).toEqual(sampleSymbols[0]);
    expect(state.watchlist).toEqual(sampleSymbols.map((item) => item.symbol));
  });

  it('should store error on loadSymbolsFailed', () => {
    const error = serializeError(new Error('fail'), 'TEST/ERROR');
    const state = stocksReducer(initialStocksState, StocksActions.loadSymbolsFailed({ error }));
    expect(state.error).toEqual(error);
    expect(state.loading).toBe(false);
  });

  it('should add and remove symbols from watchlist', () => {
    const loadedState = stocksReducer(initialStocksState, StocksActions.loadSymbolsSucceeded({ symbols: sampleSymbols }));
    const afterUnwatch = stocksReducer(loadedState, StocksActions.unwatchSymbolRequested({ symbol: sampleSymbols[0].symbol }));
    expect(afterUnwatch.watchlist).not.toContain(sampleSymbols[0].symbol);
    const afterWatch = stocksReducer(afterUnwatch, StocksActions.watchSymbolRequested({ symbol: sampleSymbols[0].symbol }));
    expect(afterWatch.watchlist).toContain(sampleSymbols[0].symbol);
  });
});
