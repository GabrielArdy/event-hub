import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject, computed } from '@angular/core';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { EventSummary, EventDetail } from '@eventhub/shared-types';
import { EventsApiService, EventFilters, PaginatedEvents } from '../services/events-api.service';

type EventSummaryWithMeta = EventSummary & { is_wishlisted?: boolean; sold_percentage?: number };

interface EventsState {
  events: EventSummaryWithMeta[];
  selectedEvent: (EventDetail & { is_wishlisted: boolean; sold_percentage: number }) | null;
  seatMap: any | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  filters: EventFilters;
  currentPage: number;
  totalPages: number;
  total: number;
}

export const EventsStore = signalStore(
  { providedIn: 'root' },
  withState<EventsState>({
    events: [],
    selectedEvent: null,
    seatMap: null,
    isLoading: false,
    isDetailLoading: false,
    error: null,
    filters: {},
    currentPage: 1,
    totalPages: 1,
    total: 0,
  }),

  withComputed(({ events, filters }) => ({
    hasEvents: computed(() => events().length > 0),
    activeFiltersCount: computed(() =>
      Object.values(filters()).filter((v) => v !== undefined && v !== '' && v !== null).length,
    ),
  })),

  withMethods((store) => {
    const eventsApi = inject(EventsApiService);

    return {
      setFilters(filters: EventFilters) {
        patchState(store, { filters, currentPage: 1 });
      },

      clearFilters() {
        patchState(store, { filters: {}, currentPage: 1 });
      },

      loadEvents: rxMethod<EventFilters>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap((filters) =>
            eventsApi.getEvents({ ...filters, page: store.currentPage() }).pipe(
              tap((result: PaginatedEvents) => {
                patchState(store, {
                  events: result.events,
                  currentPage: result.meta.page,
                  totalPages: result.meta.total_pages,
                  total: result.meta.total,
                  isLoading: false,
                });
              }),
              catchError((err) => {
                patchState(store, { isLoading: false, error: err.message });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      loadEventDetail: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isDetailLoading: true, selectedEvent: null, seatMap: null, error: null })),
          switchMap((eventId) =>
            eventsApi.getEventDetail(eventId).pipe(
              tap((event) => {
                patchState(store, { selectedEvent: event, isDetailLoading: false });
              }),
              catchError((err) => {
                patchState(store, { isDetailLoading: false, error: err.error?.error?.code || 'LOAD_FAILED' });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      loadSeatMap: rxMethod<string>(
        pipe(
          switchMap((eventId) =>
            eventsApi.getSeatMap(eventId).pipe(
              tap((seatMap) => patchState(store, { seatMap })),
              catchError(() => of(null)),
            ),
          ),
        ),
      ),

      toggleWishlist(eventId: string) {
        // Optimistic update
        const currentEvents = store.events();
        const idx = currentEvents.findIndex((e) => e.event_id === eventId);
        if (idx !== -1) {
          const updated = [...currentEvents];
          updated[idx] = { ...updated[idx], is_wishlisted: !updated[idx].is_wishlisted };
          patchState(store, { events: updated });
        }

        const selectedEvent = store.selectedEvent();
        if (selectedEvent?.event_id === eventId) {
          patchState(store, {
            selectedEvent: { ...selectedEvent, is_wishlisted: !selectedEvent.is_wishlisted },
          });
        }

        eventsApi.toggleWishlist(eventId).subscribe({
          error: () => {
            // Rollback on error
            if (idx !== -1) {
              const rolled = [...store.events()];
              rolled[idx] = { ...rolled[idx], is_wishlisted: !rolled[idx].is_wishlisted };
              patchState(store, { events: rolled });
            }
          },
        });
      },

      setPage(page: number) {
        patchState(store, { currentPage: page });
      },
    };
  }),
);
