import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { EventSummary } from '@eventhub/shared-types';
import { IdrCurrencyPipe } from '../../pipes/idr-currency.pipe';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, ButtonModule, TagModule, DatePipe, IdrCurrencyPipe],
  styles: [
    `
      .event-card {
        background: #fff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transition:
          transform 0.2s,
          box-shadow 0.2s;
        cursor: pointer;
        display: flex;
        flex-direction: column;
      }
      .event-card:hover {
        transform: scale(1.02);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }
      .banner-wrap {
        position: relative;
        padding-top: 56.25%;
        background: #f3f4f6;
        overflow: hidden;
      }
      .banner-wrap img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .banner-placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        font-size: 2rem;
      }
      .category-badge {
        position: absolute;
        top: 8px;
        left: 8px;
      }
      .hot-badge {
        position: absolute;
        top: 8px;
        right: 8px;
      }
      .wishlist-btn {
        position: absolute;
        bottom: 8px;
        right: 8px;
      }
      .card-body {
        padding: 16px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .title {
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .meta {
        font-size: 0.875rem;
        color: #6b7280;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .organizer {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: auto;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .verified-icon {
        color: #6c63ff;
        font-size: 0.875rem;
      }
      .price {
        font-size: 1rem;
        font-weight: 700;
        color: #6c63ff;
      }
    `,
  ],
  template: `
    <div class="event-card" [routerLink]="['/events', event.event_id]">
      <div class="banner-wrap">
        @if (event.banner_url) {
          <img [src]="event.banner_url" [alt]="event.title" loading="lazy" />
        } @else {
          <div class="banner-placeholder">
            <i class="pi pi-image"></i>
          </div>
        }

        <div class="category-badge">
          <p-tag [value]="categoryLabel" [rounded]="true" severity="info" />
        </div>

        @if (isAlmostSoldOut) {
          <div class="hot-badge">
            <p-tag value="🔥 Hampir Habis" [rounded]="true" severity="warning" />
          </div>
        }

        @if (event.status === 'CANCELLED') {
          <div class="hot-badge">
            <p-tag value="Dibatalkan" [rounded]="true" severity="danger" />
          </div>
        }

        <div class="wishlist-btn" (click)="onWishlistClick($event)">
          <button
            pButton
            type="button"
            [icon]="event.is_wishlisted ? 'pi pi-heart-fill' : 'pi pi-heart'"
            [style.background]="event.is_wishlisted ? '#FF6584' : 'rgba(255,255,255,0.9)'"
            [style.color]="event.is_wishlisted ? '#fff' : '#FF6584'"
            [style.border]="'none'"
            [style.width]="'32px'"
            [style.height]="'32px'"
            [style.border-radius]="'50%'"
            [style.padding]="'0'"
            [style.cursor]="'pointer'"
          ></button>
        </div>
      </div>

      <div class="card-body">
        <div class="title">{{ event.title }}</div>
        <div class="meta">
          <i class="pi pi-calendar"></i>
          {{ event.start_at | date: 'EEE, d MMM yyyy' : '' : 'id' }}
        </div>
        <div class="meta">
          <i class="pi pi-map-marker"></i>
          {{ event.venue?.city || 'Online' }}
        </div>
        <div class="price">
          @if (event.price_min_idr === 0) {
            Gratis
          } @else {
            Mulai {{ event.price_min_idr | idrCurrency }}
          }
        </div>
        <div class="organizer">
          <i class="pi pi-user-circle"></i>
          {{ event.organizer?.org_name }}
          @if (true) {
            <i class="pi pi-verified verified-icon"></i>
          }
        </div>
      </div>
    </div>
  `,
})
export class EventCardComponent {
  @Input({ required: true }) event!: EventSummary & {
    is_wishlisted?: boolean;
    sold_percentage?: number;
  };
  @Output() wishlistToggled = new EventEmitter<string>();

  get categoryLabel(): string {
    const map: Record<string, string> = {
      MUSIC: 'Musik',
      SEMINAR: 'Seminar',
      SPORT: 'Olahraga',
      EXHIBITION: 'Pameran',
      COMEDY: 'Komedi',
      OTHER: 'Lainnya',
    };
    return map[this.event.category] ?? this.event.category;
  }

  get isAlmostSoldOut(): boolean {
    const pct = (this.event as any).sold_percentage ?? 0;
    return pct >= 90 && this.event.ticket_available;
  }

  onWishlistClick(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.wishlistToggled.emit(this.event.event_id);
  }
}
