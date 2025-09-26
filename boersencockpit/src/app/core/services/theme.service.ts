import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'theme';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT, { optional: true });

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly darkModeSubject = new BehaviorSubject<boolean>(this.resolveInitialTheme());

  readonly isDark$ = this.darkModeSubject.asObservable().pipe(distinctUntilChanged());

  constructor() {
    this.applyTheme(this.darkModeSubject.value);
  }

  toggle(): void {
    this.setDarkMode(!this.darkModeSubject.value);
  }

  enableDark(): void {
    this.setDarkMode(true);
  }

  disableDark(): void {
    this.setDarkMode(false);
  }

  private resolveInitialTheme(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    try {
      const stored = window.localStorage.getItem(ThemeService.STORAGE_KEY);
      if (stored === 'dark') {
        return true;
      }

      if (stored === 'light') {
        return false;
      }

      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
      return prefersDark;
    } catch {
      return false;
    }
  }

  private setDarkMode(isDark: boolean): void {
    if (this.darkModeSubject.value === isDark) {
      return;
    }

    this.darkModeSubject.next(isDark);
    this.applyTheme(isDark);
  }

  private applyTheme(isDark: boolean): void {
    if (!this.isBrowser || !this.document?.documentElement) {
      return;
    }

    const classList = this.document.documentElement.classList;

    classList.toggle('dark', isDark);

    try {
      window.localStorage.setItem(ThemeService.STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors (e.g., private mode).
    }
  }
}
