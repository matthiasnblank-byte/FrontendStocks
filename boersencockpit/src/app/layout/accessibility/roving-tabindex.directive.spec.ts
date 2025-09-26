import { BrowserModule } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RovingTabindexDirective, RovingTabindexItemDirective } from './roving-tabindex.directive';

@Component({
  template: `
    <ul appRovingTabindex>
      <li role="none"><button id="item-1" appRovingTabindexItem type="button">Erster</button></li>
      <li role="none"><button id="item-2" appRovingTabindexItem type="button">Zweiter</button></li>
      <li role="none">
        <button
          id="item-3"
          appRovingTabindexItem
          type="button"
          [appRovingTabindexItemDisabled]="true"
        >
          Deaktiviert
        </button>
      </li>
      <li role="none"><button id="item-4" appRovingTabindexItem type="button">Letzter</button></li>
    </ul>
  `,
})
class RovingHostComponent {}

describe('RovingTabindexDirective', () => {
  let fixture: ComponentFixture<RovingHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserModule, RovingTabindexDirective, RovingTabindexItemDirective],
      declarations: [RovingHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RovingHostComponent);
    fixture.detectChanges();
  });

  it('sets the first enabled item tabbable', () => {
    const first = fixture.nativeElement.querySelector('#item-1') as HTMLButtonElement;
    const disabled = fixture.nativeElement.querySelector('#item-3') as HTMLButtonElement;

    expect(first.getAttribute('tabindex')).toBe('0');
    expect(disabled.getAttribute('tabindex')).toBe('-1');
  });

  it('navigates with arrow keys and skips disabled items', () => {
    const list = fixture.nativeElement.querySelector('ul') as HTMLElement;
    const first = fixture.nativeElement.querySelector('#item-1') as HTMLButtonElement;
    const second = fixture.nativeElement.querySelector('#item-2') as HTMLButtonElement;
    const last = fixture.nativeElement.querySelector('#item-4') as HTMLButtonElement;

    first.focus();
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(document.activeElement).toBe(second);

    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(document.activeElement).toBe(last);

    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(document.activeElement).toBe(second);
  });

  it('supports Home and End keys', () => {
    const list = fixture.nativeElement.querySelector('ul') as HTMLElement;
    const first = fixture.nativeElement.querySelector('#item-1') as HTMLButtonElement;
    const last = fixture.nativeElement.querySelector('#item-4') as HTMLButtonElement;

    last.focus();
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(document.activeElement).toBe(first);

    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(document.activeElement).toBe(last);
  });
});
