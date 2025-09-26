import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { AppLinkComponent } from '../../shared/components/app-link.component';
import { RovingTabindexDirective, RovingTabindexItemDirective } from '../accessibility/roving-tabindex.directive';
import { SidenavItemComponent } from './sidenav-item.component';
import { SidenavSectionComponent } from './sidenav-section.component';

export interface SidenavItem {
  readonly label: string;
  readonly route: string;
  readonly description?: string;
  readonly level?: number;
  readonly disabled?: boolean;
}

export interface SidenavSection {
  readonly id: string;
  readonly label: string;
  readonly items: readonly SidenavItem[];
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [NgFor, NgIf, AppLinkComponent, RovingTabindexDirective, RovingTabindexItemDirective, SidenavSectionComponent, SidenavItemComponent],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavComponent {
  @Input() headingId = 'sidenav-heading';

  @Output() readonly navigate = new EventEmitter<void>();

  readonly sections: readonly SidenavSection[] = [
    {
      id: 'stocks',
      label: 'Aktien',
      items: [
        {
          label: 'Überblick',
          description: 'Alle beobachteten Aktien',
          route: '/stocks',
          level: 2,
        },
        {
          label: 'Aktie hinzufügen',
          description: 'Neuen Wert dem Portfolio hinzufügen',
          route: '/stocks/add',
          level: 2,
        },
      ],
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      items: [
        {
          label: 'Gesamtübersicht',
          description: 'Portfolio-Übersicht (Gesamtchart)',
          route: '/portfolio',
          level: 2,
        },
      ],
    },
  ];

  trackBySectionId(_: number, section: SidenavSection): string {
    return section.id;
  }

  trackByItemRoute(_: number, item: SidenavItem): string {
    return item.route;
  }

  handleNavigate(): void {
    this.navigate.emit();
  }
}
