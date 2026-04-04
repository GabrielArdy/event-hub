import { Component, inject, OnInit, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule],
  styles: [`
    .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F9FAFB; padding: 24px; }
    .card { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .logo { text-align: center; font-size: 1.75rem; font-weight: 700; color: #6C63FF; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #6B7280; font-size: 0.875rem; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    label { font-size: 0.875rem; font-weight: 500; color: #374151; }
    .error-text { font-size: 0.75rem; color: #EF4444; }
    .back-link { display: block; text-align: center; font-size: 0.875rem; color: #6C63FF; text-decoration: none; margin-top: 16px; }
    .success-box { background: #DCFCE7; border: 1px solid #BBF7D0; border-radius: 12px; padding: 24px; text-align: center; }
  `],
  template: `
    <div class="page">
      <div class="card">
        @if (authStore.forgotPasswordSent()) {
          <div class="success-box">
            <div style="font-size: 2.5rem;">📧</div>
            <h3 style="margin: 12px 0 8px;">Email Terkirim!</h3>
            <p style="color: #6B7280; font-size: 0.875rem;">
              Cek email <strong>{{ submittedEmail }}</strong> dan ikuti instruksi untuk reset password.
            </p>
            <a class="back-link" routerLink="/auth/login">Kembali ke Login</a>
          </div>
        } @else {
          <div class="logo">EventHub</div>
          <div class="subtitle">Masukkan email kamu untuk reset password</div>

          @if (authStore.error()) {
            <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-3" />
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="field">
              <label for="email">Email</label>
              <input pInputText id="email" type="email" formControlName="email"
                placeholder="email@contoh.com" style="width: 100%" />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <span class="error-text">Email tidak valid</span>
              }
            </div>

            <button pButton type="submit" label="Kirim Link Reset"
              [loading]="authStore.isLoading()" [disabled]="form.invalid || authStore.isLoading()"
              style="width: 100%; background: #6C63FF; border-color: #6C63FF; border-radius: 9999px;"></button>
          </form>

          <a class="back-link" routerLink="/auth/login">← Kembali ke Login</a>
        }
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  submittedEmail = '';

  readonly errorMessage = computed(() =>
    this.authStore.error() === 'USER_NOT_FOUND'
      ? 'Email tidak terdaftar.'
      : 'Gagal mengirim email. Coba lagi.',
  );

  readonly form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });

  ngOnInit() { this.authStore.clearError(); }

  onSubmit() {
    if (this.form.invalid) return;
    this.submittedEmail = this.form.value.email!;
    this.authStore.forgotPassword(this.form.value.email!);
  }
}
