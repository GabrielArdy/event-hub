import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TabViewModule } from 'primeng/tabview';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { Subscription } from 'rxjs';
import { EventsStore } from '../../store/events.store';
import { AuthStore } from '../../../auth/store/auth.store';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { SeatMapComponent } from '../../../../shared/components/seat-map/seat-map.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { PriceDisplayComponent } from '../../../../shared/components/price-display/price-display.component';
import { WsService } from '../../../../core/services/ws.service';
import { IdrCurrencyPipe } from '../../../../shared/pipes/idr-currency.pipe';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    RouterLink, DatePipe, IdrCurrencyPipe,
    ButtonModule, SkeletonModule, TabViewModule, DividerModule, TagModule, MessageModule,
    NavbarComponent, SeatMapComponent, StatusBadgeComponent, PriceDisplayComponent,
  ],
  styles: [`
    .breadcrumb { padding: 16px 24px; font-size: 0.875rem; color: #6B7280; max-width: 1200px; margin: 0 auto; }
    .breadcrumb a { color: #6C63FF; text-decoration: none; }
    .banner { width: 100%; aspect-ratio: 16/9; object-fit: cover; max-height: 480px; display: block; }
    .banner-placeholder { width: 100%; height: 320px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; }
    .content { max-width: 1200px; margin: 0 auto; padding: 32px 24px; display: grid; grid-template-columns: 1fr 380px; gap: 40px; }
    @media (max-width: 1024px) { .content { grid-template-columns: 1fr; } }
    .event-title { font-size: 1.75rem; font-weight: 700; color: #111827; margin: 0 0 16px; }
    .organizer-row { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .org-avatar { width: 40px; height: 40px; border-radius: 50%; background: #6C63FF; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; flex-shrink: 0; }
    .meta-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; font-size: 0.875rem; color: #374151; }
    .meta-icon { color: #6C63FF; flex-shrink: 0; margin-top: 2px; }
    .sticky-card { position: sticky; top: 80px; background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 24px; }
    .ticket-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #F3F4F6; }
    .ticket-row:last-child { border-bottom: none; }
    .cancelled-banner { background: #FEE2E2; border: 1px solid #FECACA; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 16px; color: #DC2626; font-weight: 600; }
  `],
  template: `
    <app-navbar />

    @if (eventsStore.isDetailLoading()) {
      <div style="max-width: 1200px; margin: 0 auto; padding: 32px 24px;">
        <p-skeleton height="360px" styleClass="w-full mb-4" />
        <div style="display: grid; grid-template-columns: 1fr 380px; gap: 40px;">
          <div>
            <p-skeleton height="2.5rem" styleClass="mb-3" />
            <p-skeleton height="1rem" width="40%" styleClass="mb-4" />
            <p-skeleton height="1rem" styleClass="mb-2" />
            <p-skeleton height="1rem" styleClass="mb-2" />
            <p-skeleton height="1rem" width="60%" />
          </div>
          <p-skeleton height="300px" />
        </div>
      </div>
    } @else if (eventsStore.selectedEvent()) {
      @let event = eventsStore.selectedEvent()!;

      <div class="breadcrumb">
        <a routerLink="/">Beranda</a> &rsaquo;
        <a [routerLink]="['/']" [queryParams]="{category: event.category}">{{ categoryLabel(event.category) }}</a> &rsaquo;
        {{ event.title }}
      </div>

      @if (event.banner_url) {
        <img [src]="event.banner_url" [alt]="event.title" class="banner" />
      } @else {
        <div class="banner-placeholder">
          <i class="pi pi-image" style="font-size: 3rem; color: #9CA3AF;"></i>
        </div>
      }

      <div class="content">
        <!-- LEFT -->
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <app-status-badge [status]="event.status" />
            <p-tag [value]="categoryLabel(event.category)" severity="info" [rounded]="true" />
          </div>

          <h1 class="event-title">{{ event.title }}</h1>

          <div class="organizer-row">
            @if (event.organizer?.avatar_url) {
              <img [src]="event.organizer.avatar_url" class="org-avatar" style="object-fit: cover;" />
            } @else {
              <div class="org-avatar">{{ event.organizer?.org_name?.charAt(0) }}</div>
            }
            <div>
              <div style="font-weight: 600; font-size: 0.875rem;">{{ event.organizer?.org_name }}</div>
              <div style="font-size: 0.75rem; color: #6B7280;">Penyelenggara</div>
            </div>
          </div>

          <div class="meta-row">
            <i class="pi pi-calendar meta-icon"></i>
            <div>
              <div>{{ event.start_at | date:'EEEE, d MMMM yyyy' }}</div>
              <div style="color: #6B7280;">{{ event.start_at | date:'HH:mm' }} – {{ event.end_at | date:'HH:mm' }} WIB</div>
            </div>
          </div>

          <div class="meta-row">
            <i class="pi pi-map-marker meta-icon"></i>
            <div>
              @if (event.venue?.type === 'ONLINE') {
                <div>Online</div>
              } @else {
                <div>{{ event.venue?.name }}</div>
                <div style="color: #6B7280;">{{ event.venue?.city }}</div>
              }
            </div>
          </div>

          <p-divider />

          <p-tabView>
            <p-tabPanel header="Deskripsi">
              <div style="line-height: 1.7; color: #374151; white-space: pre-wrap;">{{ event.description }}</div>
            </p-tabPanel>
            <p-tabPanel header="Tipe Tiket">
              @for (tt of event.ticket_types; track tt.ticket_type_id) {
                <div class="ticket-row">
                  <div>
                    <div style="font-weight: 600; color: #111827;">{{ tt.name }}</div>
                    @if (tt.description) {
                      <div style="font-size: 0.75rem; color: #6B7280;">{{ tt.description }}</div>
                    }
                    <div style="font-size: 0.75rem; color: #6B7280; margin-top: 2px;">
                      {{ tt.is_available ? tt.quota_remaining + ' tersisa' : 'Habis' }}
                    </div>
                  </div>
                  <div style="font-weight: 700; color: #6C63FF;">
                    {{ tt.price_idr === 0 ? 'Gratis' : (tt.price_idr | idrCurrency) }}
                  </div>
                </div>
              }
            </p-tabPanel>
            @if (event.layout?.type === 'SEAT_MAP') {
              <p-tabPanel header="Denah Kursi">
                <app-seat-map [seatMapData]="$any(event.layout?.data)" />
              </p-tabPanel>
            }
          </p-tabView>
        </div>

        <!-- RIGHT (sticky) -->
        <div>
          <div class="sticky-card">
            @if (event.status === 'CANCELLED') {
              <div class="cancelled-banner">
                <i class="pi pi-times-circle"></i> Event Dibatalkan<br>
                <span style="font-size: 0.875rem; font-weight: 400; color: #991B1B;">Refund otomatis akan diproses.</span>
              </div>
            }

            @if (!event.ticket_available && event.status !== 'CANCELLED') {
              <p-message severity="error" text="Tiket Habis" styleClass="w-full mb-3" />
            }

            <div style="margin-bottom: 20px;">
              <div style="font-size: 0.875rem; color: #6B7280; margin-bottom: 4px;">Harga mulai dari</div>
              <app-price-display [amount]="event.price_min_idr" size="1.5rem" />
            </div>

            <button pButton type="button"
              [label]="buyBtnLabel(event)"
              [disabled]="!event.ticket_available || event.status === 'CANCELLED' || event.status === 'COMPLETED'"
              (click)="onBuyClick(event)"
              style="width: 100%; border-radius: 9999px; background: #6C63FF; border-color: #6C63FF; font-size: 1rem; padding: 12px 0;"
            ></button>

            <button pButton type="button"
              [icon]="event.is_wishlisted ? 'pi pi-heart-fill' : 'pi pi-heart'"
              [label]="event.is_wishlisted ? 'Tersimpan' : 'Tambah Wishlist'"
              outlined
              (click)="onWishlistClick(event.event_id)"
              style="width: 100%; border-radius: 9999px; margin-top: 8px;"
            ></button>

            <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: center;">
              <button pButton type="button" label="Salin Link" icon="pi pi-link" text size="small" (click)="copyLink()"></button>
              <button pButton type="button" label="WhatsApp" icon="pi pi-whatsapp" text size="small" (click)="shareWhatsApp(event)"></button>
            </div>
          </div>
        </div>
      </div>
    } @else if (eventsStore.error()) {
      <div style="text-align: center; padding: 80px 24px;">
        <div style="font-size: 3rem; margin-bottom: 16px;">😕</div>
        <h2 style="font-size: 1.25rem; font-weight: 700; color: #374151;">Acara tidak ditemukan</h2>
        <p style="color: #6B7280; margin: 8px 0 24px;">Acara yang kamu cari tidak ada atau sudah dihapus.</p>
        <a routerLink="/">
          <button pButton type="button" label="Kembali ke Beranda"
            style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
        </a>
      </div>
    }
  `,
})
export class EventDetailComponent implements OnInit, OnDestroy {
  readonly eventsStore = inject(EventsStore);
  readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly wsService = inject(WsService);
  private wsSubscription?: Subscription;

  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('event_id')!;
    this.eventsStore.loadEventDetail(eventId);

    const token = this.authStore.accessToken();
    if (token) {
      this.wsService.connect('/ws/seats', token, { eventId });
      this.wsSubscription = this.wsService
        .on<any>('/ws/seats', 'SEAT_LOCKED')
        .subscribe(() => this.eventsStore.loadSeatMap(eventId));
    }
  }

  ngOnDestroy() {
    this.wsSubscription?.unsubscribe();
    this.wsService.disconnect('/ws/seats');
  }

  categoryLabel(cat: string): string {
    const map: Record<string, string> = {
      MUSIC: 'Musik', SEMINAR: 'Seminar', SPORT: 'Olahraga',
      EXHIBITION: 'Pameran', COMEDY: 'Komedi', OTHER: 'Lainnya',
    };
    return map[cat] ?? cat;
  }

  buyBtnLabel(event: any): string {
    if (event.status === 'CANCELLED') return 'Event Dibatalkan';
    if (event.status === 'COMPLETED') return 'Event Selesai';
    if (!event.ticket_available) return 'Tiket Habis';
    return 'Beli Tiket';
  }

  onBuyClick(event: any) {
    if (!this.authStore.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/events/${event.event_id}` } });
      return;
    }
    this.router.navigate(['/checkout', event.event_id]);
  }

  onWishlistClick(eventId: string) {
    if (!this.authStore.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.eventsStore.toggleWishlist(eventId);
  }

  copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }

  shareWhatsApp(event: any) {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${encodeURIComponent(event.title + ' ' + window.location.href)}`, '_blank');
  }
}
