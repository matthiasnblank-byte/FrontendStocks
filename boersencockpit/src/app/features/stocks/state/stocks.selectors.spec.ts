import { asSymbol } from '../../../domain/models/symbol.brand';
import { ListSymbol } from '../../../core/api/price-api.port';
import { stocksAdapter, initialStocksState } from './stocks.reducer';
import { selectAllStocks, selectStockBySymbol, selectWatchlist } from './stocks.selectors';

const sampleSymbols: ListSymbol[] = [
  { symbol: asSymbol('AAPL'), name: 'Apple', currency: 'USD' },
  { symbol: asSymbol('SAP'), name: 'SAP', currency: 'EUR' },
];

describe('stocks selectors', () => {
  const state = stocksAdapter.setAll(sampleSymbols, {
    ...initialStocksState,
    watchlist: sampleSymbols.map((item) => item.symbol),
  });

  const rootState = { stocks: state } as { stocks: typeof state };

  it('selectAllStocks returns ordered list', () => {
    expect(selectAllStocks.projector(state)).toEqual(sampleSymbols);
  });

  it('selectStockBySymbol returns entity', () => {
    const selector = selectStockBySymbol(sampleSymbols[0].symbol);
    expect(selector(rootState)).toEqual(sampleSymbols[0]);
  });

  it('selectWatchlist returns all watched symbols', () => {
    expect(selectWatchlist.projector(state)).toEqual(sampleSymbols.map((item) => item.symbol));
  });
});
