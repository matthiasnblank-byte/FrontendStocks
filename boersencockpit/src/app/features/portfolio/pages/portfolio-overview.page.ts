import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-portfolio-overview-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-overview.page.html',
  styleUrl: './portfolio-overview.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioOverviewPageComponent {}
