import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import * as PortfolioActions from './portfolio.actions';
import * as TradesActions from '../../trades/state/trades.actions';
import * as QuotesActions from '../../quotes/state/quotes.actions';
import * as TimeSeriesActions from '../../timeseries/state/timeseries.actions';
import { PortfolioEffects } from './portfolio.effects';
import { runMarbles } from '../../../testing/marble-helpers';
import { asSymbol } from '../../../domain/models/symbol.brand';
import { PriceQuote } from '../../../domain/models/quote';
import { TimeSeries } from '../../../domain/models/candle';

const symbol = asSymbol('AAPL');
const quote: PriceQuote = { symbol, price: 100, changeAbs: 1, changePct: 1, asOf: '2024-01-01T00:00:00.000Z' };
const series: TimeSeries = { symbol, candles: [{ t: '2024-01-01T00:00:00.000Z', o: 1, h: 1, l: 1, c: 1 }] };

describe('PortfolioEffects', () => {
  let actions$: Observable<unknown>;
  let effects: PortfolioEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PortfolioEffects, provideMockActions(() => actions$)],
    });
    effects = TestBed.inject(PortfolioEffects);
  });

  const expectRecompute = (action: unknown) => {
    runMarbles(({ hot, expectObservable }) => {
      actions$ = hot('-a', { a: action });
      const expected = '-b';
      const expectedValues = {
        b: PortfolioActions.portfolioRecomputeRequested(),
      };
      expectObservable(effects.recomputeRequested$).toBe(expected, expectedValues);
    });
  };

  it('triggers recompute on trade success', () => {
    expectRecompute(TradesActions.addTradeSucceeded({
      trade: {
        id: '1',
        symbol,
        side: 'BUY',
        quantity: 1,
        price: 100,
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    }));
  });

  it('triggers recompute on quote tick', () => {
    expectRecompute(QuotesActions.quotesTickArrived({ quotes: [quote] }));
  });

  it('triggers recompute on time series success', () => {
    expectRecompute(TimeSeriesActions.timeSeriesSucceeded({ symbol, range: '1M', series }));
  });

  it('triggers recompute on range change', () => {
    expectRecompute(PortfolioActions.portfolioRangeChanged({ range: '3M' }));
  });
});
