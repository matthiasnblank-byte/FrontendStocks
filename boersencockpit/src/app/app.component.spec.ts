import { DatePipe, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { APP_TIMEZONE } from './core/tokens/timezone.token';
import { AppComponent } from './app.component';

registerLocaleData(localeDe);

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppComponent],
      providers: [
        DatePipe,
        { provide: APP_TIMEZONE, useValue: 'Europe/Berlin' },
        { provide: LOCALE_ID, useValue: 'de-DE' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the header title', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('BörsenCockpit');
  });

  it('should format dates according to the provided locale', () => {
    const locale = TestBed.inject(LOCALE_ID);
    const datePipe = TestBed.inject(DatePipe);
    const formatted = datePipe.transform(
      '2024-01-15T12:00:00+01:00',
      'longDate',
      'Europe/Berlin',
      'de-DE',
    );

    expect(locale).toBe('de-DE');
    expect(formatted).toContain('Januar');
    expect(formatted).toContain('2024');
  });

  it('should expose the configured timezone token', () => {
    const timezone = TestBed.inject(APP_TIMEZONE);
    expect(timezone).toBe('Europe/Berlin');
  });
});
