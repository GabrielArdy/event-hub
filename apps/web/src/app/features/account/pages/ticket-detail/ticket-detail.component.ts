import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { DatePipe } from '@angular/common';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { TicketQrComponent } from '../../../../shared/components/ticket-qr/ticket-qr.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { AccountApiService } from '../../services/account-api.service';
import { AuthStore } from '../../../auth/store/auth.store';
import { TicketInfo } from '@eventhub/shared-types';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [RouterLink, ButtonModule, SkeletonModule, DividerModule, TagModule, DatePipe, NavbarComponent, TicketQrComponent, StatusBadgeComponent],
  styles: [`
    .page { max-width: 500px; margin: 0 auto; padding: 32px 24px; }
    .back-link { display: flex; align-items: center; gap: 8px; color: #6C63FF; text-decoration: none; font-size: 0.875rem; margin-bottom: 24px; }
    .ticket-card { background: #fff; border: 2px solid #E5E7EB; border-radius: 20px; overflow: hidden; }
    .ticket-header { background: linear-gradient(135deg, #6C63FF 0%, #5A52D5 100%); color: #fff; padding: 24px; text-align: center; }
    .event-title { font-size: 1.125rem; font-weight: 700; margin: 0 0 4px; }
    .ticket-body { padding: 24px; }
    .info-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; font-size: 0.875rem; color: #374151; }
    .info-icon { color: #6C63FF; flex-shrink: 0; margin-top: 2px; }
    .qr-section { display: flex; justify-content: center; padding: 24px; background: #F9FAFB; }
    .ticket-footer { padding: 16px 24px; border-top: 1px dashed #E5E7EB; display: flex; justify-content: space-between; align-items: center; }
  `],
  template: `
    <app-navbar />
    <div class="page">
      <a class="back-link" routerLink="/me/tickets">
        <i class="pi pi-arrow-left"></i> Kembali ke Tiket Saya
      </a>

      @if (isLoading()) {
        <p-skeleton height="500px" />
      } @else if (ticket()) {
        @let t = ticket()!;
        <div class="ticket-card">
          <div class="ticket-header">
            <div class="event-title">{{ t.event?.title }}</div>
            <div style="font-size: 0.875rem; opacity: 0.85; margin-top: 4px;">{{ t.ticket_type }}</div>
            <div style="margin-top: 8px;">
              <app-status-badge [status]="t.status" />
            </div>
          </div>

          <div class="ticket-body">
            <div class="info-row">
              <i class="pi pi-calendar info-icon"></i>
              <div>{{ t.event?.start_at | date:'EEEE, d MMMM yyyy' }}<br>
                <span style="color: #6B7280;">{{ t.event?.start_at | date:'HH:mm' }} WIB</span>
              </div>
            </div>
            <div class="info-row">
              <i class="pi pi-map-marker info-icon"></i>
              <div>{{ t.event?.venue_name ?? 'Online' }}</div>
            </div>
            @if (t.seat) {
              <div class="info-row">
                <i class="pi pi-th-large info-icon"></i>
                <div>Kursi: <strong>{{ t.seat }}</strong></div>
              </div>
            }
            @if (t.used_at) {
              <div class="info-row">
                <i class="pi pi-check-circle info-icon"></i>
                <div>Check-in: {{ t.used_at | date:'d MMM yyyy, HH:mm' }}</div>
              </div>
            }
          </div>

          @if (t.status === 'ACTIVE') {
            <div class="qr-section">
              <app-ticket-qr [ticket]="t" [holderName]="authStore.user()?.full_name ?? ''" />
            </div>
          }

          <div class="ticket-footer">
            <div style="font-size: 0.75rem; color: #9CA3AF;">ID: {{ t.ticket_id.slice(0, 8) }}...</div>
            @if (t.pdf_url) {
              <a [href]="t.pdf_url" target="_blank" download>
                <button pButton type="button" label="Download" icon="pi pi-download" size="small" outlined style="border-radius: 9999px;"></button>
              </a>
            }
          </div>
        </div>
      } @else {
        <div style="text-align: center; padding: 48px;">
          <div style="font-size: 3rem; margin-bottom: 16px;">😕</div>
          <p style="color: #6B7280;">Tiket tidak ditemukan.</p>
          <a routerLink="/me/tickets">
            <button pButton type="button" label="Kembali" style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
          </a>
        </div>
      }
    </div>
  `,
})
export class TicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly accountApi = inject(AccountApiService);
  readonly authStore = inject(AuthStore);

  readonly isLoading = signal(false);
  readonly ticket = signal<TicketInfo | null>(null);

  ngOnInit() {
    const ticketId = this.route.snapshot.paramMap.get('ticket_id')!;
    this.isLoading.set(true);
    this.accountApi.getTicketDetail(ticketId).subscribe({
      next: (t) => { this.ticket.set(t); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }
}
