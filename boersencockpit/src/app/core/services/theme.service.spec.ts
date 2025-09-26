import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
      configurable: true,
      writable: true,
    });

    localStorage.clear();
    document.documentElement.classList.remove('dark');

    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: document }],
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.resetTestingModule();
  });

  it('initialises from stored preference', (done) => {
    localStorage.setItem('theme', 'dark');

    const service = TestBed.inject(ThemeService);
    const documentRef = TestBed.inject(DOCUMENT);

    service.isDark$.subscribe((value) => {
      expect(value).toBe(true);
      expect(documentRef.documentElement.classList.contains('dark')).toBe(true);
      done();
    });
  });

  it('resolves prefers-color-scheme when no persisted value exists', (done) => {
    localStorage.removeItem('theme');

    const service = TestBed.inject(ThemeService);

    service.isDark$.subscribe((value) => {
      expect(value).toBe(true);
      done();
    });
  });

  it('toggles and persists the theme', (done) => {
    const service = TestBed.inject(ThemeService);
    const documentRef = TestBed.inject(DOCUMENT);

    service.disableDark();
    service.toggle();

    service.isDark$.subscribe((value) => {
      expect(value).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(documentRef.documentElement.classList.contains('dark')).toBe(true);
      done();
    });
  });
});
