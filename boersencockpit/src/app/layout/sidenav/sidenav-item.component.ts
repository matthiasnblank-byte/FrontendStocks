import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { AppLinkComponent } from '../../shared/components/app-link.component';
import { RovingTabindexItemDirective } from '../accessibility/roving-tabindex.directive';
import { SidenavItem } from './sidenav.component';

@Component({
  selector: 'app-sidenav-item',
  standalone: true,
  imports: [AppLinkComponent, NgIf, RovingTabindexItemDirective],
  templateUrl: './sidenav-item.component.html',
  styleUrl: './sidenav-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavItemComponent {
  @Input({ required: true }) item!: SidenavItem;

  @Output() readonly activate = new EventEmitter<void>();

  onActivate(): void {
    if (!this.item.disabled) {
      this.activate.emit();
    }
  }
}
