import { createFeature } from '@ngrx/store';
import { createSelector } from '@ngrx/store';

import { PORTFOLIO_FEATURE_KEY } from './portfolio.models';
import { portfolioReducer } from './portfolio.reducer';
import { selectPositions as selectTradePositions, selectAllTrades } from '../../trades/state/trades.selectors';
import { selectAllQuotes } from '../../quotes/state/quotes.selectors';
import { computeSnapshot, computePortfolioSeries, buildPositionTimeline, PositionTimelinePoint } from '../../../domain/utils/portfolio';
import { PortfolioSnapshot } from '../../../domain/models/portfolio-snapshot';
import { PriceQuote } from '../../../domain/models/quote';
import { Position } from '../../../domain/models/position';
import { Symbol } from '../../../domain/models/symbol.brand';
import { RangeKey } from '../../../core/api/price-api.port';
import { selectSeriesMap } from '../../timeseries/state/timeseries.selectors';
import { TimeSeriesState } from '../../timeseries/state/timeseries.models';
import { Dictionary } from '@ngrx/entity';
import { Candle } from '../../../domain/models/candle';
import { Trade } from '../../../domain/models/trade';
import { selectStockEntities } from '../../stocks/state/stocks.selectors';
import { ListSymbol } from '../../../core/api/price-api.port';

export const portfolioFeature = createFeature({
  name: PORTFOLIO_FEATURE_KEY,
  reducer: portfolioReducer,
  extraSelectors: ({ selectPortfolioState }) => ({
    selectSelectedRange: createSelector(selectPortfolioState, (state) => state.selectedRange),
    selectRevision: createSelector(selectPortfolioState, (state) => state.revision),
  }),
});

export const {
  name: portfolioFeatureKey,
  reducer: portfolioFeatureReducer,
  selectPortfolioState,
  selectSelectedRange,
  selectRevision,
} = portfolioFeature;

export const selectPositions = selectTradePositions;

export const selectPortfolioMetrics = createSelector(
  selectPositions,
  selectAllQuotes,
  (positions: readonly Position[], quotes: readonly PriceQuote[]): PortfolioSnapshot => {
    if (positions.length === 0) {
      return {
        asOf: '1970-01-01T00:00:00.000Z',
        totalValue: 0,
        invested: 0,
        pnlAbs: 0,
        pnlPct: 0,
      };
    }
    const asOf = quotes.reduce((latest, quote) => (quote.asOf > latest ? quote.asOf : latest), '1970-01-01T00:00:00.000Z');
    return computeSnapshot(asOf, positions, quotes);
  }
);

export const selectPortfolioSnapshot = (asOf: string) =>
  createSelector(selectPositions, selectAllQuotes, (positions: readonly Position[], quotes: readonly PriceQuote[]) =>
    computeSnapshot(asOf, positions, quotes)
  );

const stableSymbolSort = (a: Symbol, b: Symbol): number => a.localeCompare(b);

const buildTradeMap = (trades: readonly Trade[]): Map<Symbol, readonly Trade[]> => {
  const map = new Map<Symbol, Trade[]>();
  for (const trade of trades) {
    if (!map.has(trade.symbol)) {
      map.set(trade.symbol, []);
    }
    map.get(trade.symbol)!.push(trade);
  }
  for (const [symbol, groupedTrades] of map.entries()) {
    groupedTrades.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    map.set(symbol, groupedTrades);
  }
  return map;
};

const toSeriesMap = (
  rawSeries: TimeSeriesState['series'],
  range: RangeKey
): Map<Symbol, readonly Candle[]> => {
  const map = new Map<Symbol, readonly Candle[]>();
  for (const [symbol, ranges] of Object.entries(rawSeries)) {
    const series = ranges?.[range]?.candles ?? null;
    if (series && series.length > 0) {
      map.set(symbol as Symbol, [...series].sort((a, b) => a.t.localeCompare(b.t)));
    }
  }
  return map;
};

const buildTimelineMap = (
  tradesBySymbol: ReadonlyMap<Symbol, readonly Trade[]>,
  seriesBySymbol: ReadonlyMap<Symbol, readonly Candle[]>
): Map<Symbol, readonly PositionTimelinePoint[]> => {
  const map = new Map<Symbol, readonly PositionTimelinePoint[]>();
  for (const symbol of seriesBySymbol.keys()) {
    const symbolTrades = tradesBySymbol.get(symbol) ?? [];
    const candles = seriesBySymbol.get(symbol) ?? [];
    if (candles.length === 0) {
      continue;
    }
    map.set(symbol, buildPositionTimeline(symbolTrades, candles));
  }
  return map;
};

const compareDescending = (a: number, b: number): number => b - a;
const compareAscending = (a: number, b: number): number => a - b;

interface DailyPerformanceEntry {
  readonly symbol: Symbol;
  readonly changePct: number;
  readonly changeAbs: number;
  readonly price: number;
  readonly currency: ListSymbol['currency'];
}

interface TotalPerformanceEntry {
  readonly symbol: Symbol;
  readonly pnlPct: number;
  readonly pnlAbs: number;
  readonly qty: number;
  readonly currency: ListSymbol['currency'];
}

const ensureCurrency = (
  symbol: Symbol,
  stockEntities: Dictionary<ListSymbol>
): ListSymbol['currency'] => stockEntities[symbol]?.currency ?? 'EUR';

export const selectPortfolioSeries = (range: RangeKey) =>
  createSelector(selectAllTrades, selectSeriesMap, (trades, rawSeries) => {
    if (trades.length === 0) {
      return null;
    }

    const tradesBySymbol = buildTradeMap(trades);
    const seriesBySymbol = toSeriesMap(rawSeries, range);

    if (seriesBySymbol.size === 0) {
      return null;
    }

    const missingSeries = Array.from(tradesBySymbol.keys()).filter((symbol) => !seriesBySymbol.has(symbol));
    if (missingSeries.length > 0) {
      return null;
    }

    const positionsByDate = buildTimelineMap(tradesBySymbol, seriesBySymbol);
    const series = computePortfolioSeries(range, positionsByDate, seriesBySymbol);

    return series.length > 0 ? series : null;
  });

export const selectDailyPerformance = (count: number) =>
  createSelector(
    selectPositions,
    selectAllQuotes,
    selectStockEntities,
    (positions, quotes, stockEntities): { top: readonly DailyPerformanceEntry[]; flop: readonly DailyPerformanceEntry[] } => {
      const quoteMap = new Map<Symbol, PriceQuote>(quotes.map((quote) => [quote.symbol, quote]));
      const entries = positions
        .filter((position) => position.totalQuantity > 0)
        .map((position) => {
          const quote = quoteMap.get(position.symbol);
          if (!quote) {
            return null;
          }
          const currency = ensureCurrency(position.symbol, stockEntities);
          return {
            symbol: position.symbol,
            changePct: quote.changePct,
            changeAbs: quote.changeAbs,
            price: quote.price,
            currency,
          } satisfies DailyPerformanceEntry;
        })
        .filter((entry): entry is DailyPerformanceEntry => entry !== null);

      const sortedDesc = [...entries].sort((a, b) => {
        const byPct = compareDescending(a.changePct, b.changePct);
        return byPct !== 0 ? byPct : stableSymbolSort(a.symbol, b.symbol);
      });

      const sortedAsc = [...entries].sort((a, b) => {
        const byPct = compareAscending(a.changePct, b.changePct);
        return byPct !== 0 ? byPct : stableSymbolSort(a.symbol, b.symbol);
      });

      return {
        top: sortedDesc.slice(0, count),
        flop: sortedAsc.slice(0, count),
      };
    }
  );

export const selectTotalPerformance = (count: number) =>
  createSelector(
    selectPositions,
    selectAllQuotes,
    selectStockEntities,
    (positions, quotes, stockEntities): { top: readonly TotalPerformanceEntry[]; flop: readonly TotalPerformanceEntry[] } => {
      const quoteMap = new Map<Symbol, PriceQuote>(quotes.map((quote) => [quote.symbol, quote]));
      const entries = positions
        .filter((position) => position.totalQuantity > 0 && position.avgBuyPrice)
        .map((position) => {
          const quote = quoteMap.get(position.symbol);
          if (!quote || !position.avgBuyPrice) {
            return null;
          }
          const currency = ensureCurrency(position.symbol, stockEntities);
          const pnlAbs = (quote.price - position.avgBuyPrice) * position.totalQuantity;
          const pnlPct = position.avgBuyPrice !== 0 ? ((quote.price - position.avgBuyPrice) / position.avgBuyPrice) * 100 : 0;
          return {
            symbol: position.symbol,
            qty: position.totalQuantity,
            pnlAbs,
            pnlPct,
            currency,
          } satisfies TotalPerformanceEntry;
        })
        .filter((entry): entry is TotalPerformanceEntry => entry !== null);

      const sortedDesc = [...entries].sort((a, b) => {
        const byPct = compareDescending(a.pnlPct, b.pnlPct);
        return byPct !== 0 ? byPct : stableSymbolSort(a.symbol, b.symbol);
      });

      const sortedAsc = [...entries].sort((a, b) => {
        const byPct = compareAscending(a.pnlPct, b.pnlPct);
        return byPct !== 0 ? byPct : stableSymbolSort(a.symbol, b.symbol);
      });

      return {
        top: sortedDesc.slice(0, count),
        flop: sortedAsc.slice(0, count),
      };
    }
  );
