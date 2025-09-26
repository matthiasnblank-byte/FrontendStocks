import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { SidenavItem } from './sidenav.component';
import { SidenavItemComponent } from './sidenav-item.component';

export interface SidenavSectionViewModel {
  readonly label: string;
  readonly items: readonly SidenavItem[];
}

@Component({
  selector: 'app-sidenav-section',
  standalone: true,
  imports: [NgFor, SidenavItemComponent],
  templateUrl: './sidenav-section.component.html',
  styleUrl: './sidenav-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavSectionComponent {
  @Input({ required: true }) section!: SidenavSectionViewModel;

  @Output() readonly navigate = new EventEmitter<void>();

  trackByItem(_: number, item: SidenavItem): string {
    return item.route;
  }

  handleNavigate(): void {
    this.navigate.emit();
  }
}
