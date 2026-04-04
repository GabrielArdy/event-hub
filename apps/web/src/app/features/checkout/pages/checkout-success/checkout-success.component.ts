import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { CheckoutApiService } from '../../services/checkout-api.service';
import { OrderSummary } from '@eventhub/shared-types';
import { IdrCurrencyPipe } from '../../../../shared/pipes/idr-currency.pipe';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [RouterLink, ButtonModule, DividerModule, NavbarComponent, IdrCurrencyPipe, DatePipe],
  styles: [
    `
      .page {
        max-width: 600px;
        margin: 0 auto;
        padding: 32px 24px;
        text-align: center;
      }
      .success-icon {
        font-size: 4rem;
        margin-bottom: 16px;
        animation: pop 0.5s ease-out;
      }
      @keyframes pop {
        0% {
          transform: scale(0);
        }
        70% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
        }
      }
      .title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
        margin: 0 0 8px;
      }
      .desc {
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0 0 32px;
      }
      .order-card {
        background: #f9fafb;
        border-radius: 16px;
        padding: 24px;
        text-align: left;
        margin-bottom: 24px;
      }
      .order-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
        color: #374151;
        margin-bottom: 8px;
      }
      .order-total {
        display: flex;
        justify-content: space-between;
        font-size: 1rem;
        font-weight: 700;
        color: #111827;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
        margin-top: 8px;
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
    `,
  ],
  template: `
    <app-navbar />
    <div class="page">
      <div class="success-icon">🎉</div>
      <h1 class="title">Pembayaran Berhasil!</h1>
      <p class="desc">Tiket kamu sudah dikirim ke email. Selamat menikmati acaranya!</p>

      @if (order()) {
        <div class="order-card">
          <div style="font-weight: 700; color: #111827; margin-bottom: 12px;">Ringkasan Order</div>
          @for (item of order()!.items; track item.ticket_type_id) {
            <div class="order-row">
              <span>{{ item.name }} × {{ item.quantity }}</span>
              <span>{{ item.subtotal_idr | idrCurrency }}</span>
            </div>
          }
          <div class="order-row">
            <span>Platform fee</span><span>{{ order()!.platform_fee_idr | idrCurrency }}</span>
          </div>
          <div class="order-total">
            <span>Total Dibayar</span>
            <span style="color: #6C63FF;">{{ order()!.total_idr | idrCurrency }}</span>
          </div>
        </div>
      }

      <div class="actions">
        <a routerLink="/me/tickets">
          <button
            pButton
            type="button"
            label="Lihat Tiket Saya"
            style="width: 100%; border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"
          ></button>
        </a>
        <a routerLink="/">
          <button
            pButton
            type="button"
            label="Cari Acara Lain"
            outlined
            style="width: 100%; border-radius: 9999px;"
          ></button>
        </a>
      </div>
    </div>
  `,
})
export class CheckoutSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly checkoutApi = inject(CheckoutApiService);

  readonly order = signal<OrderSummary | null>(null);

  ngOnInit() {
    const orderId = this.route.snapshot.paramMap.get('order_id');
    if (orderId) {
      this.checkoutApi.getOrder(orderId).subscribe({
        next: (o) => this.order.set(o),
      });
    }
  }
}
