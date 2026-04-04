import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { StepsModule } from 'primeng/steps';
import { SkeletonModule } from 'primeng/skeleton';
import { AccordionModule } from 'primeng/accordion';
import { FormsModule } from '@angular/forms';
import { CheckoutStore } from '../../store/checkout.store';
import { EventsStore } from '../../../events/store/events.store';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { CountdownTimerComponent } from '../../../../shared/components/countdown-timer/countdown-timer.component';
import { IdrCurrencyPipe } from '../../../../shared/pipes/idr-currency.pipe';
import { PaymentMethod } from '@eventhub/shared-types';
import { calculatePlatformFee } from '@eventhub/shared-utils';

const PAYMENT_METHODS = [
  {
    method: 'BANK_TRANSFER' as PaymentMethod,
    label: 'Transfer Bank (Virtual Account)',
    icon: 'pi-building',
    providers: ['BCA', 'MANDIRI', 'BNI', 'BRI', 'PERMATA'],
  },
  {
    method: 'GOPAY' as PaymentMethod,
    label: 'GoPay',
    icon: 'pi-wallet',
    providers: [],
  },
  {
    method: 'OVO' as PaymentMethod,
    label: 'OVO',
    icon: 'pi-wallet',
    providers: [],
  },
  {
    method: 'DANA' as PaymentMethod,
    label: 'DANA',
    icon: 'pi-wallet',
    providers: [],
  },
  {
    method: 'CREDIT_CARD' as PaymentMethod,
    label: 'Kartu Kredit / Debit',
    icon: 'pi-credit-card',
    providers: [],
  },
];

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    RadioButtonModule,
    DividerModule,
    MessageModule,
    StepsModule,
    SkeletonModule,
    AccordionModule,
    NavbarComponent,
    CountdownTimerComponent,
    IdrCurrencyPipe,
  ],
  styles: [
    `
      .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 32px 24px;
      }
      .stepper {
        margin-bottom: 32px;
      }
      .event-mini {
        display: flex;
        gap: 12px;
        align-items: center;
        background: #f9fafb;
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 24px;
      }
      .event-mini img {
        width: 64px;
        height: 64px;
        object-fit: cover;
        border-radius: 8px;
      }
      .event-mini-title {
        font-weight: 600;
        color: #111827;
        font-size: 0.9rem;
      }
      .event-mini-date {
        font-size: 0.8rem;
        color: #6b7280;
      }
      .section-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #111827;
        margin: 0 0 16px;
      }
      .ticket-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: #f9fafb;
        border-radius: 10px;
        margin-bottom: 8px;
      }
      .qty-ctrl {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .qty-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1.5px solid #6c63ff;
        background: #fff;
        color: #6c63ff;
        font-size: 1.125rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .qty-btn:disabled {
        border-color: #d1d5db;
        color: #d1d5db;
        cursor: not-allowed;
      }
      .qty-val {
        font-weight: 700;
        font-size: 1rem;
        min-width: 24px;
        text-align: center;
      }
      .summary-box {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px;
        margin-top: 24px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
        color: #374151;
        margin-bottom: 8px;
      }
      .summary-total {
        display: flex;
        justify-content: space-between;
        font-size: 1.125rem;
        font-weight: 700;
        color: #111827;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
        margin-top: 8px;
      }
      .method-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        cursor: pointer;
        margin-bottom: 8px;
        transition: border-color 0.15s;
      }
      .method-option.selected {
        border-color: #6c63ff;
        background: #ede9fe;
      }
      .provider-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
        margin-left: 32px;
      }
      .provider-btn {
        padding: 6px 14px;
        border: 1.5px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.15s;
      }
      .provider-btn.selected {
        border-color: #6c63ff;
        background: #6c63ff;
        color: #fff;
      }
      .countdown-wrap {
        text-align: center;
        margin: 16px 0;
      }
      .countdown-label {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 4px;
      }
      .va-info {
        background: #ede9fe;
        border-radius: 12px;
        padding: 16px;
        margin-top: 16px;
      }
      .va-number {
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: 2px;
        color: #6c63ff;
      }
    `,
  ],
  template: `
    <app-navbar />
    <div class="page">
      <!-- Stepper -->
      <div class="stepper">
        <p-steps [model]="stepItems" [activeIndex]="activeStepIndex()" [readonly]="true" />
      </div>

      @if (checkoutStore.isLoading() && !checkoutStore.order()) {
        <div>
          <p-skeleton height="80px" styleClass="mb-3" />
          <p-skeleton height="200px" styleClass="mb-3" />
          <p-skeleton height="100px" />
        </div>
      } @else if (checkoutStore.step() === 'SELECT_TICKETS') {
        <!-- STEP 1: SELECT TICKETS -->
        @if (eventsStore.selectedEvent()) {
          @let event = eventsStore.selectedEvent()!;
          <div class="event-mini">
            @if (event.banner_url) {
              <img [src]="event.banner_url" [alt]="event.title" />
            }
            <div>
              <div class="event-mini-title">{{ event.title }}</div>
              <div class="event-mini-date">{{ event.start_at | date: 'd MMM yyyy, HH:mm' }}</div>
            </div>
          </div>

          <h2 class="section-title">Pilih Tiket</h2>

          @if (checkoutStore.error()) {
            <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-3" />
          }

          @for (tt of event.ticket_types; track tt.ticket_type_id) {
            <div class="ticket-row">
              <div>
                <div style="font-weight: 600; color: #111827;">{{ tt.name }}</div>
                <div style="font-size: 0.875rem; color: #6C63FF; font-weight: 700;">
                  {{ tt.price_idr === 0 ? 'Gratis' : (tt.price_idr | idrCurrency) }}
                </div>
                <div style="font-size: 0.75rem; color: #6B7280;">
                  {{ tt.quota_remaining }} tersisa
                </div>
              </div>
              <div class="qty-ctrl">
                <button
                  class="qty-btn"
                  type="button"
                  [disabled]="getQty(tt.ticket_type_id) === 0"
                  (click)="decrementTicket(tt)"
                >
                  −
                </button>
                <span class="qty-val">{{ getQty(tt.ticket_type_id) }}</span>
                <button
                  class="qty-btn"
                  type="button"
                  [disabled]="
                    getQty(tt.ticket_type_id) >= tt.max_per_user ||
                    getQty(tt.ticket_type_id) >= tt.quota_remaining ||
                    checkoutStore.totalQuantity() >= 5
                  "
                  (click)="incrementTicket(tt)"
                >
                  +
                </button>
              </div>
            </div>
          }

          @if (checkoutStore.totalQuantity() >= 5) {
            <p-message
              severity="warn"
              text="Maksimal 5 tiket per pengguna per acara."
              styleClass="w-full mt-2"
            />
          }
        }

        <!-- Summary -->
        @if (checkoutStore.totalQuantity() > 0) {
          <div class="summary-box">
            <div style="font-weight: 700; color: #111827; margin-bottom: 12px;">Ringkasan</div>
            @for (t of checkoutStore.selectedTickets(); track t.ticket_type_id) {
              <div class="summary-row">
                <span>{{ t.ticket_type_name }} × {{ t.quantity }}</span>
                <span>{{ t.price_idr * t.quantity | idrCurrency }}</span>
              </div>
            }
            <div class="summary-row" style="color: #6B7280; font-size: 0.8rem;">
              <span>Platform fee (3%)</span>
              <span>{{ platformFeeEstimate() | idrCurrency }}</span>
            </div>
            <div class="summary-total">
              <span>Estimasi Total</span>
              <span style="color: #6C63FF;">{{
                checkoutStore.subtotal() + platformFeeEstimate() | idrCurrency
              }}</span>
            </div>
          </div>
        }

        <button
          pButton
          type="button"
          label="Lanjut ke Pembayaran →"
          [disabled]="checkoutStore.totalQuantity() === 0 || checkoutStore.isLoading()"
          [loading]="checkoutStore.isLoading()"
          (click)="proceedToPayment()"
          style="width: 100%; margin-top: 24px; border-radius: 9999px; background: #6C63FF; border-color: #6C63FF; font-size: 1rem; padding: 14px 0;"
        ></button>
      } @else if (checkoutStore.step() === 'SELECT_PAYMENT') {
        <!-- STEP 2: PAYMENT METHOD -->
        @if (checkoutStore.order()) {
          @let order = checkoutStore.order()!;

          <div class="event-mini" style="margin-bottom: 24px;">
            <div>
              <div class="event-mini-title">Ringkasan Order #{{ order.order_id.slice(0, 8) }}</div>
              <div class="event-mini-date">
                Kadaluarsa: {{ order.expires_at | date: 'd MMM yyyy, HH:mm' }}
              </div>
            </div>
          </div>

          <!-- Order summary -->
          <div class="summary-box" style="margin-bottom: 24px; margin-top: 0;">
            @for (item of order.items; track item.ticket_type_id) {
              <div class="summary-row">
                <span>{{ item.name }} × {{ item.quantity }}</span>
                <span>{{ item.subtotal_idr | idrCurrency }}</span>
              </div>
            }
            <div class="summary-row">
              <span>Platform fee (3%)</span><span>{{ order.platform_fee_idr | idrCurrency }}</span>
            </div>
            <div class="summary-row">
              <span>Biaya gateway</span><span>{{ order.gateway_fee_idr | idrCurrency }}</span>
            </div>
            <div class="summary-total">
              <span>Total Bayar</span>
              <span style="color: #6C63FF;">{{ order.total_idr | idrCurrency }}</span>
            </div>
          </div>

          <h2 class="section-title">Pilih Metode Pembayaran</h2>

          <div class="countdown-wrap">
            <div class="countdown-label">Selesaikan dalam</div>
            <app-countdown-timer [expiresAt]="order.expires_at" (expired)="onOrderExpired()" />
          </div>

          @if (checkoutStore.error()) {
            <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-3" />
          }

          @for (pm of paymentMethods; track pm.method) {
            <div
              class="method-option"
              [class.selected]="checkoutStore.selectedMethod() === pm.method"
              (click)="selectMethod(pm)"
            >
              <p-radioButton
                [name]="'method'"
                [value]="pm.method"
                [(ngModel)]="selectedMethodModel"
              />
              <i [class]="'pi ' + pm.icon" style="color: #6C63FF;"></i>
              <span style="font-weight: 500; font-size: 0.9rem;">{{ pm.label }}</span>
            </div>

            @if (checkoutStore.selectedMethod() === pm.method && pm.providers.length > 0) {
              <div class="provider-grid">
                @for (prov of pm.providers; track prov) {
                  <button
                    class="provider-btn"
                    type="button"
                    [class.selected]="checkoutStore.selectedProvider() === prov"
                    (click)="selectProvider(prov)"
                  >
                    {{ prov }}
                  </button>
                }
              </div>
            }
          }

          <button
            pButton
            type="button"
            label="Bayar Sekarang"
            [disabled]="!checkoutStore.selectedMethod() || checkoutStore.isLoading()"
            [loading]="checkoutStore.isLoading()"
            (click)="pay()"
            style="width: 100%; margin-top: 24px; border-radius: 9999px; background: #6C63FF; border-color: #6C63FF; font-size: 1rem; padding: 14px 0;"
          ></button>
        }
      } @else if (checkoutStore.step() === 'WAITING_PAYMENT') {
        <!-- WAITING PAYMENT -->
        @if (checkoutStore.payment()) {
          @let payment = checkoutStore.payment()!;
          <div style="text-align: center; padding: 32px 0;">
            <div style="font-size: 3rem; margin-bottom: 16px;">⏳</div>
            <h2 style="font-size: 1.25rem; font-weight: 700;">Menunggu Pembayaran</h2>
            <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 24px;">
              Selesaikan pembayaran sebelum waktu habis
            </p>
            <app-countdown-timer [expiresAt]="payment.expires_at" (expired)="onPaymentExpired()" />

            @if (payment.virtual_account) {
              <div class="va-info" style="text-align: left; margin-top: 24px;">
                <div style="font-size: 0.875rem; color: #6B7280; margin-bottom: 4px;">
                  {{ payment.virtual_account.bank_name }}
                </div>
                <div class="va-number">{{ payment.virtual_account.va_number }}</div>
                <button
                  pButton
                  type="button"
                  label="Salin"
                  icon="pi pi-copy"
                  text
                  size="small"
                  (click)="copyVa(payment.virtual_account.va_number)"
                  style="margin-top: 8px;"
                ></button>
              </div>
            }

            @if (payment.redirect_url) {
              <a
                [href]="payment.redirect_url"
                target="_blank"
                style="display: block; margin-top: 16px;"
              >
                <button
                  pButton
                  type="button"
                  label="Bayar via App"
                  style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"
                ></button>
              </a>
            }

            <p style="color: #6B7280; font-size: 0.8rem; margin-top: 24px;">
              Halaman ini akan otomatis diperbarui setelah pembayaran diterima
            </p>
          </div>
        }
      }
    </div>
  `,
})
export class CheckoutComponent implements OnInit, OnDestroy {
  readonly checkoutStore = inject(CheckoutStore);
  readonly eventsStore = inject(EventsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly paymentMethods = PAYMENT_METHODS;
  selectedMethodModel: PaymentMethod | null = null;

  readonly stepItems = [{ label: 'Pilih Tiket' }, { label: 'Pembayaran' }];

  readonly activeStepIndex = computed(() => {
    const step = this.checkoutStore.step();
    if (step === 'SELECT_TICKETS') return 0;
    return 1;
  });

  readonly errorMessage = computed(() => {
    const code = this.checkoutStore.error();
    switch (code) {
      case 'USER_QUOTA_EXCEEDED':
        return 'Kamu sudah memiliki tiket untuk acara ini (maks. 5).';
      case 'SEAT_LOCKED':
        return 'Kursi yang kamu pilih sudah diambil orang lain. Pilih kursi lain.';
      case 'TICKET_SOLD_OUT':
        return 'Tiket sudah habis.';
      case 'PAYMENT_INIT_FAILED':
        return 'Gagal membuat pembayaran. Coba lagi.';
      default:
        return 'Terjadi kesalahan. Coba lagi.';
    }
  });

  readonly platformFeeEstimate = computed(() =>
    calculatePlatformFee(this.checkoutStore.subtotal()),
  );

  ngOnInit() {
    const eventId =
      this.route.snapshot.paramMap.get('event_id') ??
      this.route.snapshot.paramMap.get('order_id') ??
      '';
    this.checkoutStore.initCheckout(eventId);
    if (
      !this.eventsStore.selectedEvent() ||
      this.eventsStore.selectedEvent()?.event_id !== eventId
    ) {
      this.eventsStore.loadEventDetail(eventId);
    }
  }

  ngOnDestroy() {
    // Do not reset on destroy — user might navigate back
  }

  getQty(ticketTypeId: string): number {
    return (
      this.checkoutStore.selectedTickets().find((t) => t.ticket_type_id === ticketTypeId)
        ?.quantity ?? 0
    );
  }

  incrementTicket(tt: any) {
    const current = this.getQty(tt.ticket_type_id);
    this.checkoutStore.updateTicketQuantity(
      { ticket_type_id: tt.ticket_type_id, name: tt.name, price_idr: tt.price_idr },
      current + 1,
    );
  }

  decrementTicket(tt: any) {
    const current = this.getQty(tt.ticket_type_id);
    this.checkoutStore.updateTicketQuantity(
      { ticket_type_id: tt.ticket_type_id, name: tt.name, price_idr: tt.price_idr },
      Math.max(0, current - 1),
    );
  }

  proceedToPayment() {
    this.checkoutStore.createOrder();
  }

  selectMethod(pm: (typeof PAYMENT_METHODS)[0]) {
    this.selectedMethodModel = pm.method;
    this.checkoutStore.setPaymentMethod(pm.method);
  }

  selectProvider(provider: string) {
    this.checkoutStore.setPaymentMethod(this.checkoutStore.selectedMethod()!, provider);
  }

  pay() {
    this.checkoutStore.initiatePayment();
  }

  copyVa(va: string) {
    navigator.clipboard.writeText(va).catch(() => {});
  }

  onOrderExpired() {
    this.router.navigate(['/checkout/pending', this.checkoutStore.order()?.order_id]);
  }

  onPaymentExpired() {
    this.router.navigate(['/checkout/pending', this.checkoutStore.order()?.order_id]);
  }
}
