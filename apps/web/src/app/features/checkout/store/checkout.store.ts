import { signalStore, withState, withMethods, withComputed } from '@ngrx/signals';
import { computed } from '@angular/core';

// TODO: Implement CheckoutStore per patterns_and_snippets.md
// Steps: SELECT_PAYMENT → WAITING_PAYMENT → SUCCESS | FAILED

interface CheckoutState {
  order: any | null;
  payment: any | null;
  step: 'SELECT_PAYMENT' | 'WAITING_PAYMENT' | 'SUCCESS' | 'FAILED';
  isLoading: boolean;
  paymentTimer: number;
}

export const CheckoutStore = signalStore(
  { providedIn: 'root' },
  withState<CheckoutState>({
    order: null,
    payment: null,
    step: 'SELECT_PAYMENT',
    isLoading: false,
    paymentTimer: 0,
  }),
  withComputed(({ paymentTimer }) => ({
    timerLabel: computed(() => {
      const secs = paymentTimer();
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }),
  })),
  withMethods(() => ({
    // TODO: initiatePayment(payload)
    // TODO: listenPaymentStatus(paymentId)
    // TODO: startTimer(expiresAt)
  })),
);
