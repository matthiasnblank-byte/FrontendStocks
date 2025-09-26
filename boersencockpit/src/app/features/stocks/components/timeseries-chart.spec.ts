import { SimpleChange } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';

jest.mock(
  'ng2-charts',
  () => ({
    BaseChartDirective: class {}
  }),
  { virtual: true }
);

import { TimeseriesChartComponent } from './timeseries-chart';
import { TimeSeries } from '../../../domain/models/candle';
import { Trade } from '../../../domain/models/trade';
import { asSymbol } from '../../../domain/models/symbol.brand';

const seriesFixture: TimeSeries = {
  symbol: asSymbol('SAP'),
  candles: [
    { t: '2024-01-03T00:00:00.000Z', o: 120, h: 121, l: 119, c: 121 },
    { t: '2024-01-01T00:00:00.000Z', o: 110, h: 112, l: 108, c: 110 },
    { t: '2024-01-02T00:00:00.000Z', o: 115, h: 118, l: 114, c: 117 }
  ]
};

const tradesFixture: Trade[] = [
  {
    id: '1',
    symbol: asSymbol('SAP'),
    side: 'BUY',
    quantity: 5,
    price: 111,
    timestamp: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    symbol: asSymbol('SAP'),
    side: 'SELL',
    quantity: 3,
    price: 120,
    timestamp: '2024-01-03T00:00:00.000Z'
  }
];

describe('TimeseriesChartComponent', () => {
  let component: TimeseriesChartComponent;
  let numberFormatSpy: jest.SpiedFunction<typeof Intl.NumberFormat>;

  beforeAll((): void => {
    numberFormatSpy = jest.spyOn(Intl, 'NumberFormat').mockImplementation((() => ({
      format: (value: number): string => `${value.toFixed(2).replace('.', ',')} €`
    })) as unknown as typeof Intl.NumberFormat);
  });

  afterAll((): void => {
    numberFormatSpy.mockRestore();
  });

  type TimeseriesChartTestHarness = TimeseriesChartComponent & {
    chartData: ChartConfiguration<'line'>['data'];
    chartOptions: ChartOptions<'line'>;
  };

  beforeEach((): void => {
    component = new TimeseriesChartComponent();
    component.currency = 'EUR';
    component.range = '1M';
    component.series = seriesFixture;
    component.trades = tradesFixture;
    component.ngOnChanges({
      series: new SimpleChange(null, component.series, true),
      trades: new SimpleChange(null, component.trades, true),
      currency: new SimpleChange(null, component.currency, true)
    });
  });

  it('maps candles to sorted chart data', (): void => {
    const harness = component as TimeseriesChartTestHarness;
    const data = harness.chartData.datasets[0].data as { x: number; y: number }[];
    expect(data.map((point) => point.y)).toEqual([110, 117, 121]);
    expect(data.map((point) => point.x)).toEqual([
      new Date('2024-01-01T00:00:00.000Z').getTime(),
      new Date('2024-01-02T00:00:00.000Z').getTime(),
      new Date('2024-01-03T00:00:00.000Z').getTime()
    ]);
  });

  it('creates annotations for each trade with correct coloring', (): void => {
    const harness = component as TimeseriesChartTestHarness;
    const options = harness.chartOptions.plugins?.annotation as { annotations: Record<string, unknown> } | undefined;
    expect(options).toBeDefined();
    const annotations = options?.annotations ?? {};
    expect(Object.keys(annotations)).toHaveLength(tradesFixture.length);
    const values = Object.values(annotations) as { backgroundColor: string; rotation: number }[];
    expect(values[0].backgroundColor).toBe('#16a34a');
    expect(values[0].rotation).toBe(0);
    expect(values[1].backgroundColor).toBe('#dc2626');
    expect(values[1].rotation).toBe(180);
  });

  it('formats tooltip text for trades', (): void => {
    const harness = component as TimeseriesChartTestHarness;
    const callbacks = harness.chartOptions.plugins?.tooltip?.callbacks;
    expect(callbacks).toBeDefined();
    const afterBody = callbacks.afterBody?.bind({});
    const tooltipItems: readonly { parsed: { x: number; y: number } }[] = [{ parsed: { x: new Date('2024-01-03T00:00:00.000Z').getTime(), y: 121 } }];
    const tooltip = afterBody?.(tooltipItems);
    expect(tooltip?.[0]).toContain('Verkauf');
    expect(tooltip?.[0]).toContain('120,00 €');
  });
});
