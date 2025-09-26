import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IsActiveMatchOptions, Params, RouterLink, RouterLinkActive } from '@angular/router';

type RouterCommands = string | unknown[] | null | undefined;

const DEFAULT_ACTIVE_OPTIONS: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

@Component({
  selector: 'app-link',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-link.component.html',
  styleUrl: './app-link.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLinkComponent {
  @Input() routerLink: RouterCommands = null;
  @Input() queryParams: Params | null | undefined = undefined;
  @Input() fragment: string | null | undefined = undefined;
  @Input() routerLinkActiveOptions: IsActiveMatchOptions = DEFAULT_ACTIVE_OPTIONS;

  @Output() readonly activated = new EventEmitter<void>();

  onActivate(): void {
    this.activated.emit();
  }
}
