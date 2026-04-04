import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { pipe, tap, switchMap, catchError, of, EMPTY } from 'rxjs';
import { UserProfile } from '@eventhub/shared-types';
import { AuthApiService, LoginPayload, RegisterPayload } from '../services/auth-api.service';

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  lockoutExpiresAt: number | null;
  registerSuccess: boolean;
  forgotPasswordSent: boolean;
  resetPasswordSuccess: boolean;
}

const STORAGE_KEY_TOKEN = 'eh_access_token';
const STORAGE_KEY_USER = 'eh_user';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,
  lockoutExpiresAt: null,
  registerSuccess: false,
  forgotPasswordSent: false,
  resetPasswordSuccess: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ user, accessToken }) => ({
    isLoggedIn: computed(() => !!accessToken() && !!user()),
    isOrganizer: computed(() => user()?.role === 'ORGANIZER'),
    isVerified: computed(() => user()?.is_verified ?? false),
  })),

  withMethods((store) => {
    const authApi = inject(AuthApiService);
    const router = inject(Router);

    return {
      loadFromStorage() {
        const token = localStorage.getItem(STORAGE_KEY_TOKEN);
        const userRaw = localStorage.getItem(STORAGE_KEY_USER);
        if (token && userRaw) {
          try {
            const user = JSON.parse(userRaw) as UserProfile;
            patchState(store, { user, accessToken: token });
          } catch {
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_USER);
          }
        }
      },

      setTokens(accessToken: string, user: UserProfile) {
        localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        patchState(store, { accessToken, user });
      },

      logout() {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_USER);
        patchState(store, { ...initialState });
        router.navigate(['/auth/login']);
      },

      clearError() {
        patchState(store, { error: null });
      },

      login: rxMethod<LoginPayload>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap((payload) =>
            authApi.login(payload).pipe(
              tap((result) => {
                localStorage.setItem(STORAGE_KEY_TOKEN, result.access_token);
                localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(result.user));
                patchState(store, {
                  user: result.user,
                  accessToken: result.access_token,
                  isLoading: false,
                  error: null,
                });
                if (result.user.role === 'ORGANIZER') {
                  router.navigate(['/organizer']);
                } else {
                  router.navigate(['/']);
                }
              }),
              catchError((err) => {
                const errorCode = err.error?.error?.code || 'LOGIN_FAILED';
                const details = err.error?.error?.details as
                  | { field: string; message: string }[]
                  | undefined;
                const lockoutDetail = details?.find((d) => d.field === 'lockout_expires_at');
                patchState(store, {
                  isLoading: false,
                  error: errorCode,
                  lockoutExpiresAt: lockoutDetail
                    ? new Date(lockoutDetail.message).getTime()
                    : null,
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      register: rxMethod<RegisterPayload>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null, registerSuccess: false })),
          switchMap((payload) =>
            authApi.register(payload).pipe(
              tap(() => {
                patchState(store, { isLoading: false, registerSuccess: true });
              }),
              catchError((err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.error?.error?.code || 'REGISTER_FAILED',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      forgotPassword: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null, forgotPasswordSent: false })),
          switchMap((email) =>
            authApi.forgotPassword(email).pipe(
              tap(() => {
                patchState(store, { isLoading: false, forgotPasswordSent: true });
              }),
              catchError((err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.error?.error?.code || 'FORGOT_PASSWORD_FAILED',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      resetPassword: rxMethod<{ token: string; newPassword: string }>(
        pipe(
          tap(() =>
            patchState(store, { isLoading: true, error: null, resetPasswordSuccess: false }),
          ),
          switchMap(({ token, newPassword }) =>
            authApi.resetPassword(token, newPassword).pipe(
              tap(() => {
                patchState(store, { isLoading: false, resetPasswordSuccess: true });
              }),
              catchError((err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.error?.error?.code || 'RESET_PASSWORD_FAILED',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      resendVerification: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap(() =>
            authApi.resendVerification().pipe(
              tap(() => patchState(store, { isLoading: false })),
              catchError((err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.error?.error?.code || 'RESEND_FAILED',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),
    };
  }),
);
