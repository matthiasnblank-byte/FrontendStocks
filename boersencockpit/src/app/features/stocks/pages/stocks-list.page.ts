import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, distinctUntilChanged } from 'rxjs';

import { StockListItemComponent } from '../components/stock-list-item';
import * as StocksActions from '../state/stocks.actions';
import { selectAllStocks } from '../state/stocks.selectors';
import { selectQuotesEntities } from '../../quotes/state/quotes.selectors';
import * as QuotesActions from '../../quotes/state/quotes.actions';
import { ListSymbol } from '../../../core/api/price-api.port';
import { PriceQuote } from '../../../domain/models/quote';
import { Symbol } from '../../../domain/models/symbol.brand';

interface StockListItemViewModel {
  readonly listSymbol: ListSymbol;
  readonly quote: PriceQuote | null;
}

const symbolsEqual = (prev: readonly Symbol[], next: readonly Symbol[]): boolean => {
  if (prev.length !== next.length) {
    return false;
  }
  return prev.every((symbol, index) => symbol === next[index]);
};

@Component({
  selector: 'app-stocks-list-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, StockListItemComponent],
  templateUrl: './stocks-list.page.html',
  styleUrl: './stocks-list.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StocksListPageComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly symbols$ = this.store.select(selectAllStocks);
  private readonly quotes$ = this.store.select(selectQuotesEntities);

  readonly filteredStocks$ = combineLatest([
    this.symbols$,
    this.quotes$,
    this.searchControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([symbols, quotes, search]) => {
      const term = search.trim().toLowerCase();
      const filtered = symbols.filter((symbol) => {
        if (!term) {
          return true;
        }
        return (
          symbol.symbol.toLowerCase().includes(term) ||
          symbol.name.toLowerCase().includes(term)
        );
      });
      return filtered.map<StockListItemViewModel>((listSymbol) => ({
        listSymbol,
        quote: quotes[listSymbol.symbol] ?? null,
      }));
    })
  );

  readonly hasSymbols$ = this.symbols$.pipe(map((symbols) => symbols.length > 0));

  constructor() {
    this.filteredStocks$
      .pipe(
        map((items) => items.map(({ listSymbol }) => listSymbol.symbol)),
        distinctUntilChanged(symbolsEqual),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((symbols) => {
        if (symbols.length === 0) {
          this.store.dispatch(QuotesActions.quotesPollStop());
          return;
        }
        this.store.dispatch(QuotesActions.quotesSnapshotRequested({ symbols }));
        this.store.dispatch(QuotesActions.quotesPollStart({ symbols }));
      });
  }

  ngOnInit(): void {
    this.store.dispatch(StocksActions.loadSymbolsRequested());
  }

  ngOnDestroy(): void {
    this.store.dispatch(QuotesActions.quotesPollStop());
  }

  protected trackBySymbol(_index: number, item: StockListItemViewModel): Symbol {
    return item.listSymbol.symbol;
  }
}
