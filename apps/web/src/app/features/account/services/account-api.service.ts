import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  UserProfile,
  TicketInfo,
  OrderSummary,
  EventSummary,
} from '@eventhub/shared-types';
import { environment } from '../../../../environments/environment.prod';

export interface UpdateProfilePayload {
  full_name?: string;
  avatar_url?: string;
}

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly http = inject(HttpClient);
  private readonly AUTH_BASE = `${environment.apiUrl}/auth`;
  private readonly TICKETS_BASE = `${environment.apiUrl}/tickets`;

  getMyTickets(status?: string): Observable<TicketInfo[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http
      .get<ApiResponse<TicketInfo[]>>(`${this.TICKETS_BASE}/me/tickets`, { params })
      .pipe(map((res) => res.data));
  }

  getTicketDetail(ticketId: string): Observable<TicketInfo> {
    return this.http
      .get<ApiResponse<TicketInfo>>(`${this.TICKETS_BASE}/me/tickets/${ticketId}`)
      .pipe(map((res) => res.data));
  }

  getMyOrders(): Observable<OrderSummary[]> {
    return this.http
      .get<ApiResponse<OrderSummary[]>>(`${this.TICKETS_BASE}/me/orders`)
      .pipe(map((res) => res.data));
  }

  getWishlist(): Observable<EventSummary[]> {
    return this.http
      .get<ApiResponse<EventSummary[]>>(`${this.TICKETS_BASE}/me/wishlist`)
      .pipe(map((res) => res.data));
  }

  removeFromWishlist(eventId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.TICKETS_BASE}/events/${eventId}/wishlist`)
      .pipe(map(() => undefined));
  }

  updateProfile(payload: UpdateProfilePayload): Observable<UserProfile> {
    return this.http
      .patch<ApiResponse<UserProfile>>(`${this.AUTH_BASE}/me`, payload)
      .pipe(map((res) => res.data));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<
        ApiResponse<void>
      >(`${this.AUTH_BASE}/change-password`, { current_password: currentPassword, new_password: newPassword })
      .pipe(map(() => undefined));
  }
}
