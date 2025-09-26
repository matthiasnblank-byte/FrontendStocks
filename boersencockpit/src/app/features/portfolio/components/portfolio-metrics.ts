import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface PortfolioMetricsInput {
  readonly invested: number;
  readonly totalValue: number;
  readonly pnlAbs: number;
  readonly pnlPct: number;
}

@Component({
  selector: 'app-portfolio-metrics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-metrics.html',
  styleUrl: './portfolio-metrics.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioMetricsComponent {
  @Input({ required: true }) metrics!: PortfolioMetricsInput;

  protected readonly positiveBadgeClass =
    'badge inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100';
  protected readonly negativeBadgeClass =
    'badge inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-sm font-medium text-rose-700 dark:bg-rose-900 dark:text-rose-100';

  protected isPositive(value: number): boolean {
    return value >= 0;
  }
}
