import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DatePipe } from '@angular/common';
import { OrganizerStore } from '../../store/organizer.store';
import { AuthStore } from '../../../auth/store/auth.store';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { IdrCurrencyPipe } from '../../../../shared/pipes/idr-currency.pipe';

@Component({
  selector: 'app-org-dashboard',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule, SkeletonModule, TagModule, DatePipe, StatusBadgeComponent, IdrCurrencyPipe],
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .greeting { font-size: 1.5rem; font-weight: 700; color: #111827; }
    .subtitle { font-size: 0.875rem; color: #6B7280; margin-top: 4px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }
    .stat-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .stat-label { font-size: 0.875rem; color: #6B7280; margin-bottom: 8px; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #111827; }
    .stat-sub { font-size: 0.75rem; color: #6B7280; margin-top: 4px; }
    .section-title { font-size: 1.125rem; font-weight: 700; color: #111827; margin: 0 0 16px; }
    .event-row { display: flex; gap: 16px; align-items: center; padding: 16px; background: #fff; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .event-img { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .event-img-ph { width: 64px; height: 64px; border-radius: 8px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .event-title { font-weight: 600; color: #111827; font-size: 0.9rem; }
    .event-meta { font-size: 0.8rem; color: #6B7280; margin-top: 4px; }
  `],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <div class="greeting">Selamat datang, {{ firstName() }}! 👋</div>
          <div class="subtitle">Kelola acara dan pantau performa kamu di sini.</div>
        </div>
        <a routerLink="/organizer/events/new">
          <button pButton type="button" label="+ Buat Event Baru"
            style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
        </a>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Event</div>
          @if (orgStore.isLoading()) {
            <p-skeleton height="2rem" width="60%" />
          } @else {
            <div class="stat-value">{{ orgStore.events().length }}</div>
            <div class="stat-sub">event dibuat</div>
          }
        </div>
        <div class="stat-card">
          <div class="stat-label">Event Aktif</div>
          <div class="stat-value" style="color: #22C55E;">{{ publishedCount() }}</div>
          <div class="stat-sub">dipublikasi</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Event Draft</div>
          <div class="stat-value" style="color: #F59E0B;">{{ draftCount() }}</div>
          <div class="stat-sub">belum dipublikasi</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Event Selesai</div>
          <div class="stat-value" style="color: #6B7280;">{{ completedCount() }}</div>
          <div class="stat-sub">sudah berlalu</div>
        </div>
      </div>

      <!-- Recent Events -->
      <div class="section-title">Event Terbaru</div>

      @if (orgStore.isLoading()) {
        @for (i of [1,2,3]; track i) {
          <p-skeleton height="96px" styleClass="mb-3" />
        }
      } @else if (orgStore.events().length === 0) {
        <div style="text-align: center; padding: 48px; color: #6B7280;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🎪</div>
          <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">Belum ada event</div>
          <p style="font-size: 0.875rem; margin-bottom: 16px;">Buat event pertamamu sekarang!</p>
          <a routerLink="/organizer/events/new">
            <button pButton type="button" label="Buat Event"
              style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
          </a>
        </div>
      } @else {
        @for (event of recentEvents(); track event.event_id) {
          <div class="event-row">
            @if (event.banner_url) {
              <img [src]="event.banner_url" class="event-img" />
            } @else {
              <div class="event-img-ph"><i class="pi pi-image" style="color: #9CA3AF;"></i></div>
            }
            <div style="flex: 1; min-width: 0;">
              <div class="event-title">{{ event.title }}</div>
              <div class="event-meta">{{ event.start_at | date:'d MMM yyyy, HH:mm' }}</div>
            </div>
            <app-status-badge [status]="event.status" />
            <div style="display: flex; gap: 8px; flex-shrink: 0;">
              <a [routerLink]="['/organizer/events', event.event_id, 'dashboard']">
                <button pButton type="button" icon="pi pi-chart-bar" size="small" outlined title="Live Dashboard"></button>
              </a>
              <a [routerLink]="['/organizer/events', event.event_id, 'edit']">
                <button pButton type="button" icon="pi pi-pencil" size="small" outlined title="Edit"></button>
              </a>
            </div>
          </div>
        }

        @if (orgStore.events().length > 5) {
          <a routerLink="/organizer/events">
            <button pButton type="button" label="Lihat Semua Event" text style="margin-top: 8px;"></button>
          </a>
        }
      }
    </div>
  `,
})
export class OrgDashboardComponent implements OnInit {
  readonly orgStore = inject(OrganizerStore);
  readonly authStore = inject(AuthStore);

  firstName() {
    return this.authStore.user()?.full_name?.split(' ')[0] ?? 'Organizer';
  }

  publishedCount() {
    return this.orgStore.events().filter((e) => ['PUBLISHED', 'ONGOING'].includes(e.status)).length;
  }

  draftCount() {
    return this.orgStore.events().filter((e) => e.status === 'DRAFT').length;
  }

  completedCount() {
    return this.orgStore.events().filter((e) => ['COMPLETED', 'CANCELLED'].includes(e.status)).length;
  }

  recentEvents() {
    return this.orgStore.events().slice(0, 5);
  }

  ngOnInit() {
    this.orgStore.loadEvents(undefined);
  }
}
