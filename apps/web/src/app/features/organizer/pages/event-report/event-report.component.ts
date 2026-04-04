import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { DividerModule } from 'primeng/divider';
import { OrganizerStore } from '../../store/organizer.store';
import { OrganizerApiService, EventReport } from '../../services/organizer-api.service';
import { IdrCurrencyPipe } from '../../../../shared/pipes/idr-currency.pipe';

@Component({
  selector: 'app-event-report',
  standalone: true,
  imports: [RouterLink, ButtonModule, SkeletonModule, TableModule, DividerModule, IdrCurrencyPipe],
  styles: [
    `
      .page {
        max-width: 1000px;
        margin: 0 auto;
        padding: 32px 24px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
      }
      .page-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 32px;
      }
      @media (max-width: 768px) {
        .stats-grid {
          grid-template-columns: 1fr;
        }
      }
      .stat-card {
        background: #fff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
      .stat-label {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 8px;
      }
      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
      }
      .section-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #111827;
        margin: 0 0 16px;
      }
      .payout-box {
        background: linear-gradient(135deg, #6c63ff 0%, #5a52d5 100%);
        color: #fff;
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 32px;
      }
      .payout-label {
        font-size: 0.875rem;
        opacity: 0.85;
        margin-bottom: 4px;
      }
      .payout-value {
        font-size: 2rem;
        font-weight: 700;
      }
      .payout-note {
        font-size: 0.8rem;
        opacity: 0.75;
        margin-top: 8px;
      }
    `,
  ],
  template: `
    <div class="page">
      <div class="header">
        <h1 class="page-title">Laporan Event</h1>
        <button
          pButton
          type="button"
          label="Export CSV"
          icon="pi pi-download"
          outlined
          style="border-radius: 9999px;"
        ></button>
      </div>

      @if (isLoading()) {
        <p-skeleton height="200px" styleClass="mb-4" />
        <p-skeleton height="200px" />
      } @else if (report()) {
        <!-- Payout Summary -->
        <div class="payout-box">
          <div class="payout-label">Estimasi Pencairan Dana (D+7 setelah acara)</div>
          <div class="payout-value">{{ report()!.revenue_net_idr | idrCurrency }}</div>
          <div class="payout-note">
            Gross: {{ report()!.revenue_gross_idr | idrCurrency }} | Platform fee:
            {{ report()!.platform_fee_idr | idrCurrency }} | Gateway fee:
            {{ report()!.gateway_fee_idr | idrCurrency }}
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value" style="color: #22C55E;">
              {{ report()!.revenue_gross_idr | idrCurrency }}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tiket Terjual</div>
            <div class="stat-value">{{ report()!.ticket_sold }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Check-in</div>
            <div class="stat-value">{{ report()!.checkin_count }}</div>
          </div>
        </div>

        <p-divider />

        <!-- Sales by Type -->
        <div class="section-title">Penjualan per Tipe Tiket</div>
        <p-table [value]="report()!.sales_by_type" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>Tipe Tiket</th>
              <th>Terjual</th>
              <th>Revenue</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td style="font-weight: 600;">{{ row.ticket_type }}</td>
              <td>{{ row.sold }}</td>
              <td style="font-weight: 700; color: #6C63FF;">{{ row.revenue_idr | idrCurrency }}</td>
            </tr>
          </ng-template>
        </p-table>

        @if (report()!.sales_timeline?.length) {
          <p-divider />
          <div class="section-title">Timeline Penjualan</div>
          <p-table [value]="report()!.sales_timeline" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>Tanggal</th>
                <th>Tiket Terjual</th>
                <th>Revenue</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.date }}</td>
                <td>{{ row.count }}</td>
                <td>{{ row.revenue_idr | idrCurrency }}</td>
              </tr>
            </ng-template>
          </p-table>
        }
      } @else {
        <div style="text-align: center; padding: 64px; color: #9CA3AF;">
          <div style="font-size: 3rem; margin-bottom: 12px;">📊</div>
          <p>Laporan belum tersedia.</p>
        </div>
      }
    </div>
  `,
})
export class EventReportComponent implements OnInit {
  readonly orgStore = inject(OrganizerStore);
  private readonly orgApi = inject(OrganizerApiService);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(false);
  readonly report = signal<EventReport | null>(null);

  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('event_id')!;
    this.orgStore.loadEventDetail(eventId);
    this.isLoading.set(true);
    this.orgApi.getReport(eventId).subscribe({
      next: (r) => {
        this.report.set(r);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
