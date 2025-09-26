import { AfterContentInit, ContentChildren, Directive, ElementRef, HostListener, Input, OnDestroy, QueryList, Renderer2, inject } from '@angular/core';

@Directive({
  selector: '[appRovingTabindexItem]',
  standalone: true,
})
export class RovingTabindexItemDirective {
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  @Input('appRovingTabindexItemDisabled')
  set disabled(value: boolean) {
    this.isDisabled = value;
    this.updateTabIndex();
  }
  get disabled(): boolean {
    return this.isDisabled;
  }

  private isDisabled = false;
  private tabbable = false;

  constructor() {
    this.renderer.setAttribute(this.elementRef.nativeElement, 'tabindex', '-1');
  }

  setTabbable(isTabbable: boolean): void {
    this.tabbable = isTabbable && !this.disabled;
    this.updateTabIndex();
  }

  focus(): void {
    if (!this.disabled) {
      this.elementRef.nativeElement.focus();
    }
  }

  click(): void {
    if (!this.disabled) {
      this.elementRef.nativeElement.click();
    }
  }

  private updateTabIndex(): void {
    const tabIndex = this.tabbable ? '0' : '-1';
    this.renderer.setAttribute(this.elementRef.nativeElement, 'tabindex', tabIndex);
    this.renderer.setAttribute(this.elementRef.nativeElement, 'aria-disabled', this.disabled ? 'true' : 'false');
  }
}

@Directive({
  selector: '[appRovingTabindex]',
  standalone: true,
})
export class RovingTabindexDirective implements AfterContentInit, OnDestroy {
  @ContentChildren(RovingTabindexItemDirective, { descendants: true })
  private readonly rovingItems!: QueryList<RovingTabindexItemDirective>;

  @Input('appRovingTabindex')
  set initialActiveIndex(value: number | null) {
    if (typeof value === 'number') {
      this.activeIndex = value;
      this.updateTabStops();
    }
  }

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private activeIndex = 0;
  private mutationObserver: MutationObserver | null = null;
  private readonly hostElement: HTMLElement = this.elementRef.nativeElement;

  ngAfterContentInit(): void {
    this.updateTabStops();
    this.rovingItems.changes.subscribe(() => this.updateTabStops());
    this.mutationObserver = new MutationObserver(() => this.updateTabStops());
    this.mutationObserver.observe(this.hostElement, { childList: true, subtree: true });
  }

  ngOnDestroy(): void {
    this.mutationObserver?.disconnect();
  }

  @HostListener('focusin', ['$event'])
  onFocusIn(event: FocusEvent): void {
    const targetIndex = this.rovingItems.toArray().findIndex((item) => item.elementRef.nativeElement === event.target);
    if (targetIndex >= 0) {
      this.activeIndex = targetIndex;
      this.updateTabStops();
    } else if (event.target === this.hostElement) {
      this.focusActiveItem();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const items = this.rovingItems.toArray();
    if (items.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        this.setActiveIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const current = items[this.activeIndex];
        current?.click();
        break;
      }
      default:
        break;
    }
  }

  private move(delta: number): void {
    const items = this.rovingItems.toArray();
    if (items.length === 0) {
      return;
    }

    let nextIndex = this.activeIndex;
    let iterations = 0;

    do {
      nextIndex = (nextIndex + delta + items.length) % items.length;
      iterations++;
      if (iterations > items.length) {
        return;
      }
    } while (items[nextIndex]?.disabled);

    this.setActiveIndex(nextIndex);
  }

  private setActiveIndex(index: number): void {
    const items = this.rovingItems.toArray();
    if (!items[index]) {
      return;
    }

    this.activeIndex = index;
    this.updateTabStops();
    this.focusActiveItem();
  }

  private updateTabStops(): void {
    const items = this.rovingItems.toArray();
    if (items.length === 0) {
      return;
    }

    if (!items[this.activeIndex] || items[this.activeIndex]?.disabled) {
      const firstEnabledIndex = items.findIndex((item) => !item.disabled);
      this.activeIndex = firstEnabledIndex >= 0 ? firstEnabledIndex : 0;
    }

    items.forEach((item, index) => item.setTabbable(index === this.activeIndex));
  }

  private focusActiveItem(): void {
    const items = this.rovingItems.toArray();
    const activeItem = items[this.activeIndex];
    activeItem?.focus();
  }
}
