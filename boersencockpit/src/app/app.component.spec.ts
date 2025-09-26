import { registerLocaleData } from '@angular/common';
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
        { provide: APP_TIMEZONE, useValue: 'Europe/Berlin' },
        { provide: LOCALE_ID, useValue: 'de-DE' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it('should create the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose the configured timezone token', () => {
    const timezone = TestBed.inject(APP_TIMEZONE);
    expect(timezone).toBe('Europe/Berlin');
  });

  it('should use the configured locale and currency defaults', () => {
    expect(TestBed.inject(LOCALE_ID)).toBe('de-DE');
    expect(TestBed.inject(DEFAULT_CURRENCY_CODE)).toBe('EUR');
  });
});
