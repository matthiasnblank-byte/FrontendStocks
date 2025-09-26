import { DOCUMENT, NgIf, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  NgZone,
  PLATFORM_ID,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { FocusTrapDirective } from './accessibility/focus-trap.directive';
import { NavigationFocusService } from './accessibility/navigation-focus.service';
import { SkipLinkComponent } from './accessibility/skip-link.component';
import { HeaderComponent } from './header.component';
import { SidenavComponent } from './sidenav/sidenav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SkipLinkComponent, HeaderComponent, SidenavComponent, FocusTrapDirective, NgIf],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  // Instantiate to activate navigation focus management.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly navigationFocus = inject(NavigationFocusService);

  readonly isDesktop = signal(false);
  readonly isSidenavOpen = signal(false);
  readonly currentYear = new Date().getFullYear();

  private readonly subscriptions = new Subscription();

  private readonly updateBodyScrollEffect = effect(() => {
    const open = this.isSidenavOpen();
    const desktop = this.isDesktop();
    if (!isPlatformBrowser(this.platformId) || !this.document?.body) {
      return;
    }

    this.document.body.style.overflow = open && !desktop ? 'hidden' : '';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const mediaQuery = window.matchMedia('(min-width: 1024px)');
      this.isDesktop.set(mediaQuery.matches);
      const listener = (event: MediaQueryListEvent) => {
        this.zone.run(() => {
          this.isDesktop.set(event.matches);
          if (event.matches) {
            this.isSidenavOpen.set(false);
          }
        });
      };
      mediaQuery.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', listener));

      const navSub = this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          if (!this.isDesktop() && this.isSidenavOpen()) {
            // Off-canvas Navigation schließt nach Navigation, damit Fokus zurück auf den Toggle wandert.
            this.closeSidenav();
          }
        });
      this.subscriptions.add(navSub);
    }

    this.destroyRef.onDestroy(() => {
      this.subscriptions.unsubscribe();
      if (this.document?.body) {
        this.document.body.style.overflow = '';
      }
    });
  }

  toggleSidenav(): void {
    if (this.isDesktop()) {
      return;
    }

    this.isSidenavOpen.update((open) => !open);
  }

  closeSidenav(): void {
    if (!this.isSidenavOpen()) {
      return;
    }

    this.isSidenavOpen.set(false);
  }

  handleSidenavNavigation(): void {
    if (!this.isDesktop()) {
      this.closeSidenav();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isSidenavOpen() && !this.isDesktop()) {
      event.preventDefault();
      this.closeSidenav();
    }
  }
}
