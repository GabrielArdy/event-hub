import { Routes } from '@angular/router';

// TODO: Implement checkout flow
export const checkoutRoutes: Routes = [
  {
    path: ':order_id',
    loadComponent: () =>
      import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: ':order_id/success',
    loadComponent: () =>
      import('./pages/checkout-success/checkout-success.component').then(
        (m) => m.CheckoutSuccessComponent,
      ),
  },
];
