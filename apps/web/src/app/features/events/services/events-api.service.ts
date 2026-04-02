import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

// TODO: Implement all API calls for events feature

@Injectable({ providedIn: 'root' })
export class EventsApiService {
  private readonly http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/tickets`;

  // TODO: implement getEvents(filters)
  // TODO: implement getEventDetail(eventId)
  // TODO: implement getSeatMap(eventId)
  // TODO: implement toggleWishlist(eventId)
  // TODO: implement getWishlist()
}
