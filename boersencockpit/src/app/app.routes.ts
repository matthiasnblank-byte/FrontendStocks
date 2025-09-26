import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'portfolio',
  },
  {
    path: 'portfolio',
    loadComponent: () =>
      import('./features/portfolio/portfolio.component').then((m) => m.PortfolioComponent),
  },
  {
    path: 'stocks',
    loadComponent: () =>
      import('./features/stocks/stocks.component').then((m) => m.StocksComponent),
  },
  {
    path: '**',
    redirectTo: 'portfolio',
  },
];
