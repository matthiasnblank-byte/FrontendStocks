import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { APP_TIMEZONE } from './core/tokens/timezone.token';
import { formatInAppTimezone } from './core/utils/timezone.util';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div
      class="min-h-screen bg-neutral-100 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100"
    >
      <div class="app-container">
        <header
          class="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60"
        >
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="badge">Phase 1</span>
              <h1 class="text-3xl font-semibold tracking-tight">{{ title }}</h1>
            </div>
            <div class="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
              <span class="font-medium">Dark Mode</span>
              <span
                class="rounded-md border border-dashed border-neutral-300 px-3 py-1 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
              >
                WIP
              </span>
            </div>
          </div>
          <nav aria-label="Hauptnavigation" class="flex flex-wrap items-center gap-2">
            <a
              routerLink="/portfolio"
              class="btn"
              routerLinkActive="btn-active"
              [routerLinkActiveOptions]="{ exact: true }"
              #portfolioLink="routerLinkActive"
              [attr.aria-current]="portfolioLink.isActive ? 'page' : null"
            >
              Portfolio
            </a>
            <a
              routerLink="/stocks"
              class="btn"
              routerLinkActive="btn-active"
              #stocksLink="routerLinkActive"
              [attr.aria-current]="stocksLink.isActive ? 'page' : null"
            >
              Stocks
            </a>
          </nav>
        </header>

        <main role="main" class="flex-1">
          <router-outlet></router-outlet>
          <section
            class="mt-10 rounded-lg border border-dashed border-neutral-300 bg-white/70 p-4 text-sm text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300"
          >
            <p class="font-medium">Locale-Check</p>
            <p class="mt-1 flex flex-wrap items-center gap-2">
              <span class="badge">Beispielkurs</span>
              <span>{{ currencyPreview | currency }}</span>
              <span class="text-xs text-neutral-500 dark:text-neutral-400">
                Zeitzone: {{ timezone }}
              </span>
              <span class="text-xs text-neutral-500 dark:text-neutral-400">
                Aktuelle Zeit (Platzhalter): {{ timezonePreview }}
              </span>
            </p>
          </section>
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly title = 'BörsenCockpit';
  readonly currencyPreview = 1234.56;
  readonly timezone = inject(APP_TIMEZONE);
  readonly timezonePreview = formatInAppTimezone(new Date());
}
