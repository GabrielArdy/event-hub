import { Routes } from '@angular/router';

// TODO: Implement account/profile pages
export const accountRoutes: Routes = [
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'tickets',
    loadComponent: () =>
      import('./pages/my-tickets/my-tickets.component').then((m) => m.MyTicketsComponent),
  },
  {
    path: 'tickets/:ticket_id',
    loadComponent: () =>
      import('./pages/ticket-detail/ticket-detail.component').then((m) => m.TicketDetailComponent),
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./pages/transactions/transactions.component').then((m) => m.TransactionsComponent),
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./pages/wishlist/wishlist.component').then((m) => m.WishlistComponent),
  },
];
