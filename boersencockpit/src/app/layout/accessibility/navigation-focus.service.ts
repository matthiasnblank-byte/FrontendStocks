import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavigationFocusService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly subscription = new Subscription();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.subscription.add(
      this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
        this.zone.runOutsideAngular(() => {
          queueMicrotask(() => this.focusPrimaryHeading());
        });
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private focusPrimaryHeading(): void {
    const doc = this.document;
    if (!doc) {
      return;
    }

    const mainElement = doc.getElementById('main');
    const heading = mainElement?.querySelector('h1');
    const target = (heading as HTMLElement | null) ?? (mainElement as HTMLElement | null);

    if (!target) {
      return;
    }

    const hadTabIndex = target.hasAttribute('tabindex');
    if (!hadTabIndex) {
      target.setAttribute('tabindex', '-1');
    }

    target.focus({ preventScroll: true });

    if (!hadTabIndex && target !== mainElement) {
      target.removeAttribute('tabindex');
    }
  }
}
