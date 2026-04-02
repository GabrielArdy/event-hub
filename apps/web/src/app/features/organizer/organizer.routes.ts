import { Routes } from '@angular/router';

// TODO: Implement organizer dashboard pages
export const organizerRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.OrgDashboardComponent),
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./pages/event-list/event-list.component').then((m) => m.OrgEventListComponent),
  },
  {
    path: 'events/new',
    loadComponent: () =>
      import('./pages/event-form/event-form.component').then((m) => m.EventFormComponent),
  },
  {
    path: 'events/:event_id/edit',
    loadComponent: () =>
      import('./pages/event-form/event-form.component').then((m) => m.EventFormComponent),
  },
  {
    path: 'events/:event_id/dashboard',
    loadComponent: () =>
      import('./pages/event-dashboard/event-dashboard.component').then(
        (m) => m.EventDashboardComponent,
      ),
  },
  {
    path: 'events/:event_id/report',
    loadComponent: () =>
      import('./pages/event-report/event-report.component').then((m) => m.EventReportComponent),
  },
];
