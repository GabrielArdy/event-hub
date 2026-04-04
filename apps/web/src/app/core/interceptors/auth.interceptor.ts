import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { Router } from '@angular/router';
import { AuthStore } from '../../features/auth/store/auth.store';
import { AuthApiService } from '../../features/auth/services/auth-api.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authStore = inject(AuthStore);
  const authApi = inject(AuthApiService);
  const router = inject(Router);
  const token = authStore.accessToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshSubject.next(null);
          return authApi.refreshToken().pipe(
            switchMap((result) => {
              isRefreshing = false;
              const user = authStore.user();
              if (user) authStore.setTokens(result.access_token, user);
              refreshSubject.next(result.access_token);
              const retried = req.clone({
                setHeaders: { Authorization: `Bearer ${result.access_token}` },
              });
              return next(retried);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              authStore.logout();
              return throwError(() => refreshErr);
            }),
          );
        } else {
          return refreshSubject.pipe(
            filter((t) => t !== null),
            take(1),
            switchMap((newToken) => {
              const retried = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              });
              return next(retried);
            }),
          );
        }
      }
      return throwError(() => err);
    }),
  );
};
