import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PriceQuote } from '../../../domain/models/quote';
import { Symbol } from '../../../domain/models/symbol.brand';

@Component({
  selector: 'app-stock-list-item',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './stock-list-item.html',
  styleUrl: './stock-list-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockListItemComponent {
  @Input({ required: true }) symbol!: Symbol;
  @Input({ required: true }) name!: string;
  @Input({ required: true }) currency!: 'EUR' | 'USD' | 'CHF' | 'GBP';
  @Input() quote: PriceQuote | null = null;

  protected get changeBadgeClasses(): string {
    if (!this.quote) {
      return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
    }
    return this.quote.changePct >= 0
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
  }

  protected get changePrefix(): string {
    if (!this.quote) {
      return '';
    }
    return this.quote.changePct >= 0 ? '+' : '';
  }
}
