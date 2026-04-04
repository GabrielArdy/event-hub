import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { OrganizerStore } from '../../store/organizer.store';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { IdrCurrencyPipe } from '../../../../shared/pipes/idr-currency.pipe';

const STATUS_OPTIONS = [
  { label: 'Semua Status', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Dipublikasi', value: 'PUBLISHED' },
  { label: 'Berlangsung', value: 'ONGOING' },
  { label: 'Selesai', value: 'COMPLETED' },
  { label: 'Dibatalkan', value: 'CANCELLED' },
];

@Component({
  selector: 'app-org-event-list',
  standalone: true,
  imports: [RouterLink, ButtonModule, TableModule, DropdownModule, SkeletonModule, FormsModule, DatePipe, StatusBadgeComponent, IdrCurrencyPipe],
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { font-size: 1.5rem; font-weight: 700; color: #111827; }
    .filters { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .event-banner { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; }
    .event-title-cell { font-weight: 600; color: #111827; }
    .event-date { font-size: 0.8rem; color: #6B7280; }
  `],
  template: `
    <div class="page">
      <div class="header">
        <h1 class="page-title">Kelola Event</h1>
        <a routerLink="/organizer/events/new">
          <button pButton type="button" label="+ Buat Event Baru"
            style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
        </a>
      </div>

      <div class="filters">
        <p-dropdown
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          [(ngModel)]="selectedStatus"
          (ngModelChange)="onStatusChange($event)"
          placeholder="Filter Status"
        />
      </div>

      @if (orgStore.isLoading()) {
        @for (i of [1,2,3,4,5]; track i) {
          <p-skeleton height="60px" styleClass="mb-2" />
        }
      } @else {
        <p-table
          [value]="orgStore.events()"
          [rowHover]="true"
          responsiveLayout="scroll"
          emptyMessage="Tidak ada event ditemukan"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Event</th>
              <th>Tanggal</th>
              <th>Status</th>
              <th>Tiket Terjual</th>
              <th>Aksi</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-event>
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                  @if (event.banner_url) {
                    <img [src]="event.banner_url" class="event-banner" />
                  } @else {
                    <div style="width: 48px; height: 48px; border-radius: 6px; background: #F3F4F6; display: flex; align-items: center; justify-content: center;">
                      <i class="pi pi-image" style="color: #9CA3AF;"></i>
                    </div>
                  }
                  <div>
                    <div class="event-title-cell">{{ event.title }}</div>
                    <div class="event-date">{{ event.venue?.city ?? 'Online' }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="event-date">{{ event.start_at | date:'d MMM yyyy' }}</div>
                <div class="event-date">{{ event.start_at | date:'HH:mm' }} WIB</div>
              </td>
              <td>
                <app-status-badge [status]="event.status" />
              </td>
              <td>
                <span style="font-weight: 600;">{{ event.ticket_available ? 'Ada' : 'Habis' }}</span>
              </td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <a [routerLink]="['/organizer/events', event.event_id, 'edit']">
                    <button pButton type="button" icon="pi pi-pencil" size="small" outlined title="Edit"></button>
                  </a>
                  @if (event.status === 'ONGOING' || event.status === 'PUBLISHED') {
                    <a [routerLink]="['/organizer/events', event.event_id, 'dashboard']">
                      <button pButton type="button" icon="pi pi-chart-line" size="small" outlined title="Live Dashboard"></button>
                    </a>
                  }
                  <a [routerLink]="['/organizer/events', event.event_id, 'report']">
                    <button pButton type="button" icon="pi pi-file-pdf" size="small" outlined title="Laporan"></button>
                  </a>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class OrgEventListComponent implements OnInit {
  readonly orgStore = inject(OrganizerStore);
  readonly statusOptions = STATUS_OPTIONS;
  selectedStatus = '';

  ngOnInit() { this.orgStore.loadEvents(undefined); }

  onStatusChange(status: string) {
    this.orgStore.loadEvents(status || undefined);
  }
}
