import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
// TODO: inject AuthStore and AuthApiService when implemented
// import { AuthStore } from '../../features/auth/store/auth.store';
// import { AuthApiService } from '../../features/auth/services/auth-api.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // TODO: inject token from AuthStore signal and attach to header
  // const authStore = inject(AuthStore);
  // const token = authStore.accessToken();
  const token: string | null = null; // placeholder

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401) {
        // TODO: attempt refresh token, then retry; on failure navigate to /auth/login
        inject(Router).navigate(['/auth/login']);
      }
      return throwError(() => err);
    }),
  );
};
