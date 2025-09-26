import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Symbol } from '../../../domain/models/symbol.brand';

export interface DailyPerformanceViewModel {
  readonly symbol: Symbol;
  readonly changePct: number;
  readonly changeAbs: number;
  readonly price: number;
  readonly currency: 'EUR' | 'USD' | 'CHF' | 'GBP';
}

export interface TotalPerformanceViewModel {
  readonly symbol: Symbol;
  readonly pnlPct: number;
  readonly pnlAbs: number;
  readonly qty: number;
  readonly currency: 'EUR' | 'USD' | 'CHF' | 'GBP';
}

@Component({
  selector: 'app-portfolio-topflop',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './portfolio-topflop.html',
  styleUrl: './portfolio-topflop.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioTopflopComponent {
  @Input() topDaily: readonly DailyPerformanceViewModel[] = [];
  @Input() flopDaily: readonly DailyPerformanceViewModel[] = [];
  @Input() topTotal: readonly TotalPerformanceViewModel[] = [];
  @Input() flopTotal: readonly TotalPerformanceViewModel[] = [];

  protected isPositive(value: number): boolean {
    return value >= 0;
  }

  protected trackBySymbol(_index: number, item: DailyPerformanceViewModel | TotalPerformanceViewModel): Symbol {
    return item.symbol;
  }
}
