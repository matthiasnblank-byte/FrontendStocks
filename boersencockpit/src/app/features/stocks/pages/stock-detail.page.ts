import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-stock-detail-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-detail.page.html',
  styleUrl: './stock-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockDetailPageComponent {
  readonly symbol$ = this.route.paramMap.pipe(map((params) => params.get('symbol') ?? 'Unbekannt'));

  constructor(private readonly route: ActivatedRoute) {}
}
