import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { OrderSummary, PaymentDetail, PaymentMethod } from '@eventhub/shared-types';
import {
  CheckoutApiService,
  CreateOrderPayload,
  InitiatePaymentPayload,
} from '../services/checkout-api.service';
import { WsService } from '../../../core/services/ws.service';
import { AuthStore } from '../../auth/store/auth.store';

type CheckoutStep =
  | 'SELECT_TICKETS'
  | 'SELECT_PAYMENT'
  | 'WAITING_PAYMENT'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED';

interface SelectedTicket {
  ticket_type_id: string;
  ticket_type_name: string;
  price_idr: number;
  quantity: number;
  seat_ids?: string[];
}

interface CheckoutState {
  step: CheckoutStep;
  eventId: string | null;
  selectedTickets: SelectedTicket[];
  order: OrderSummary | null;
  payment: PaymentDetail | null;
  selectedMethod: PaymentMethod | null;
  selectedProvider: string | null;
  isLoading: boolean;
  error: string | null;
}

export const CheckoutStore = signalStore(
  { providedIn: 'root' },
  withState<CheckoutState>({
    step: 'SELECT_TICKETS',
    eventId: null,
    selectedTickets: [],
    order: null,
    payment: null,
    selectedMethod: null,
    selectedProvider: null,
    isLoading: false,
    error: null,
  }),

  withComputed(({ selectedTickets, order }) => ({
    subtotal: computed(() =>
      selectedTickets().reduce((sum, t) => sum + t.price_idr * t.quantity, 0),
    ),
    totalQuantity: computed(() => selectedTickets().reduce((sum, t) => sum + t.quantity, 0)),
    platformFee: computed(() => order()?.platform_fee_idr ?? 0),
    grandTotal: computed(() => order()?.total_idr ?? 0),
  })),

  withMethods((store) => {
    const checkoutApi = inject(CheckoutApiService);
    const wsService = inject(WsService);
    const authStore = inject(AuthStore);
    const router = inject(Router);

    return {
      initCheckout(eventId: string) {
        patchState(store, {
          step: 'SELECT_TICKETS',
          eventId,
          selectedTickets: [],
          order: null,
          payment: null,
          error: null,
        });
      },

      updateTicketQuantity(
        ticket: { ticket_type_id: string; name: string; price_idr: number },
        qty: number,
      ) {
        const existing = store.selectedTickets();
        const idx = existing.findIndex((t) => t.ticket_type_id === ticket.ticket_type_id);
        let updated: SelectedTicket[];
        if (qty === 0) {
          updated = existing.filter((t) => t.ticket_type_id !== ticket.ticket_type_id);
        } else if (idx !== -1) {
          updated = existing.map((t, i) => (i === idx ? { ...t, quantity: qty } : t));
        } else {
          updated = [
            ...existing,
            {
              ticket_type_id: ticket.ticket_type_id,
              ticket_type_name: ticket.name,
              price_idr: ticket.price_idr,
              quantity: qty,
            },
          ];
        }
        patchState(store, { selectedTickets: updated });
      },

      updateSeats(seatIds: string[]) {
        // Associate seat IDs with the first ticket type
        const tickets = store.selectedTickets();
        if (tickets.length > 0) {
          const updated = [...tickets];
          updated[0] = { ...updated[0], seat_ids: seatIds };
          patchState(store, { selectedTickets: updated });
        }
      },

      createOrder: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap(() => {
            const eventId = store.eventId()!;
            const items = store.selectedTickets().map((t) => ({
              ticket_type_id: t.ticket_type_id,
              quantity: t.quantity,
              seat_ids: t.seat_ids,
            }));
            return checkoutApi.createOrder({ event_id: eventId, items }).pipe(
              tap((order) => {
                patchState(store, { order, step: 'SELECT_PAYMENT', isLoading: false });
              }),
              catchError((err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.error?.error?.code || 'ORDER_FAILED',
                });
                return of(null);
              }),
            );
          }),
        ),
      ),

      setPaymentMethod(method: PaymentMethod, provider?: string) {
        patchState(store, { selectedMethod: method, selectedProvider: provider ?? null });
      },

      initiatePayment: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap(() => {
            const orderId = store.order()!.order_id;
            const method = store.selectedMethod()!;
            const provider = store.selectedProvider() ?? undefined;
            return checkoutApi.initiatePayment({ order_id: orderId, method, provider }).pipe(
              tap((payment) => {
                patchState(store, {
                  payment,
                  step: 'WAITING_PAYMENT',
                  isLoading: false,
                });
                // Connect WS to listen for payment status
                const token = authStore.accessToken();
                if (token) {
                  wsService.connect('/ws/payments', token, { paymentId: payment.payment_id });
                  wsService.on<any>('/ws/payments', 'PAYMENT_STATUS_CHANGED').subscribe((msg) => {
                    if (msg.new_status === 'PAID') {
                      patchState(store, { step: 'SUCCESS' });
                      router.navigate(['/checkout/success', orderId]);
                    } else if (msg.new_status === 'FAILED') {
                      patchState(store, { step: 'FAILED', error: 'PAYMENT_FAILED' });
                    } else if (msg.new_status === 'EXPIRED') {
                      patchState(store, { step: 'EXPIRED', error: 'PAYMENT_EXPIRED' });
                      router.navigate(['/checkout/pending', orderId]);
                    }
                  });
                }
              }),
              catchError((err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.error?.error?.code || 'PAYMENT_INIT_FAILED',
                });
                return of(null);
              }),
            );
          }),
        ),
      ),

      clearError() {
        patchState(store, { error: null });
      },

      reset() {
        wsService.disconnect('/ws/payments');
        patchState(store, {
          step: 'SELECT_TICKETS',
          eventId: null,
          selectedTickets: [],
          order: null,
          payment: null,
          selectedMethod: null,
          selectedProvider: null,
          isLoading: false,
          error: null,
        });
      },
    };
  }),
);
