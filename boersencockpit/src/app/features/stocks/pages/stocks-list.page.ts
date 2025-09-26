import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stocks-list-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stocks-list.page.html',
  styleUrl: './stocks-list.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StocksListPageComponent {}
