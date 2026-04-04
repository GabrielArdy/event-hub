import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { CarouselModule } from 'primeng/carousel';
import { EventsStore } from '../../store/events.store';
import { AuthStore } from '../../../auth/store/auth.store';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { EventCardComponent } from '../../../../shared/components/event-card/event-card.component';

const CATEGORIES = [
  { label: 'Semua', value: '' },
  { label: 'Musik', value: 'MUSIC' },
  { label: 'Seminar', value: 'SEMINAR' },
  { label: 'Olahraga', value: 'SPORT' },
  { label: 'Pameran', value: 'EXHIBITION' },
  { label: 'Komedi', value: 'COMEDY' },
  { label: 'Lainnya', value: 'OTHER' },
];

const CITIES = [
  { label: 'Semua Kota', value: '' },
  { label: 'Jakarta', value: 'Jakarta' },
  { label: 'Surabaya', value: 'Surabaya' },
  { label: 'Bandung', value: 'Bandung' },
  { label: 'Bali', value: 'Bali' },
  { label: 'Yogyakarta', value: 'Yogyakarta' },
];

@Component({
  selector: 'app-event-listing',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    ChipModule,
    SkeletonModule,
    PaginatorModule,
    CarouselModule,
    NavbarComponent,
    EventCardComponent,
  ],
  styles: [
    `
      .hero {
        background: linear-gradient(135deg, #6c63ff 0%, #5a52d5 100%);
        color: #fff;
        padding: 64px 24px;
        text-align: center;
      }
      .hero h1 {
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 8px;
      }
      .hero p {
        font-size: 1rem;
        opacity: 0.85;
        margin: 0 0 24px;
      }
      .search-input-wrap {
        max-width: 480px;
        margin: 0 auto;
        display: flex;
        gap: 8px;
      }
      .search-input-wrap input {
        flex: 1;
        padding: 12px 16px;
        border-radius: 9999px;
        border: none;
        font-size: 1rem;
        outline: none;
      }
      .filter-bar {
        background: #fff;
        border-bottom: 1px solid #e5e7eb;
        padding: 12px 24px;
        display: flex;
        gap: 12px;
        align-items: center;
        overflow-x: auto;
      }
      .filter-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        flex-shrink: 0;
      }
      .content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 32px 24px;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .section-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #111827;
      }
      .results-count {
        font-size: 0.875rem;
        color: #6b7280;
      }
      .events-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }
      @media (max-width: 1024px) {
        .events-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 640px) {
        .events-grid {
          grid-template-columns: 1fr;
        }
      }
      .empty-state {
        text-align: center;
        padding: 64px 24px;
      }
      .empty-icon {
        font-size: 3rem;
        margin-bottom: 16px;
      }
      .empty-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 8px;
      }
      .empty-desc {
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0 0 24px;
      }
    `,
  ],
  template: `
    <app-navbar />

    <!-- Hero -->
    <div class="hero">
      <h1>Temukan Acara Terbaikmu</h1>
      <p>Ribuan acara seru menunggu kamu</p>
      <div class="search-input-wrap">
        <input
          type="text"
          placeholder="Cari konser, seminar, festival..."
          [value]="searchQuery()"
          (input)="onSearch($event)"
        />
        <button
          pButton
          type="button"
          icon="pi pi-search"
          style="background: #fff; color: #6C63FF; border: none; border-radius: 9999px; width: 48px; height: 48px;"
        ></button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <span class="filter-label">Kategori:</span>
      @for (cat of categories; track cat.value) {
        <button
          pButton
          type="button"
          [label]="cat.label"
          [outlined]="selectedCategory() !== cat.value"
          size="small"
          [style.border-radius]="'9999px'"
          [style.background]="selectedCategory() === cat.value ? '#6C63FF' : ''"
          [style.border-color]="selectedCategory() === cat.value ? '#6C63FF' : ''"
          (click)="selectCategory(cat.value)"
        ></button>
      }
      <p-dropdown
        [options]="cities"
        optionLabel="label"
        optionValue="value"
        [(ngModel)]="selectedCity"
        (ngModelChange)="onCityChange($event)"
        placeholder="Kota"
        styleClass="ml-auto"
      />
    </div>

    <!-- Content -->
    <div class="content">
      @if (eventsStore.activeFiltersCount() > 0) {
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px;">
          <span style="font-size: 0.875rem; color: #6B7280;">Filter aktif:</span>
          @if (selectedCategory()) {
            <p-chip [label]="categoryLabel()" [removable]="true" (onRemove)="selectCategory('')" />
          }
          @if (selectedCity) {
            <p-chip [label]="selectedCity" [removable]="true" (onRemove)="onCityChange('')" />
          }
          <button
            pButton
            type="button"
            label="Reset"
            link
            size="small"
            (click)="resetFilters()"
          ></button>
        </div>
      }

      <div class="section-header">
        <h2 class="section-title">Semua Acara</h2>
        @if (!eventsStore.isLoading()) {
          <span class="results-count">{{ eventsStore.total() }} acara ditemukan</span>
        }
      </div>

      @if (eventsStore.isLoading()) {
        <div class="events-grid">
          @for (i of skeletons; track i) {
            <div style="border-radius: 16px; overflow: hidden;">
              <p-skeleton height="200px" styleClass="w-full" />
              <div style="padding: 16px;">
                <p-skeleton height="1rem" styleClass="mb-2" />
                <p-skeleton height="0.75rem" width="60%" styleClass="mb-2" />
                <p-skeleton height="0.75rem" width="40%" />
              </div>
            </div>
          }
        </div>
      } @else if (!eventsStore.hasEvents()) {
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Tidak ada acara ditemukan</div>
          <div class="empty-desc">
            @if (eventsStore.activeFiltersCount() > 0) {
              Tidak ada acara untuk filter yang dipilih.
            } @else {
              Belum ada acara tersedia saat ini.
            }
          </div>
          @if (eventsStore.activeFiltersCount() > 0) {
            <button
              pButton
              type="button"
              label="Reset Filter"
              (click)="resetFilters()"
              style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"
            ></button>
          }
        </div>
      } @else {
        <div class="events-grid">
          @for (event of eventsStore.events(); track event.event_id) {
            <app-event-card [event]="event" (wishlistToggled)="onWishlistToggle($event)" />
          }
        </div>

        @if (eventsStore.totalPages() > 1) {
          <div style="margin-top: 32px; display: flex; justify-content: center;">
            <p-paginator
              [rows]="12"
              [totalRecords]="eventsStore.total()"
              [first]="(eventsStore.currentPage() - 1) * 12"
              (onPageChange)="onPageChange($event)"
            />
          </div>
        }
      }
    </div>
  `,
})
export class EventListingComponent implements OnInit {
  readonly eventsStore = inject(EventsStore);
  readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly categories = CATEGORIES;
  readonly cities = CITIES;
  readonly skeletons = [1, 2, 3, 4, 5, 6];

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('');
  selectedCity = '';

  categoryLabel() {
    return CATEGORIES.find((c) => c.value === this.selectedCategory())?.label ?? '';
  }

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    if (params['category']) this.selectedCategory.set(params['category']);
    if (params['city']) this.selectedCity = params['city'];
    if (params['search']) this.searchQuery.set(params['search']);
    this.loadEvents();
  }

  loadEvents() {
    const filters: any = {};
    if (this.selectedCategory()) filters.category = this.selectedCategory();
    if (this.selectedCity) filters.city = this.selectedCity;
    if (this.searchQuery()) filters.search = this.searchQuery();
    this.eventsStore.setFilters(filters);
    this.eventsStore.loadEvents(filters);
    this.updateUrl();
  }

  onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.loadEvents();
  }

  selectCategory(cat: string) {
    this.selectedCategory.set(cat);
    this.loadEvents();
  }

  onCityChange(city: string) {
    this.selectedCity = city;
    this.loadEvents();
  }

  resetFilters() {
    this.selectedCategory.set('');
    this.selectedCity = '';
    this.searchQuery.set('');
    this.loadEvents();
  }

  onWishlistToggle(eventId: string) {
    if (!this.authStore.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.eventsStore.toggleWishlist(eventId);
  }

  onPageChange(event: any) {
    this.eventsStore.setPage(event.page + 1);
    this.eventsStore.loadEvents(this.eventsStore.filters());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private updateUrl() {
    const queryParams: any = {};
    if (this.selectedCategory()) queryParams.category = this.selectedCategory();
    if (this.selectedCity) queryParams.city = this.selectedCity;
    if (this.searchQuery()) queryParams.search = this.searchQuery();
    this.router.navigate([], { queryParams, replaceUrl: true });
  }
}
