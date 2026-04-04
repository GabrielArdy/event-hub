import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, UserProfile } from '@eventhub/shared-types';
import { environment } from '../../../../../environments/environment';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  role: 'END_USER' | 'ORGANIZER';
}

export interface LoginResult {
  access_token: string;
  user: UserProfile;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/auth`;

  login(payload: LoginPayload): Observable<LoginResult> {
    return this.http
      .post<ApiResponse<LoginResult>>(`${this.BASE}/login`, payload)
      .pipe(map((res) => res.data));
  }

  register(payload: RegisterPayload): Observable<{ user_id: string; email: string }> {
    return this.http
      .post<ApiResponse<{ user_id: string; email: string }>>(`${this.BASE}/register`, payload)
      .pipe(map((res) => res.data));
  }

  forgotPassword(email: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.BASE}/forgot-password`, { email })
      .pipe(map(() => undefined));
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.BASE}/reset-password`, { token, new_password: newPassword })
      .pipe(map(() => undefined));
  }

  verifyEmail(token: string): Observable<void> {
    return this.http
      .get<ApiResponse<void>>(`${this.BASE}/verify-email`, { params: { token } })
      .pipe(map(() => undefined));
  }

  resendVerification(): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.BASE}/resend-verification`, {})
      .pipe(map(() => undefined));
  }

  refreshToken(): Observable<{ access_token: string }> {
    return this.http
      .post<ApiResponse<{ access_token: string }>>(`${this.BASE}/refresh-token`, {})
      .pipe(map((res) => res.data));
  }

  getMe(): Observable<UserProfile> {
    return this.http
      .get<ApiResponse<UserProfile>>(`${this.BASE}/me`)
      .pipe(map((res) => res.data));
  }
}
