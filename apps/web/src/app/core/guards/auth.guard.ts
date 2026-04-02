import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
// TODO: inject AuthStore when implemented
// import { AuthStore } from '../../features/auth/store/auth.store';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  // TODO: check AuthStore.isAuthenticated()
  // const authStore = inject(AuthStore);
  // if (!authStore.isAuthenticated()) {
  //   router.navigate(['/auth/login']);
  //   return false;
  // }
  // return true;

  // Placeholder: always allow during scaffold
  return true;
};
