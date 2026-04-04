import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DatePipe } from '@angular/common';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { AccountApiService } from '../../services/account-api.service';
import { TicketInfo, TicketStatus } from '@eventhub/shared-types';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Aktif', USED: 'Sudah Dipakai', EXPIRED: 'Kadaluarsa',
  REFUNDED: 'Direfund', PENDING_PAYMENT: 'Menunggu Bayar',
};
const STATUS_SEVERITY: Record<string, any> = {
  ACTIVE: 'success', USED: 'info', EXPIRED: 'danger',
  REFUNDED: undefined, PENDING_PAYMENT: 'warning',
};

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [RouterLink, ButtonModule, TabViewModule, SkeletonModule, TagModule, DatePipe, NavbarComponent],
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
    .page-title { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 24px; }
    .ticket-card { display: flex; gap: 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 12px; transition: box-shadow 0.15s; cursor: pointer; text-decoration: none; color: inherit; }
    .ticket-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .ticket-img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .ticket-img-placeholder { width: 80px; height: 80px; border-radius: 8px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ticket-info { flex: 1; min-width: 0; }
    .ticket-event { font-weight: 700; color: #111827; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ticket-meta { font-size: 0.8rem; color: #6B7280; margin-top: 4px; }
    .empty-state { text-align: center; padding: 48px 24px; }
  `],
  template: `
    <app-navbar />
    <div class="page">
      <h1 class="page-title">Tiket Saya</h1>

      <p-tabView (activeIndexChange)="onTabChange($event)">
        @for (tab of tabs; track tab.status) {
          <p-tabPanel [header]="tab.label">
            @if (isLoading()) {
              @for (i of [1,2,3]; track i) {
                <p-skeleton height="96px" styleClass="mb-3" />
              }
            } @else if (filteredTickets().length === 0) {
              <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 12px;">🎫</div>
                <div style="font-size: 1rem; font-weight: 600; color: #374151;">Belum ada tiket {{ tab.label.toLowerCase() }}</div>
                <a routerLink="/" style="display: block; margin-top: 16px;">
                  <button pButton type="button" label="Cari Acara"
                    style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
                </a>
              </div>
            } @else {
              @for (ticket of filteredTickets(); track ticket.ticket_id) {
                <a [routerLink]="['/me/tickets', ticket.ticket_id]" class="ticket-card">
                  <div class="ticket-img-placeholder">
                    <i class="pi pi-ticket" style="font-size: 1.5rem; color: #6C63FF;"></i>
                  </div>
                  <div class="ticket-info">
                    <div class="ticket-event">{{ ticket.event?.title }}</div>
                    <div class="ticket-meta">
                      <i class="pi pi-calendar" style="margin-right: 4px;"></i>
                      {{ ticket.event?.start_at | date:'d MMM yyyy, HH:mm' }}
                    </div>
                    <div class="ticket-meta">
                      <i class="pi pi-map-marker" style="margin-right: 4px;"></i>
                      {{ ticket.event?.venue_name ?? 'Online' }}
                    </div>
                    <div style="margin-top: 8px;">
                      <p-tag [value]="statusLabel(ticket.status)" [severity]="statusSeverity(ticket.status)" [rounded]="true" />
                      @if (ticket.seat) {
                        <span style="font-size: 0.75rem; color: #6B7280; margin-left: 8px;">Kursi: {{ ticket.seat }}</span>
                      }
                    </div>
                  </div>
                  <div style="flex-shrink: 0; display: flex; align-items: center;">
                    <i class="pi pi-chevron-right" style="color: #9CA3AF;"></i>
                  </div>
                </a>
              }
            }
          </p-tabPanel>
        }
      </p-tabView>
    </div>
  `,
})
export class MyTicketsComponent implements OnInit {
  private readonly accountApi = inject(AccountApiService);

  readonly isLoading = signal(false);
  readonly allTickets = signal<TicketInfo[]>([]);
  readonly activeTab = signal<string>('ALL');

  readonly tabs = [
    { label: 'Semua', status: 'ALL' },
    { label: 'Aktif', status: 'ACTIVE' },
    { label: 'Sudah Dipakai', status: 'USED' },
    { label: 'Riwayat', status: 'HISTORY' },
  ];

  readonly filteredTickets = () => {
    const tab = this.activeTab();
    const tickets = this.allTickets();
    if (tab === 'ALL') return tickets;
    if (tab === 'HISTORY') return tickets.filter((t) => ['USED', 'EXPIRED', 'REFUNDED'].includes(t.status));
    return tickets.filter((t) => t.status === tab);
  };

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.isLoading.set(true);
    this.accountApi.getMyTickets().subscribe({
      next: (tickets) => { this.allTickets.set(tickets); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  onTabChange(index: number) {
    this.activeTab.set(this.tabs[index]?.status ?? 'ALL');
  }

  statusLabel(status: string): string { return STATUS_LABEL[status] ?? status; }
  statusSeverity(status: string): any { return STATUS_SEVERITY[status]; }
}
