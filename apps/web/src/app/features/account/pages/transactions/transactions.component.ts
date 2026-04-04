import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DatePipe } from '@angular/common';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { IdrCurrencyPipe } from '../../../../shared/pipes/idr-currency.pipe';
import { AccountApiService } from '../../services/account-api.service';
import { OrderSummary } from '@eventhub/shared-types';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [RouterLink, ButtonModule, SkeletonModule, TagModule, DatePipe, NavbarComponent, StatusBadgeComponent, IdrCurrencyPipe],
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
    .page-title { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 24px; }
    .order-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .order-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .order-id { font-weight: 700; color: #111827; font-size: 0.875rem; }
    .order-date { font-size: 0.75rem; color: #6B7280; }
    .order-items { font-size: 0.875rem; color: #374151; margin-bottom: 12px; }
    .order-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #F3F4F6; }
    .order-total { font-weight: 700; color: #6C63FF; font-size: 1rem; }
    .empty-state { text-align: center; padding: 64px 24px; }
  `],
  template: `
    <app-navbar />
    <div class="page">
      <h1 class="page-title">Riwayat Transaksi</h1>

      @if (isLoading()) {
        @for (i of [1,2,3]; track i) {
          <p-skeleton height="120px" styleClass="mb-3" />
        }
      } @else if (orders().length === 0) {
        <div class="empty-state">
          <div style="font-size: 3rem; margin-bottom: 12px;">📋</div>
          <div style="font-size: 1rem; font-weight: 600; color: #374151;">Belum ada transaksi</div>
          <a routerLink="/" style="display: block; margin-top: 16px;">
            <button pButton type="button" label="Mulai Beli Tiket"
              style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
          </a>
        </div>
      } @else {
        @for (order of orders(); track order.order_id) {
          <div class="order-card">
            <div class="order-header">
              <div>
                <div class="order-id">Order #{{ order.order_id.slice(0, 8).toUpperCase() }}</div>
                <div class="order-date">{{ order.created_at | date:'d MMM yyyy, HH:mm' }}</div>
              </div>
              <app-status-badge [status]="order.status" />
            </div>

            <div class="order-items">
              @for (item of order.items; track item.ticket_type_id) {
                <div>{{ item.name }} × {{ item.quantity }}</div>
              }
            </div>

            <div class="order-footer">
              <div class="order-total">{{ order.total_idr | idrCurrency }}</div>
              @if (order.status === 'PENDING_PAYMENT') {
                <a [routerLink]="['/checkout/pending', order.order_id]">
                  <button pButton type="button" label="Lihat Pembayaran" size="small"
                    style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
                </a>
              } @else if (order.status === 'PAID') {
                <a [routerLink]="['/checkout/success', order.order_id]">
                  <button pButton type="button" label="Lihat Tiket" size="small"
                    outlined style="border-radius: 9999px;"></button>
                </a>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class TransactionsComponent implements OnInit {
  private readonly accountApi = inject(AccountApiService);

  readonly isLoading = signal(false);
  readonly orders = signal<OrderSummary[]>([]);

  ngOnInit() {
    this.isLoading.set(true);
    this.accountApi.getMyOrders().subscribe({
      next: (o) => { this.orders.set(o); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }
}
