import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO: Single ticket detail with QR code display
// - Render qr_token as QR code image (or use qr_url)
// - Download PDF button (pdf_url)
// - Refund request button (if policy allows)

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule],
  template: `<p>Ticket Detail — TODO</p>`,
})
export class TicketDetailComponent {}
