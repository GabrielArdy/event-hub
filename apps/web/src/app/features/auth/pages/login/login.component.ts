import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    CardModule,
  ],
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f9fafb;
        padding: 24px;
      }
      .login-card {
        width: 100%;
        max-width: 420px;
      }
      .logo {
        text-align: center;
        font-size: 1.75rem;
        font-weight: 700;
        color: #6c63ff;
        margin-bottom: 8px;
      }
      .subtitle {
        text-align: center;
        color: #6b7280;
        font-size: 0.875rem;
        margin-bottom: 24px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }
      label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }
      .error-text {
        font-size: 0.75rem;
        color: #ef4444;
      }
      .forgot-link {
        display: block;
        text-align: right;
        font-size: 0.875rem;
        color: #6c63ff;
        text-decoration: none;
        margin-top: -8px;
        margin-bottom: 16px;
      }
      .register-link {
        text-align: center;
        font-size: 0.875rem;
        color: #6b7280;
        margin-top: 16px;
      }
      .register-link a {
        color: #6c63ff;
        font-weight: 600;
        text-decoration: none;
      }
      .lockout-timer {
        background: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 12px;
        font-size: 0.875rem;
        color: #dc2626;
        margin-bottom: 16px;
        text-align: center;
      }
    `,
  ],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="logo">EventHub</div>
        <div class="subtitle">Masuk ke akunmu</div>

        @if (lockoutRemaining() > 0) {
          <div class="lockout-timer">
            Akun terkunci. Coba lagi dalam
            <strong>{{ lockoutLabel() }}</strong>
          </div>
        }

        @if (authStore.error() && !lockoutRemaining()) {
          <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-3" />
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="field">
            <label for="email">Email</label>
            <input
              pInputText
              id="email"
              type="email"
              formControlName="email"
              placeholder="email@contoh.com"
              style="width: 100%"
              [class.ng-invalid]="form.get('email')?.invalid && form.get('email')?.touched"
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="error-text">Email tidak valid</span>
            }
          </div>

          <div class="field">
            <label for="password">Password</label>
            <p-password
              id="password"
              formControlName="password"
              [toggleMask]="true"
              [feedback]="false"
              styleClass="w-full"
              inputStyleClass="w-full"
              placeholder="Password kamu"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="error-text">Password wajib diisi</span>
            }
          </div>

          <a class="forgot-link" routerLink="/auth/forgot-password">Lupa password?</a>

          <button
            pButton
            type="submit"
            label="Masuk"
            [loading]="authStore.isLoading()"
            [disabled]="form.invalid || authStore.isLoading() || lockoutRemaining() > 0"
            style="width: 100%; background: #6C63FF; border-color: #6C63FF; border-radius: 9999px;"
          ></button>
        </form>

        <div class="register-link">
          Belum punya akun? <a routerLink="/auth/register">Daftar sekarang</a>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit, OnDestroy {
  readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private lockoutInterval: ReturnType<typeof setInterval> | null = null;

  readonly lockoutRemaining = signal(0);

  readonly lockoutLabel = computed(() => {
    const s = this.lockoutRemaining();
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  });

  readonly errorMessage = computed(() => {
    const code = this.authStore.error();
    switch (code) {
      case 'INVALID_CREDENTIALS':
        return 'Email atau password salah.';
      case 'ACCOUNT_LOCKED':
        return 'Akun dikunci sementara karena terlalu banyak percobaan login.';
      case 'ACCOUNT_NOT_VERIFIED':
        return 'Akun belum diverifikasi. Cek email kamu.';
      case 'ACCOUNT_INACTIVE':
        return 'Akun tidak aktif. Hubungi support.';
      default:
        return 'Login gagal. Coba lagi.';
    }
  });

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit() {
    this.authStore.clearError();
    this.lockoutInterval = setInterval(() => {
      const expiresAt = (this.authStore as any).lockoutExpiresAt?.();
      if (expiresAt) {
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        this.lockoutRemaining.set(remaining);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.lockoutInterval) clearInterval(this.lockoutInterval);
  }

  onSubmit() {
    if (this.form.invalid || this.lockoutRemaining() > 0) return;
    this.authStore.login({
      email: this.form.value.email!,
      password: this.form.value.password!,
    });
  }
}
