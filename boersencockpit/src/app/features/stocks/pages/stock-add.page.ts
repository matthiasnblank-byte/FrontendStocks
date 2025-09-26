import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, map, take } from 'rxjs';

import { TradeFormComponent } from '../components/trade-form';
import { TradeFormValue } from '../forms/trade.schema';
import * as TradesActions from '../../trades/state/trades.actions';
import { selectStockBySymbol } from '../state/stocks.selectors';
import { Symbol } from '../../../domain/models/symbol.brand';

@Component({
  selector: 'app-stock-add-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TradeFormComponent],
  templateUrl: './stock-add.page.html',
  styleUrl: './stock-add.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAddPageComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  private pendingSubmission: { id: string; symbol: Symbol; existed: boolean } | null = null;

  readonly submitting = signal(false);
  readonly liveMessage = signal('');

  constructor() {
    this.actions$
      .pipe(ofType(TradesActions.addTradeSucceeded), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ trade }) => {
        if (this.pendingSubmission?.id !== trade.id) {
          return;
        }
        this.submitting.set(false);
        this.liveMessage.set('Trade erfolgreich gespeichert.');
        const target = this.pendingSubmission.existed ? ['/stocks', trade.symbol] : ['/stocks'];
        this.router.navigate(target);
        this.pendingSubmission = null;
      });

    this.actions$
      .pipe(ofType(TradesActions.addTradeFailed), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.submitting.set(false);
        this.liveMessage.set('Speichern fehlgeschlagen. Bitte Eingaben prüfen.');
      });
  }

  ngOnDestroy(): void {
    this.liveMessage.set('');
  }

  async handleSubmit(value: TradeFormValue): Promise<void> {
    const id = crypto.randomUUID();
    const existed = await firstValueFrom(
      this.store
        .select(selectStockBySymbol(value.symbol))
        .pipe(
          take(1),
          map((existing) => Boolean(existing))
        )
    );

    this.pendingSubmission = { id, symbol: value.symbol, existed };
    this.submitting.set(true);
    this.store.dispatch(
      TradesActions.addTradeRequested({
        tradeInput: {
          id,
          ...value,
        },
      })
    );
  }
}
