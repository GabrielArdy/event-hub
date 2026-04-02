import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO: Implement event detail page
// - Event info (title, description, venue, date)
// - Ticket type selector
// - Seat map (SeatMapComponent) or zone selector
// - Wishlist toggle
// - "Buy Now" button → navigate to /checkout

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-detail-page">
      <!-- TODO: Event header with banner -->
      <!-- TODO: Ticket type list -->
      <!-- TODO: SeatMapComponent (connect to WS /ws/seats/:event_id) -->
      <!-- TODO: Wishlist button -->
      <p>Event Detail — TODO</p>
    </div>
  `,
})
export class EventDetailComponent {}
