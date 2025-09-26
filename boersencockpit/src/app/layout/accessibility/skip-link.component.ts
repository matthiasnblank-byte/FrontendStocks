import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-skip-link',
  standalone: true,
  templateUrl: './skip-link.component.html',
  styleUrl: './skip-link.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipLinkComponent {}
