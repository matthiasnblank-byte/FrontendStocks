import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PortfolioChartComponent, PortfolioSeriesPoint } from './portfolio-chart';
import { APP_TIMEZONE } from '../../../core/tokens/timezone.token';

const series: PortfolioSeriesPoint[] = [
  { t: '2024-01-01T00:00:00.000Z', totalValue: 1000, invested: 900, pnlAbs: 100, pnlPct: 11.11 },
  { t: '2024-01-02T00:00:00.000Z', totalValue: 1100, invested: 900, pnlAbs: 200, pnlPct: 22.22 },
];

describe('PortfolioChartComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: APP_TIMEZONE, useValue: 'Europe/Berlin' }],
    });
  });

  const createComponent = (): PortfolioChartComponent =>
    TestBed.runInInjectionContext(() => new PortfolioChartComponent());

  it('builds chart data from series', () => {
    const component = createComponent();
    component.range = '1M';
    component.series = series;
    component.ngOnChanges({ series: new SimpleChange(null, series, true) });
    const data = (component as any).chartData.datasets[0].data as { x: number; y: number }[];
    expect(data).toHaveLength(series.length);
    expect(data[0].y).toBe(series[0].totalValue);
  });

  it('emits range changes only for new values', () => {
    const component = createComponent();
    component.range = '1M';
    const emitted: string[] = [];
    component.rangeChange.subscribe((value) => emitted.push(value));
    component['onRangeChange']('1M');
    component['onRangeChange']('3M');
    expect(emitted).toEqual(['3M']);
  });
});
