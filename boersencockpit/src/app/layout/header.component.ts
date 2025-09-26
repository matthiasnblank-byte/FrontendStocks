import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, AsyncPipe, NgIf],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  @Input() isSidenavOpen = false;

  @Output() readonly menuToggle = new EventEmitter<void>();

  readonly isDark$ = this.themeService.isDark$;

  constructor(private readonly themeService: ThemeService) {}

  toggleTheme(): void {
    this.themeService.toggle();
  }

  openMenu(): void {
    this.menuToggle.emit();
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        this.toggleTheme();
      }

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        this.openMenu();
      }
    }
  }
}
