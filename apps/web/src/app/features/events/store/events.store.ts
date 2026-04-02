import { signalStore, withState, withMethods, withComputed } from '@ngrx/signals';
import { computed } from '@angular/core';

// TODO: Implement NgRx SignalStore for events
// State: events[], selectedEvent, isLoading, filters, pagination

interface EventsState {
  events: any[];
  selectedEvent: any | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  events: [],
  selectedEvent: null,
  isLoading: false,
  error: null,
};

export const EventsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ events }) => ({
    hasEvents: computed(() => events().length > 0),
  })),
  withMethods(() => ({
    // TODO: loadEvents(filters)
    // TODO: loadEventDetail(eventId)
  })),
);
