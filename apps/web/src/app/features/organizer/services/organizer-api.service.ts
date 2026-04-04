import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, EventSummary, EventDetail, TicketTypeSummary } from '@eventhub/shared-types';
import { environment } from '../../../../../environments/environment';

export interface CreateEventPayload {
  title: string;
  category: string;
  description: string;
  banner_url?: string;
  venue_type: 'PHYSICAL' | 'ONLINE';
  venue_name?: string;
  venue_address?: string;
  venue_city?: string;
  venue_lat?: number;
  venue_lng?: number;
  online_url?: string;
  start_at: string;
  end_at: string;
  max_capacity?: number;
  tags?: string[];
}

export interface CreateTicketTypePayload {
  name: string;
  description?: string;
  price_idr: number;
  quota: number;
  max_per_user: number;
  sale_start_at: string;
  sale_end_at: string;
}

export interface EventLiveStats {
  checkin_count: number;
  ticket_sold: number;
  total_quota: number;
  revenue_gross_idr: number;
  capacity_pct: number;
  recent_activity: ActivityFeedItem[];
}

export interface ActivityFeedItem {
  type: 'CHECKIN' | 'TICKET_SOLD' | 'REFUND';
  message: string;
  timestamp: string;
}

export interface EventReport {
  revenue_gross_idr: number;
  revenue_net_idr: number;
  platform_fee_idr: number;
  ticket_sold: number;
  checkin_count: number;
  sales_by_type: { ticket_type: string; sold: number; revenue_idr: number }[];
  sales_timeline: { date: string; count: number; revenue_idr: number }[];
}

@Injectable({ providedIn: 'root' })
export class OrganizerApiService {
  private readonly http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/organizer`;

  getMyEvents(status?: string): Observable<EventSummary[]> {
    const params = status ? new HttpParams({ fromObject: { status } }) : {};
    return this.http
      .get<ApiResponse<EventSummary[]>>(`${this.BASE}/events`, { params })
      .pipe(map((res) => res.data));
  }

  getEventDetail(eventId: string): Observable<EventDetail> {
    return this.http
      .get<ApiResponse<EventDetail>>(`${this.BASE}/events/${eventId}`)
      .pipe(map((res) => res.data));
  }

  createEvent(payload: CreateEventPayload): Observable<EventDetail> {
    return this.http
      .post<ApiResponse<EventDetail>>(`${this.BASE}/events`, payload)
      .pipe(map((res) => res.data));
  }

  updateEvent(eventId: string, payload: Partial<CreateEventPayload>): Observable<EventDetail> {
    return this.http
      .patch<ApiResponse<EventDetail>>(`${this.BASE}/events/${eventId}`, payload)
      .pipe(map((res) => res.data));
  }

  publishEvent(eventId: string): Observable<EventDetail> {
    return this.http
      .post<ApiResponse<EventDetail>>(`${this.BASE}/events/${eventId}/publish`, {})
      .pipe(map((res) => res.data));
  }

  cancelEvent(eventId: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.BASE}/events/${eventId}/cancel`, {})
      .pipe(map(() => undefined));
  }

  getTicketTypes(eventId: string): Observable<TicketTypeSummary[]> {
    return this.http
      .get<ApiResponse<TicketTypeSummary[]>>(`${this.BASE}/events/${eventId}/ticket-types`)
      .pipe(map((res) => res.data));
  }

  createTicketType(eventId: string, payload: CreateTicketTypePayload): Observable<TicketTypeSummary> {
    return this.http
      .post<ApiResponse<TicketTypeSummary>>(`${this.BASE}/events/${eventId}/ticket-types`, payload)
      .pipe(map((res) => res.data));
  }

  updateTicketType(eventId: string, ticketTypeId: string, payload: Partial<CreateTicketTypePayload>): Observable<TicketTypeSummary> {
    return this.http
      .patch<ApiResponse<TicketTypeSummary>>(`${this.BASE}/events/${eventId}/ticket-types/${ticketTypeId}`, payload)
      .pipe(map((res) => res.data));
  }

  deleteTicketType(eventId: string, ticketTypeId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.BASE}/events/${eventId}/ticket-types/${ticketTypeId}`)
      .pipe(map(() => undefined));
  }

  getLiveStats(eventId: string): Observable<EventLiveStats> {
    return this.http
      .get<ApiResponse<EventLiveStats>>(`${this.BASE}/events/${eventId}/live-stats`)
      .pipe(map((res) => res.data));
  }

  getReport(eventId: string): Observable<EventReport> {
    return this.http
      .get<ApiResponse<EventReport>>(`${this.BASE}/events/${eventId}/report`)
      .pipe(map((res) => res.data));
  }

  validateTicket(ticketId: string): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${environment.apiUrl}/tickets/${ticketId}/validate`, {})
      .pipe(map((res) => res.data));
  }
}
