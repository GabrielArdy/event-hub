import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../features/auth/store/auth.store';

export const roleGuard =
  (requiredRole: string): CanActivateFn =>
  () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);
    if (authStore.user()?.role !== requiredRole) {
      router.navigate(['/']);
      return false;
    }
    return true;
  };
