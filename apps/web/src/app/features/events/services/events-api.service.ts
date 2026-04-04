import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, EventSummary, EventDetail, PaginationMeta } from '@eventhub/shared-types';
import { environment } from '../../../../../environments/environment';

export interface EventFilters {
  category?: string;
  city?: string;
  date_from?: string;
  date_to?: string;
  price_min?: number;
  price_max?: number;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface PaginatedEvents {
  events: (EventSummary & { is_wishlisted?: boolean; sold_percentage?: number })[];
  meta: PaginationMeta;
}

@Injectable({ providedIn: 'root' })
export class EventsApiService {
  private readonly http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/tickets`;

  getEvents(filters: EventFilters = {}): Observable<PaginatedEvents> {
    const params = new HttpParams({ fromObject: filters as Record<string, string> });
    return this.http
      .get<ApiResponse<EventSummary[]>>(`${this.BASE}/events`, { params })
      .pipe(
        map((res) => ({
          events: (res.data as any[]) ?? [],
          meta: res.meta ?? { page: 1, per_page: 12, total: 0, total_pages: 1 },
        })),
      );
  }

  getEventDetail(eventId: string): Observable<EventDetail & { is_wishlisted: boolean; sold_percentage: number }> {
    return this.http
      .get<ApiResponse<EventDetail>>(`${this.BASE}/events/${eventId}`)
      .pipe(map((res) => res.data as any));
  }

  getSeatMap(eventId: string): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.BASE}/events/${eventId}/seat-map`)
      .pipe(map((res) => res.data));
  }

  toggleWishlist(eventId: string): Observable<{ is_wishlisted: boolean }> {
    return this.http
      .post<ApiResponse<{ is_wishlisted: boolean }>>(`${this.BASE}/events/${eventId}/wishlist`, {})
      .pipe(map((res) => res.data));
  }

  getWishlist(): Observable<EventSummary[]> {
    return this.http
      .get<ApiResponse<EventSummary[]>>(`${this.BASE}/me/wishlist`)
      .pipe(map((res) => res.data));
  }
}
