import { PriceQuote } from '../models/quote';
import { PortfolioSnapshot } from '../models/portfolio-snapshot';
import { Position } from '../models/position';
import { Symbol } from '../models/symbol.brand';
import { Trade } from '../models/trade';

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
