import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthStore } from '../../../features/auth/store/auth.store';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ButtonModule, AvatarModule, MenuModule],
  styles: [
    `
      .navbar {
        position: sticky;
        top: 0;
        z-index: 100;
        background: #fff;
        border-bottom: 1px solid #e5e7eb;
        height: 64px;
        display: flex;
        align-items: center;
        padding: 0 24px;
        gap: 16px;
      }
      .logo {
        font-size: 1.25rem;
        font-weight: 700;
        color: #6c63ff;
        text-decoration: none;
        flex-shrink: 0;
      }
      .search-bar {
        flex: 1;
        max-width: 400px;
        display: flex;
        align-items: center;
        background: #f3f4f6;
        border-radius: 9999px;
        padding: 8px 16px;
        gap: 8px;
        cursor: text;
      }
      .search-bar input {
        border: none;
        background: transparent;
        outline: none;
        font-size: 0.875rem;
        flex: 1;
      }
      .search-bar i {
        color: #6b7280;
      }
      .nav-links {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
      }
      .nav-link {
        text-decoration: none;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 8px;
        transition: background 0.15s;
      }
      .nav-link:hover {
        background: #f3f4f6;
      }
      .nav-link.active {
        color: #6c63ff;
        background: #ede9fe;
      }
      .user-menu {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 9999px;
        transition: background 0.15s;
      }
      .user-menu:hover {
        background: #f3f4f6;
      }
      .user-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #111827;
      }
      @media (max-width: 640px) {
        .search-bar {
          display: none;
        }
        .nav-link {
          display: none;
        }
      }
    `,
  ],
  template: `
    <nav class="navbar">
      <a class="logo" routerLink="/">EventHub</a>

      <div class="search-bar" (click)="navigateToSearch()">
        <i class="pi pi-search"></i>
        <input type="text" placeholder="Cari acara..." readonly />
      </div>

      <div class="nav-links">
        <a
          class="nav-link"
          routerLink="/"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          >Beranda</a
        >

        @if (authStore.isLoggedIn()) {
          @if (authStore.isOrganizer()) {
            <a class="nav-link" routerLink="/organizer" routerLinkActive="active">Dashboard EO</a>
          } @else {
            <a class="nav-link" routerLink="/me/tickets" routerLinkActive="active">Tiket Saya</a>
            <a class="nav-link" routerLink="/me/wishlist" routerLinkActive="active">Wishlist</a>
          }

          <div class="user-menu" (click)="menu.toggle($event)">
            <p-avatar
              [label]="avatarLabel"
              shape="circle"
              [style]="{ 'background-color': '#6C63FF', color: '#fff' }"
            />
            <span class="user-name">{{ authStore.user()?.full_name?.split(' ')[0] }}</span>
            <i class="pi pi-chevron-down" style="font-size: 0.75rem; color: #6B7280;"></i>
          </div>

          <p-menu #menu [model]="userMenuItems" [popup]="true" />
        } @else {
          <a routerLink="/auth/login">
            <button pButton type="button" label="Masuk" outlined size="small"></button>
          </a>
          <a routerLink="/auth/register">
            <button
              pButton
              type="button"
              label="Daftar"
              size="small"
              [style.background]="'#6C63FF'"
              [style.border-color]="'#6C63FF'"
            ></button>
          </a>
        }
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  get avatarLabel(): string {
    return this.authStore.user()?.full_name?.charAt(0)?.toUpperCase() ?? 'U';
  }

  readonly userMenuItems: MenuItem[] = [
    {
      label: 'Profil Saya',
      icon: 'pi pi-user',
      command: () => this.router.navigate(['/me/profile']),
    },
    {
      label: 'Tiket Saya',
      icon: 'pi pi-ticket',
      command: () => this.router.navigate(['/me/tickets']),
      visible: !this.authStore.isOrganizer(),
    },
    {
      label: 'Riwayat Transaksi',
      icon: 'pi pi-credit-card',
      command: () => this.router.navigate(['/me/transactions']),
    },
    { separator: true },
    {
      label: 'Keluar',
      icon: 'pi pi-sign-out',
      command: () => this.authStore.logout(),
    },
  ];

  navigateToSearch() {
    this.router.navigate(['/'], { queryParams: { focus: 'search' } });
  }
}
