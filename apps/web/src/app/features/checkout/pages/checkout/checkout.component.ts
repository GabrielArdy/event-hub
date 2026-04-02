import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO: Implement checkout page
// - Show order summary
// - Payment method selector (only methods enabled by EO)
// - Bank code selector for BANK_TRANSFER
// - Call POST /payments/initiate
// - Connect to WS /ws/payments?paymentId=:id&token=:token
// - Payment countdown timer (BR-PAY-001: 60min VA, 15min ewallet)
// - Handle WS events: PAYMENT_STATUS_CHANGED, PAYMENT_EXPIRED
// - Uses CheckoutStore (NgRx SignalStore)

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  template: `<p>Checkout Page — TODO</p>`,
})
export class CheckoutComponent {}
