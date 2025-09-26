import { PriceQuote } from '../models/quote';
import { PortfolioSnapshot } from '../models/portfolio-snapshot';
import { Position } from '../models/position';
import { Symbol } from '../models/symbol.brand';
import { Trade } from '../models/trade';
import { RangeKey } from '../../core/api/price-api.port';
import { Candle } from '../models/candle';

interface PositionAccumulator {
  readonly symbol: Symbol;
  queue: { quantity: number; price: number }[];
  realizedPnL: number;
}

const getAccumulator = (
  map: Map<Symbol, PositionAccumulator>,
  symbol: Symbol
): PositionAccumulator => {
  let acc = map.get(symbol);
  if (!acc) {
    acc = {
      symbol,
      queue: [],
      realizedPnL: 0
    };
    map.set(symbol, acc);
  }
  return acc;
};

export const computePositions = (trades: readonly Trade[]): readonly Position[] => {
  const sorted = [...trades].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const map = new Map<Symbol, PositionAccumulator>();

  for (const trade of sorted) {
    const acc = getAccumulator(map, trade.symbol);

    if (trade.side === 'BUY') {
      let remaining = trade.quantity;
      while (remaining > 0 && acc.queue.length > 0 && acc.queue[0].quantity < 0) {
        const lot = acc.queue[0];
        const matched = Math.min(remaining, -lot.quantity);
        acc.realizedPnL += (lot.price - trade.price) * matched;
        lot.quantity += matched;
        remaining -= matched;
        if (lot.quantity === 0) {
          acc.queue.shift();
        }
      }
      if (remaining > 0) {
        acc.queue.push({ quantity: remaining, price: trade.price });
      }
    } else {
      let remaining = trade.quantity;
      while (remaining > 0 && acc.queue.length > 0 && acc.queue[0].quantity > 0) {
        const lot = acc.queue[0];
        const matched = Math.min(remaining, lot.quantity);
        acc.realizedPnL += (trade.price - lot.price) * matched;
        lot.quantity -= matched;
        remaining -= matched;
        if (lot.quantity === 0) {
          acc.queue.shift();
        }
      }
      if (remaining > 0) {
        acc.queue.push({ quantity: -remaining, price: trade.price });
      }
    }
  }

  return Array.from(map.values())
    .map<Position>(({ symbol, queue, realizedPnL }) => {
      const totalQuantity = queue.reduce((sum, lot) => sum + lot.quantity, 0);
      const longLots = queue.filter((lot) => lot.quantity > 0);
      const totalCost = longLots.reduce(
        (sum, lot) => sum + lot.quantity * lot.price,
        0
      );
      return {
        symbol,
        totalQuantity,
        avgBuyPrice:
          totalQuantity > 0
            ? Number((totalCost / longLots.reduce((sum, lot) => sum + lot.quantity, 0)).toFixed(6))
            : undefined,
        realizedPnL: Number(realizedPnL.toFixed(6))
      };
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
};

export const computeSnapshot = (
  dateISO: string,
  positions: readonly Position[],
  quotes: readonly PriceQuote[]
): PortfolioSnapshot => {
  const quoteMap = new Map<Symbol, PriceQuote>(
    quotes.map((quote) => [quote.symbol, quote])
  );

  let totalValue = 0;
  let invested = 0;

  for (const position of positions) {
    if (position.totalQuantity > 0) {
      const quote = quoteMap.get(position.symbol);
      const price = quote?.price ?? 0;
      totalValue += position.totalQuantity * price;
      if (position.avgBuyPrice) {
        invested += position.totalQuantity * position.avgBuyPrice;
      }
    }
  }

  const pnlAbs = totalValue - invested;
  const pnlPct = invested !== 0 ? (pnlAbs / invested) * 100 : 0;

  return {
    asOf: dateISO,
    totalValue,
    invested,
    pnlAbs,
    pnlPct
  };
};

export interface PositionTimelinePoint {
  readonly t: string;
  readonly qty: number;
  readonly invested: number;
}

interface PositionTimelineAccumulator {
  readonly lots: { quantity: number; price: number }[];
  quantity: number;
  invested: number;
}

const clampInvested = (quantity: number, invested: number): number => (quantity > 0 ? invested : 0);

const applyTradeToAccumulator = (acc: PositionTimelineAccumulator, trade: Trade): void => {
  if (trade.side === 'BUY') {
    let remaining = trade.quantity;
    while (remaining > 0 && acc.lots.length > 0 && acc.lots[0].quantity < 0) {
      const lot = acc.lots[0];
      const matched = Math.min(remaining, -lot.quantity);
      lot.quantity += matched;
      remaining -= matched;
      if (lot.quantity === 0) {
        acc.lots.shift();
      }
    }

    if (remaining > 0) {
      acc.lots.push({ quantity: remaining, price: trade.price });
      acc.quantity += remaining;
      acc.invested += remaining * trade.price;
    }
  } else {
    let remaining = trade.quantity;
    acc.quantity -= remaining;
    while (remaining > 0 && acc.lots.length > 0) {
      const lot = acc.lots[0];
      const matched = Math.min(remaining, lot.quantity);
      acc.invested -= matched * lot.price;
      lot.quantity -= matched;
      remaining -= matched;
      if (lot.quantity === 0) {
        acc.lots.shift();
      }
    }

    if (remaining > 0) {
      // Short-Positionen werden als kostenfreier Bestand behandelt, um den Bewertungsverlauf stabil zu halten.
      acc.lots.unshift({ quantity: -remaining, price: trade.price });
    }
  }
  acc.invested = clampInvested(acc.quantity, acc.invested);
};

export const buildPositionTimeline = (
  trades: readonly Trade[],
  candles: readonly Candle[]
): readonly PositionTimelinePoint[] => {
  if (candles.length === 0) {
    return [];
  }

  const sortedTrades = [...trades].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const sortedCandles = [...candles].sort((a, b) => a.t.localeCompare(b.t));

  const acc: PositionTimelineAccumulator = { lots: [], quantity: 0, invested: 0 };
  const points: PositionTimelinePoint[] = [];
  let tradeIndex = 0;

  for (const candle of sortedCandles) {
    while (tradeIndex < sortedTrades.length && sortedTrades[tradeIndex].timestamp <= candle.t) {
      applyTradeToAccumulator(acc, sortedTrades[tradeIndex]);
      tradeIndex += 1;
    }
    points.push({
      t: candle.t,
      qty: acc.quantity,
      invested: clampInvested(acc.quantity, acc.invested),
    });
  }

  return points;
};

// Die Kostenbasis pro Symbol wird rollierend über den Positionsverlauf bestimmt. Für jeden Handelstag
// wird das investierte Kapital aus den tatsächlich gehaltenen Lots (FIFO) errechnet und anschließend
// im Aggregat summiert. Dadurch bleibt die P&L-Berechnung konsistent über den Zeitraum.
export const computePortfolioSeries = (
  _range: RangeKey,
  positionsByDate: ReadonlyMap<Symbol, readonly PositionTimelinePoint[]>,
  seriesBySymbol: ReadonlyMap<Symbol, readonly Candle[]>
): readonly {
  readonly t: string;
  readonly totalValue: number;
  readonly invested: number;
  readonly pnlAbs: number;
  readonly pnlPct: number;
}[] => {
  const symbols = Array.from(seriesBySymbol.keys()).filter((symbol) => (seriesBySymbol.get(symbol)?.length ?? 0) > 0);

  if (symbols.length === 0) {
    return [];
  }

  const dateSets = symbols.map((symbol) => new Set((seriesBySymbol.get(symbol) ?? []).map((candle) => candle.t)));
  const referenceDates = [...(seriesBySymbol.get(symbols[0]) ?? [])]
    .map((candle) => candle.t)
    .sort((a, b) => a.localeCompare(b));

  const intersectionDates = referenceDates.filter((date) => dateSets.every((set) => set.has(date)));

  if (intersectionDates.length === 0) {
    return [];
  }

  const priceLookup = new Map<Symbol, Map<string, number>>();
  for (const symbol of symbols) {
    const map = new Map<string, number>();
    for (const candle of seriesBySymbol.get(symbol) ?? []) {
      map.set(candle.t, candle.c);
    }
    priceLookup.set(symbol, map);
  }

  const timelineLookup = new Map<Symbol, Map<string, PositionTimelinePoint>>();
  for (const symbol of symbols) {
    const entries = positionsByDate.get(symbol) ?? [];
    const map = new Map<string, PositionTimelinePoint>();
    for (const entry of entries) {
      map.set(entry.t, entry);
    }
    timelineLookup.set(symbol, map);
  }

  const result = intersectionDates.map((date) => {
    let totalValue = 0;
    let invested = 0;

    for (const symbol of symbols) {
      const price = priceLookup.get(symbol)?.get(date) ?? 0;
      const timelineEntry = timelineLookup.get(symbol)?.get(date);
      const quantity = timelineEntry?.qty ?? 0;
      const cost = timelineEntry?.invested ?? 0;

      totalValue += quantity * price;
      invested += cost;
    }

    const pnlAbs = totalValue - invested;
    const pnlPct = invested !== 0 ? (pnlAbs / invested) * 100 : 0;

    return {
      t: date,
      totalValue,
      invested,
      pnlAbs,
      pnlPct,
    };
  });

  return result;
};
