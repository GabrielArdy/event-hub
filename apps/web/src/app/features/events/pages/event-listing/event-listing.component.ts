import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO: Implement event listing page
// - Filter by category, city, date range, price
// - Pagination
// - Connect to EventsStore (NgRx SignalStore)
// - Uses EventsApiService.getEvents()

@Component({
  selector: 'app-event-listing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-listing-page">
      <!-- TODO: Search/filter bar -->
      <!-- TODO: Event card grid -->
      <!-- TODO: Pagination -->
      <p>Event Listing — TODO</p>
    </div>
  `,
})
export class EventListingComponent {}
