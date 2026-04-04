import { Routes } from '@angular/router';

export const checkoutRoutes: Routes = [
  {
    path: ':event_id',
    loadComponent: () =>
      import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'success/:order_id',
    loadComponent: () =>
      import('./pages/checkout-success/checkout-success.component').then(
        (m) => m.CheckoutSuccessComponent,
      ),
  },
  {
    path: 'pending/:order_id',
    loadComponent: () =>
      import('./pages/checkout-pending/checkout-pending.component').then(
        (m) => m.CheckoutPendingComponent,
      ),
  },
];
