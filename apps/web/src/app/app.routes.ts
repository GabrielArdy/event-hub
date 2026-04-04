import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/events/events.routes').then((m) => m.eventsRoutes),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'organizer',
    canActivate: [authGuard, roleGuard('ORGANIZER')],
    loadChildren: () =>
      import('./features/organizer/organizer.routes').then((m) => m.organizerRoutes),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadChildren: () => import('./features/checkout/checkout.routes').then((m) => m.checkoutRoutes),
  },
  {
    path: 'me',
    canActivate: [authGuard],
    loadChildren: () => import('./features/account/account.routes').then((m) => m.accountRoutes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
