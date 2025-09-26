import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h1 class="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Portfolio (WIP)
      </h1>
      <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Dieser Bereich wird in den kommenden Phasen zum Portfolio-Dashboard ausgebaut.
      </p>
    </section>
  `,
})
export class PortfolioComponent {}
