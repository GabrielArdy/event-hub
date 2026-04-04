import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { EventSummary, EventDetail } from '@eventhub/shared-types';
import {
  OrganizerApiService,
  CreateEventPayload,
  EventLiveStats,
  EventReport,
} from '../services/organizer-api.service';

interface OrganizerState {
  events: EventSummary[];
  selectedEvent: EventDetail | null;
  liveStats: EventLiveStats | null;
  report: EventReport | null;
  draftEventId: string | null;
  currentStep: number;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  publishSuccess: boolean;
}

export const OrganizerStore = signalStore(
  { providedIn: 'root' },
  withState<OrganizerState>({
    events: [],
    selectedEvent: null,
    liveStats: null,
    report: null,
    draftEventId: null,
    currentStep: 0,
    isLoading: false,
    isSaving: false,
    error: null,
    publishSuccess: false,
  }),

  withMethods((store) => {
    const orgApi = inject(OrganizerApiService);
    const router = inject(Router);

    return {
      clearError() {
        patchState(store, { error: null });
      },
      setStep(step: number) {
        patchState(store, { currentStep: step });
      },

      loadEvents: rxMethod<string | undefined>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap((status) =>
            orgApi.getMyEvents(status).pipe(
              tap((events) => patchState(store, { events, isLoading: false })),
              catchError((err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.error?.error?.code || 'LOAD_FAILED',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      loadEventDetail: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isLoading: true, selectedEvent: null, error: null })),
          switchMap((eventId) =>
            orgApi.getEventDetail(eventId).pipe(
              tap((event) => patchState(store, { selectedEvent: event, isLoading: false })),
              catchError((err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.error?.error?.code || 'LOAD_FAILED',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      createEvent: rxMethod<CreateEventPayload>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: null })),
          switchMap((payload) =>
            orgApi.createEvent(payload).pipe(
              tap((event) => {
                patchState(store, {
                  selectedEvent: event,
                  draftEventId: event.event_id,
                  isSaving: false,
                  currentStep: 1,
                });
              }),
              catchError((err) => {
                patchState(store, {
                  isSaving: false,
                  error: err.error?.error?.code || 'CREATE_FAILED',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      updateEvent: rxMethod<{ eventId: string; payload: Partial<CreateEventPayload> }>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: null })),
          switchMap(({ eventId, payload }) =>
            orgApi.updateEvent(eventId, payload).pipe(
              tap((event) => patchState(store, { selectedEvent: event, isSaving: false })),
              catchError((err) => {
                patchState(store, {
                  isSaving: false,
                  error: err.error?.error?.code || 'UPDATE_FAILED',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      publishEvent: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: null, publishSuccess: false })),
          switchMap((eventId) =>
            orgApi.publishEvent(eventId).pipe(
              tap((event) => {
                patchState(store, { selectedEvent: event, isSaving: false, publishSuccess: true });
                setTimeout(() => router.navigate(['/organizer/events']), 1500);
              }),
              catchError((err) => {
                patchState(store, {
                  isSaving: false,
                  error: err.error?.error?.code || 'PUBLISH_FAILED',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      loadLiveStats: rxMethod<string>(
        pipe(
          switchMap((eventId) =>
            orgApi.getLiveStats(eventId).pipe(
              tap((stats) => patchState(store, { liveStats: stats })),
              catchError(() => of(null)),
            ),
          ),
        ),
      ),

      loadReport: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isLoading: true })),
          switchMap((eventId) =>
            orgApi.getReport(eventId).pipe(
              tap((report) => patchState(store, { report, isLoading: false })),
              catchError((err) => {
                patchState(store, { isLoading: false, error: err.message });
                return of(null);
              }),
            ),
          ),
        ),
      ),
    };
  }),
);
