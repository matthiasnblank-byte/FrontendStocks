import { Routes } from '@angular/router';

import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'portfolio',
      },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('./features/portfolio/pages/portfolio-overview.page').then((m) => m.PortfolioOverviewPageComponent),
      },
      {
        path: 'stocks',
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./features/stocks/pages/stocks-list.page').then((m) => m.StocksListPageComponent),
          },
          {
            path: 'add',
            loadComponent: () =>
              import('./features/stocks/pages/stock-add.page').then((m) => m.StockAddPageComponent),
          },
          {
            path: ':symbol',
            loadComponent: () =>
              import('./features/stocks/pages/stock-detail.page').then((m) => m.StockDetailPageComponent),
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'portfolio',
  },
];
