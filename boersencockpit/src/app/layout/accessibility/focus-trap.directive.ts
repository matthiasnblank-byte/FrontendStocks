import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, HostListener, Input, OnDestroy, inject } from '@angular/core';

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Directive({
  selector: '[appFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective implements AfterViewInit, OnDestroy {
  @Input('appFocusTrap')
  set enabled(value: boolean) {
    if (value) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT, { optional: true });

  private isActive = false;
  private previouslyFocusedElement: HTMLElement | null = null;

  ngAfterViewInit(): void {
    if (this.isActive) {
      this.focusFirstElement();
    }
  }

  ngOnDestroy(): void {
    this.deactivate();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.isActive || event.key !== 'Tab') {
      return;
    }

    const focusable = this.getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = this.document?.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private activate(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.previouslyFocusedElement = this.document?.activeElement as HTMLElement | null;
    queueMicrotask(() => this.focusFirstElement());
  }

  private deactivate(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    const focusTarget = this.previouslyFocusedElement;
    this.previouslyFocusedElement = null;
    focusTarget?.focus();
  }

  private focusFirstElement(): void {
    if (!this.isActive) {
      return;
    }

    const focusable = this.getFocusableElements();
    const target = focusable[0] ?? this.elementRef.nativeElement;
    target.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    const root = this.elementRef.nativeElement;
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => !el.hasAttribute('disabled'));
  }
}
