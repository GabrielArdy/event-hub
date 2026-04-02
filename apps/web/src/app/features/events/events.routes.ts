import { Routes } from '@angular/router';

// TODO: Implement event pages
export const eventsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/event-listing/event-listing.component').then(
        (m) => m.EventListingComponent,
      ),
  },
  {
    path: 'events/:event_id',
    loadComponent: () =>
      import('./pages/event-detail/event-detail.component').then((m) => m.EventDetailComponent),
  },
];
