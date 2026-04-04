import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { EventCardComponent } from '../../../../shared/components/event-card/event-card.component';
import { AccountApiService } from '../../services/account-api.service';
import { EventSummary } from '@eventhub/shared-types';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink, ButtonModule, SkeletonModule, NavbarComponent, EventCardComponent],
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .page-title { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 24px; }
    .events-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    @media (max-width: 1024px) { .events-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .events-grid { grid-template-columns: 1fr; } }
    .empty-state { text-align: center; padding: 64px 24px; }
  `],
  template: `
    <app-navbar />
    <div class="page">
      <h1 class="page-title">Wishlist ({{ wishlist().length }})</h1>

      @if (isLoading()) {
        <div class="events-grid">
          @for (i of [1,2,3]; track i) {
            <p-skeleton height="300px" />
          }
        </div>
      } @else if (wishlist().length === 0) {
        <div class="empty-state">
          <div style="font-size: 3rem; margin-bottom: 12px;">❤️</div>
          <div style="font-size: 1rem; font-weight: 600; color: #374151;">Wishlist kamu masih kosong</div>
          <p style="color: #6B7280; font-size: 0.875rem; margin: 8px 0 24px;">Simpan acara favoritmu agar mudah ditemukan kembali.</p>
          <a routerLink="/">
            <button pButton type="button" label="Cari Acara"
              style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
          </a>
        </div>
      } @else {
        <div class="events-grid">
          @for (event of wishlist(); track event.event_id) {
            <app-event-card
              [event]="$any({...event, is_wishlisted: true})"
              (wishlistToggled)="removeFromWishlist($event)"
            />
          }
        </div>
      }
    </div>
  `,
})
export class WishlistComponent implements OnInit {
  private readonly accountApi = inject(AccountApiService);

  readonly isLoading = signal(false);
  readonly wishlist = signal<EventSummary[]>([]);

  ngOnInit() {
    this.isLoading.set(true);
    this.accountApi.getWishlist().subscribe({
      next: (items) => { this.wishlist.set(items); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  removeFromWishlist(eventId: string) {
    // Optimistic remove
    this.wishlist.update((list) => list.filter((e) => e.event_id !== eventId));
    this.accountApi.removeFromWishlist(eventId).subscribe({
      error: () => this.ngOnInit(), // rollback on error
    });
  }
}
