import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { BadgeModule } from 'primeng/badge';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { OrganizerStore } from '../../store/organizer.store';
import { OrganizerApiService, ActivityFeedItem, EventLiveStats } from '../../services/organizer-api.service';
import { AuthStore } from '../../../auth/store/auth.store';
import { WsService } from '../../../../core/services/ws.service';
import { IdrCurrencyPipe } from '../../../../shared/pipes/idr-currency.pipe';

@Component({
  selector: 'app-event-dashboard',
  standalone: true,
  imports: [RouterLink, ButtonModule, ProgressBarModule, BadgeModule, SkeletonModule, DialogModule, InputTextModule, MessageModule, DatePipe, IdrCurrencyPipe],
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .event-title { font-size: 1.5rem; font-weight: 700; color: #111827; }
    .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #22C55E; margin-right: 8px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }
    .stat-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .stat-label { font-size: 0.875rem; color: #6B7280; margin-bottom: 8px; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #111827; }
    .stat-sub { font-size: 0.75rem; color: #6B7280; margin-top: 4px; }
    .activity-feed { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .feed-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #F9FAFB; }
    .feed-item:last-child { border-bottom: none; }
    .feed-dot-green { width: 10px; height: 10px; border-radius: 50%; background: #22C55E; flex-shrink: 0; margin-top: 4px; }
    .feed-dot-blue { width: 10px; height: 10px; border-radius: 50%; background: #6C63FF; flex-shrink: 0; margin-top: 4px; }
    .feed-msg { font-size: 0.875rem; color: #374151; flex: 1; }
    .feed-time { font-size: 0.75rem; color: #9CA3AF; }
    .capacity-bar-wrap { margin-top: 8px; }
    .scan-modal input { width: 100%; margin-bottom: 12px; }
  `],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <div class="event-title">
            <span class="status-dot"></span>
            {{ eventTitle() }} — Live Dashboard
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button pButton type="button" label="🔍 Scan Tiket" (click)="openScanModal()"
            style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
          <a [routerLink]="['../report']">
            <button pButton type="button" label="📊 Laporan" outlined style="border-radius: 9999px;"></button>
          </a>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Check-in</div>
          @if (isLoading()) { <p-skeleton height="2rem" /> } @else {
            <div class="stat-value">{{ stats()?.checkin_count ?? 0 }}</div>
            <div class="stat-sub">/ {{ stats()?.ticket_sold ?? 0 }} tiket terjual</div>
          }
        </div>

        <div class="stat-card">
          <div class="stat-label">Tiket Terjual</div>
          @if (isLoading()) { <p-skeleton height="2rem" /> } @else {
            <div class="stat-value" style="color: #6C63FF;">{{ stats()?.ticket_sold ?? 0 }}</div>
            <div class="stat-sub">/ {{ stats()?.total_quota ?? 0 }} total kuota</div>
          }
        </div>

        <div class="stat-card">
          <div class="stat-label">Revenue</div>
          @if (isLoading()) { <p-skeleton height="2rem" /> } @else {
            <div class="stat-value" style="color: #22C55E; font-size: 1.25rem;">
              {{ stats()?.revenue_gross_idr | idrCurrency }}
            </div>
          }
        </div>

        <div class="stat-card">
          <div class="stat-label">Kapasitas</div>
          @if (isLoading()) { <p-skeleton height="2rem" /> } @else {
            <div class="stat-value" [style.color]="capacityColor()">{{ stats()?.capacity_pct ?? 0 }}%</div>
            <div class="capacity-bar-wrap">
              <p-progressBar
                [value]="stats()?.capacity_pct ?? 0"
                [style.height]="'8px'"
                [showValue]="false"
              />
            </div>
          }
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="activity-feed">
        <div style="font-size: 1rem; font-weight: 700; color: #111827; margin-bottom: 16px;">
          📡 Aktivitas Real-time
        </div>
        @if (feedItems().length === 0) {
          <p style="color: #9CA3AF; font-size: 0.875rem; text-align: center; padding: 24px 0;">
            Belum ada aktivitas. Menunggu check-in pertama...
          </p>
        }
        @for (item of feedItems(); track item.timestamp) {
          <div class="feed-item">
            <div [class]="item.type === 'TICKET_SOLD' ? 'feed-dot-blue' : 'feed-dot-green'"></div>
            <div class="feed-msg">{{ item.message }}</div>
            <div class="feed-time">{{ item.timestamp | date:'HH:mm' }}</div>
          </div>
        }
      </div>
    </div>

    <!-- Scan Modal -->
    <p-dialog header="Scan Tiket" [(visible)]="showScanModal" [modal]="true" [style]="{width: '400px'}">
      @if (scanResult()) {
        <p-message [severity]="scanSuccess() ? 'success' : 'error'" [text]="scanResult()!" styleClass="w-full mb-3" />
      }
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <label style="font-size: 0.875rem; font-weight: 500;">Kode QR atau Nomor Tiket</label>
        <input pInputText [(ngModel)]="scanInput" placeholder="Scan atau ketik kode tiket..."
          (keydown.enter)="doScan()" style="width: 100%" />
        <button pButton type="button" label="Validasi" [loading]="isScanning()"
          (click)="doScan()"
          style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
      </div>
    </p-dialog>
  `,
})
export class EventDashboardComponent implements OnInit, OnDestroy {
  readonly orgStore = inject(OrganizerStore);
  private readonly orgApi = inject(OrganizerApiService);
  private readonly authStore = inject(AuthStore);
  private readonly wsService = inject(WsService);
  private readonly route = inject(ActivatedRoute);
  private wsSubscription?: Subscription;

  readonly isLoading = signal(false);
  readonly stats = signal<EventLiveStats | null>(null);
  readonly feedItems = signal<ActivityFeedItem[]>([]);
  readonly showScanModal = signal(false);
  readonly scanInput = signal('');
  readonly isScanning = signal(false);
  readonly scanResult = signal<string | null>(null);
  readonly scanSuccess = signal(false);
  private eventId = '';

  eventTitle() {
    return this.orgStore.selectedEvent()?.title ?? 'Event';
  }

  capacityColor() {
    const pct = this.stats()?.capacity_pct ?? 0;
    if (pct >= 90) return '#EF4444';
    if (pct >= 70) return '#F59E0B';
    return '#22C55E';
  }

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('event_id')!;
    this.orgStore.loadEventDetail(this.eventId);
    this.loadStats();

    const token = this.authStore.accessToken();
    if (token) {
      this.wsService.connect('/ws/organizer', token, { eventId: this.eventId });
      this.wsSubscription = this.wsService
        .on<any>('/ws/organizer', 'TICKET_SOLD')
        .subscribe((msg) => {
          this.feedItems.update((items) => [
            { type: 'TICKET_SOLD', message: msg.payload?.message ?? 'Tiket baru terjual', timestamp: new Date().toISOString() },
            ...items.slice(0, 49),
          ]);
          this.loadStats();
        });

      this.wsService.on<any>('/ws/organizer', 'CHECKIN_UPDATE').subscribe((msg) => {
        this.feedItems.update((items) => [
          { type: 'CHECKIN', message: msg.payload?.message ?? 'Check-in berhasil', timestamp: new Date().toISOString() },
          ...items.slice(0, 49),
        ]);
        this.loadStats();
      });

      this.wsService.on<any>('/ws/organizer', 'CAPACITY_WARNING').subscribe(() => {
        this.feedItems.update((items) => [
          { type: 'CHECKIN', message: '⚠️ Stok tiket di bawah 10%!', timestamp: new Date().toISOString() },
          ...items.slice(0, 49),
        ]);
      });
    }
  }

  ngOnDestroy() {
    this.wsSubscription?.unsubscribe();
    this.wsService.disconnect('/ws/organizer');
  }

  loadStats() {
    this.isLoading.set(true);
    this.orgApi.getLiveStats(this.eventId).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.feedItems.set(stats.recent_activity ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openScanModal() {
    this.showScanModal.set(true);
    this.scanResult.set(null);
    this.scanInput.set('');
  }

  doScan() {
    const ticketId = this.scanInput().trim();
    if (!ticketId) return;
    this.isScanning.set(true);
    this.scanResult.set(null);

    this.orgApi.validateTicket(ticketId).subscribe({
      next: (result) => {
        this.isScanning.set(false);
        if (result.status === 'VALID') {
          this.scanSuccess.set(true);
          this.scanResult.set(`✅ Valid — ${result.holder_name}, ${result.ticket_type}${result.seat ? ', Kursi ' + result.seat : ''}`);
        } else if (result.status === 'ALREADY_USED') {
          this.scanSuccess.set(false);
          this.scanResult.set(`❌ Tiket sudah digunakan pada ${result.used_at ? new Date(result.used_at).toLocaleString('id-ID') : '-'}`);
        } else {
          this.scanSuccess.set(false);
          this.scanResult.set(`❌ Tiket tidak valid: ${result.message}`);
        }
        this.scanInput.set('');
      },
      error: () => {
        this.isScanning.set(false);
        this.scanSuccess.set(false);
        this.scanResult.set('❌ Gagal memvalidasi tiket. Coba lagi.');
      },
    });
  }
}
