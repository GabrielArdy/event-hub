import { Component, inject, OnInit, computed } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { AuthStore } from '../../store/auth.store';

function passwordMatchValidator(ctrl: AbstractControl): ValidationErrors | null {
  const p = ctrl.get('password')?.value;
  const c = ctrl.get('confirmPassword')?.value;
  return p && c && p !== c ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, PasswordModule, MessageModule],
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
        padding: 32px;
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
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
      .success-box {
        background: #dcfce7;
        border: 1px solid #bbf7d0;
        border-radius: 12px;
        padding: 24px;
        text-align: center;
      }
    `,
  ],
  template: `
    <div class="page">
      <div class="card">
        @if (authStore.resetPasswordSuccess()) {
          <div class="success-box">
            <div style="font-size: 2.5rem;">🔐</div>
            <h3 style="margin: 12px 0 8px;">Password Berhasil Diubah!</h3>
            <p style="color: #6B7280; font-size: 0.875rem;">
              Kamu bisa masuk dengan password baru.
            </p>
            <a routerLink="/auth/login">
              <button
                pButton
                type="button"
                label="Masuk Sekarang"
                style="margin-top: 16px; background: #6C63FF; border-color: #6C63FF; border-radius: 9999px;"
              ></button>
            </a>
          </div>
        } @else {
          <div class="logo">EventHub</div>
          <div class="subtitle">Buat password baru</div>

          @if (!token) {
            <p-message
              severity="error"
              text="Link reset tidak valid atau sudah kadaluarsa."
              styleClass="w-full mb-3"
            />
          }
          @if (authStore.error()) {
            <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-3" />
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="field">
              <label for="password">Password Baru</label>
              <p-password
                id="password"
                formControlName="password"
                [toggleMask]="true"
                styleClass="w-full"
                inputStyleClass="w-full"
                placeholder="Min. 8 karakter"
              />
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <span class="error-text"
                  >Password min. 8 karakter dengan huruf besar, kecil, dan angka</span
                >
              }
            </div>

            <div class="field">
              <label for="confirmPassword">Konfirmasi Password</label>
              <p-password
                id="confirmPassword"
                formControlName="confirmPassword"
                [toggleMask]="true"
                [feedback]="false"
                styleClass="w-full"
                inputStyleClass="w-full"
                placeholder="Ulangi password baru"
              />
              @if (form.errors?.['passwordMismatch'] && form.get('confirmPassword')?.touched) {
                <span class="error-text">Password tidak sama</span>
              }
            </div>

            <button
              pButton
              type="submit"
              label="Simpan Password Baru"
              [loading]="authStore.isLoading()"
              [disabled]="form.invalid || authStore.isLoading() || !token"
              style="width: 100%; background: #6C63FF; border-color: #6C63FF; border-radius: 9999px;"
            ></button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  token = '';

  readonly errorMessage = computed(() => {
    const code = this.authStore.error();
    if (code === 'INVALID_RESET_TOKEN') return 'Link tidak valid atau sudah kadaluarsa.';
    return 'Gagal mengubah password. Coba lagi.';
  });

  readonly form = this.fb.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.authStore.clearError();
  }

  onSubmit() {
    if (this.form.invalid || !this.token) return;
    this.authStore.resetPassword({ token: this.token, newPassword: this.form.value.password! });
  }
}
