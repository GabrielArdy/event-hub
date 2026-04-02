import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO: Real-time event dashboard for organizer
// - Connect to WS /ws/organizer?eventId=:id&token=:token
// - Show live stats: ticket_sold, revenue, checkin_count
// - Handle WS events: TICKET_SOLD, CHECKIN_UPDATE, CAPACITY_WARNING

@Component({
  selector: 'app-event-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<p>Event Real-time Dashboard — TODO</p>`,
})
export class EventDashboardComponent {}
