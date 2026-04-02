import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
// TODO: inject AuthStore when implemented

export const roleGuard =
  (requiredRole: string): CanActivateFn =>
  () => {
    const router = inject(Router);
    // TODO: check AuthStore.user()?.role === requiredRole
    // Placeholder: always allow during scaffold
    return true;
  };
