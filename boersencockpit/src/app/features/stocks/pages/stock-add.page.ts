import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-add-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-add.page.html',
  styleUrl: './stock-add.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAddPageComponent {}
