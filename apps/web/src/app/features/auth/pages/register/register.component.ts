import { Component, inject, OnInit, computed } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageModule } from 'primeng/message';
import { AuthStore } from '../../store/auth.store';

function passwordMatchValidator(ctrl: AbstractControl): ValidationErrors | null {
  const p = ctrl.get('password')?.value;
  const c = ctrl.get('confirmPassword')?.value;
  return p && c && p !== c ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    RadioButtonModule,
    MessageModule,
  ],
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
        max-width: 480px;
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
      .role-group {
        display: flex;
        gap: 16px;
      }
      .role-option {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        cursor: pointer;
        transition: border-color 0.15s;
      }
      .role-option.selected {
        border-color: #6c63ff;
        background: #ede9fe;
      }
      .login-link {
        text-align: center;
        font-size: 0.875rem;
        color: #6b7280;
        margin-top: 16px;
      }
      .login-link a {
        color: #6c63ff;
        font-weight: 600;
        text-decoration: none;
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
        @if (authStore.registerSuccess()) {
          <div class="success-box">
            <div style="font-size: 2.5rem;">✅</div>
            <h3 style="margin: 12px 0 8px;">Pendaftaran Berhasil!</h3>
            <p style="color: #6B7280; font-size: 0.875rem;">
              Cek email <strong>{{ form.value.email }}</strong> untuk verifikasi akun kamu.
            </p>
            <a routerLink="/auth/login">
              <button
                pButton
                type="button"
                label="Ke Halaman Login"
                style="margin-top: 16px; background: #6C63FF; border-color: #6C63FF; border-radius: 9999px;"
              ></button>
            </a>
          </div>
        } @else {
          <div class="logo">EventHub</div>
          <div class="subtitle">Buat akun baru</div>

          @if (authStore.error()) {
            <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-3" />
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="field">
              <label>Tipe Akun</label>
              <div class="role-group">
                <div
                  class="role-option"
                  [class.selected]="form.get('role')?.value === 'END_USER'"
                  (click)="form.get('role')?.setValue('END_USER')"
                >
                  <p-radioButton formControlName="role" value="END_USER" />
                  <div>
                    <div style="font-size: 0.875rem; font-weight: 500;">Penonton</div>
                    <div style="font-size: 0.75rem; color: #6B7280;">Beli tiket acara</div>
                  </div>
                </div>
                <div
                  class="role-option"
                  [class.selected]="form.get('role')?.value === 'ORGANIZER'"
                  (click)="form.get('role')?.setValue('ORGANIZER')"
                >
                  <p-radioButton formControlName="role" value="ORGANIZER" />
                  <div>
                    <div style="font-size: 0.875rem; font-weight: 500;">Organizer</div>
                    <div style="font-size: 0.75rem; color: #6B7280;">Buat &amp; kelola acara</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="field">
              <label for="fullName">Nama Lengkap</label>
              <input
                pInputText
                id="fullName"
                formControlName="fullName"
                placeholder="Budi Santoso"
                style="width: 100%"
              />
              @if (form.get('fullName')?.invalid && form.get('fullName')?.touched) {
                <span class="error-text">Nama minimal 2 karakter</span>
              }
            </div>

            <div class="field">
              <label for="email">Email</label>
              <input
                pInputText
                id="email"
                type="email"
                formControlName="email"
                placeholder="email@contoh.com"
                style="width: 100%"
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
                styleClass="w-full"
                inputStyleClass="w-full"
                placeholder="Min. 8 karakter, huruf besar, kecil & angka"
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
                placeholder="Ulangi password"
              />
              @if (form.errors?.['passwordMismatch'] && form.get('confirmPassword')?.touched) {
                <span class="error-text">Password tidak sama</span>
              }
            </div>

            <button
              pButton
              type="submit"
              label="Daftar Sekarang"
              [loading]="authStore.isLoading()"
              [disabled]="form.invalid || authStore.isLoading()"
              style="width: 100%; background: #6C63FF; border-color: #6C63FF; border-radius: 9999px;"
            ></button>
          </form>

          <div class="login-link">Sudah punya akun? <a routerLink="/auth/login">Masuk</a></div>
        }
      </div>
    </div>
  `,
})
export class RegisterComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  readonly errorMessage = computed(() => {
    const code = this.authStore.error();
    if (code === 'EMAIL_TAKEN') return 'Email sudah terdaftar.';
    return 'Pendaftaran gagal. Coba lagi.';
  });

  readonly form = this.fb.group(
    {
      role: ['END_USER', Validators.required],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
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
    this.authStore.clearError();
  }

  onSubmit() {
    if (this.form.invalid) return;
    const val = this.form.value;
    this.authStore.register({
      full_name: val.fullName!,
      email: val.email!,
      password: val.password!,
      role: val.role as 'END_USER' | 'ORGANIZER',
    });
  }
}
