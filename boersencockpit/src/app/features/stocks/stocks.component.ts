import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stocks',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h1 class="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Stocks (WIP)
      </h1>
      <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Kurs- und Marktdaten folgen in späteren Ausbaustufen.
      </p>
    </section>
  `,
})
export class StocksComponent {}
