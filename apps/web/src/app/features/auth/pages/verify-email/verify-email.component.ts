import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthApiService } from '../../services/auth-api.service';

type VerifyState = 'loading' | 'success' | 'error' | 'unverified';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule],
  styles: [
    `
      .page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f9fafb;
        padding: 24px;
      }
      .card {
        width: 100%;
        max-width: 420px;
        background: #fff;
        border-radius: 16px;
        padding: 40px 32px;
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
        text-align: center;
      }
    `,
  ],
  template: `
    <div class="page">
      <div class="card">
        @switch (state()) {
          @case ('loading') {
            <p-progressSpinner styleClass="w-12 h-12" />
            <h2 style="margin-top: 16px; font-size: 1.125rem; font-weight: 700;">
              Memverifikasi email...
            </h2>
          }
          @case ('success') {
            <div style="font-size: 3rem;">✅</div>
            <h2 style="margin: 12px 0 8px; font-size: 1.25rem; font-weight: 700;">
              Email Terverifikasi!
            </h2>
            <p style="color: #6B7280; font-size: 0.875rem; margin: 0 0 24px;">
              Akun kamu sudah aktif. Kamu bisa masuk sekarang.
            </p>
            <a routerLink="/auth/login">
              <button
                pButton
                type="button"
                label="Masuk Sekarang"
                style="background: #6C63FF; border-color: #6C63FF; border-radius: 9999px;"
              ></button>
            </a>
          }
          @case ('error') {
            <div style="font-size: 3rem;">❌</div>
            <h2 style="margin: 12px 0 8px; font-size: 1.25rem; font-weight: 700;">
              Verifikasi Gagal
            </h2>
            <p style="color: #6B7280; font-size: 0.875rem; margin: 0 0 24px;">
              Link verifikasi tidak valid atau sudah kadaluarsa.
            </p>
            <button
              pButton
              type="button"
              label="Kirim Ulang Email Verifikasi"
              [loading]="isResending()"
              (click)="resend()"
              outlined
              style="border-radius: 9999px;"
            ></button>
          }
          @case ('unverified') {
            <div style="font-size: 3rem;">📧</div>
            <h2 style="margin: 12px 0 8px; font-size: 1.25rem; font-weight: 700;">
              Cek Email Kamu
            </h2>
            <p style="color: #6B7280; font-size: 0.875rem; margin: 0 0 24px;">
              Kami sudah mengirim email verifikasi. Klik link di email untuk mengaktifkan akun.
            </p>
            <button
              pButton
              type="button"
              label="Kirim Ulang Email Verifikasi"
              [loading]="isResending()"
              (click)="resend()"
              outlined
              style="border-radius: 9999px;"
            ></button>
            @if (resendSuccess()) {
              <p style="color: #22C55E; margin-top: 12px; font-size: 0.875rem;">
                Email berhasil dikirim ulang!
              </p>
            }
          }
        }
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authApi = inject(AuthApiService);

  readonly state = signal<VerifyState>('unverified');
  readonly isResending = signal(false);
  readonly resendSuccess = signal(false);

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.state.set('loading');
      this.authApi.verifyEmail(token).subscribe({
        next: () => this.state.set('success'),
        error: () => this.state.set('error'),
      });
    }
  }

  resend() {
    this.isResending.set(true);
    this.resendSuccess.set(false);
    this.authApi.resendVerification().subscribe({
      next: () => {
        this.isResending.set(false);
        this.resendSuccess.set(true);
      },
      error: () => this.isResending.set(false),
    });
  }
}
