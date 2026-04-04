import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { CheckoutApiService } from '../../services/checkout-api.service';

@Component({
  selector: 'app-checkout-pending',
  standalone: true,
  imports: [RouterLink, ButtonModule, NavbarComponent],
  styles: [
    `
      .page {
        max-width: 480px;
        margin: 0 auto;
        padding: 64px 24px;
        text-align: center;
      }
      .icon {
        font-size: 4rem;
        margin-bottom: 16px;
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
      <div class="icon">⏰</div>
      <h1 class="title">Waktu Pembayaran Habis</h1>
      <p class="desc">
        Pesanan kamu telah dibatalkan karena waktu pembayaran sudah habis. Kamu bisa membuat pesanan
        baru.
      </p>

      <div class="actions">
        @if (eventId()) {
          <a [routerLink]="['/checkout', eventId()]">
            <button
              pButton
              type="button"
              label="Buat Pesanan Baru"
              style="width: 100%; border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"
            ></button>
          </a>
        }
        <a routerLink="/">
          <button
            pButton
            type="button"
            label="Kembali ke Beranda"
            outlined
            style="width: 100%; border-radius: 9999px;"
          ></button>
        </a>
      </div>
    </div>
  `,
})
export class CheckoutPendingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly checkoutApi = inject(CheckoutApiService);

  readonly eventId = signal<string | null>(null);

  ngOnInit() {
    const orderId = this.route.snapshot.paramMap.get('order_id');
    if (orderId) {
      this.checkoutApi.getOrder(orderId).subscribe({
        next: (order) => {
          // Extract event ID from order if available
          this.eventId.set((order as any).event_id ?? null);
        },
      });
    }
  }
}
