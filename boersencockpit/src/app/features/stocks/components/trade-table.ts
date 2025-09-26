import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { Trade } from '../../../domain/models/trade';

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

@Component({
  selector: 'app-trade-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trade-table.html',
  styleUrl: './trade-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeTableComponent {
  private _trades: readonly Trade[] = [];

  protected readonly formatDate = formatDateTime;
  protected currency: 'EUR' | 'USD' | 'CHF' | 'GBP' = 'EUR';

  @Input()
  set trades(value: readonly Trade[] | null) {
    this._trades = [...(value ?? [])].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  get trades(): readonly Trade[] {
    return this._trades;
  }

  @Input()
  set currencyCode(value: 'EUR' | 'USD' | 'CHF' | 'GBP') {
    this.currency = value;
  }

  @Output() readonly delete = new EventEmitter<string>();

  protected onDelete(id: string): void {
    this.delete.emit(id);
  }

  protected trackByTrade(_index: number, trade: Trade): string {
    return trade.id;
  }
}
