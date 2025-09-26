import { BrowserModule } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusTrapDirective } from './focus-trap.directive';

@Component({
  template: `
    <button id="before" type="button">Außerhalb</button>
    <div appFocusTrap [appFocusTrap]="enabled">
      <button id="first" type="button">Erstes Element</button>
      <button id="second" type="button">Zweites Element</button>
    </div>
    <button id="after" type="button">Nachher</button>
  `,
})
class FocusTrapHostComponent {
  enabled = false;
}

describe('FocusTrapDirective', () => {
  let fixture: ComponentFixture<FocusTrapHostComponent>;
  let hostComponent: FocusTrapHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserModule, FocusTrapDirective],
      declarations: [FocusTrapHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FocusTrapHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('focuses the first element when activated', async () => {
    const before = fixture.nativeElement.querySelector('#before') as HTMLButtonElement;
    before.focus();
    hostComponent.enabled = true;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#first'));
  });

  it('loops focus within the trap', async () => {
    hostComponent.enabled = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const second = fixture.nativeElement.querySelector('#second') as HTMLButtonElement;
    second.focus();

    const container = fixture.nativeElement.querySelector('[appfocustrap]') as HTMLElement;
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#first'));
  });

  it('restores focus to the previously focused element when deactivated', async () => {
    const before = fixture.nativeElement.querySelector('#before') as HTMLButtonElement;
    before.focus();
    hostComponent.enabled = true;
    fixture.detectChanges();
    await fixture.whenStable();

    hostComponent.enabled = false;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(before);
  });
});
