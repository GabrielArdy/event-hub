import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO: List user's tickets with status filter (ACTIVE | USED | EXPIRED | REFUNDED)
// Each ticket links to /me/tickets/:ticket_id for QR code

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule],
  template: `<p>My Tickets — TODO</p>`,
})
export class MyTicketsComponent {}
