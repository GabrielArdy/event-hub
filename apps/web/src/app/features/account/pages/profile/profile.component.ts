import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AvatarModule } from 'primeng/avatar';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { AuthStore } from '../../../auth/store/auth.store';
import { AccountApiService } from '../../services/account-api.service';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';

function passwordMatchValidator(ctrl: AbstractControl): ValidationErrors | null {
  const p = ctrl.get('newPassword')?.value;
  const c = ctrl.get('confirmPassword')?.value;
  return p && c && p !== c ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, AvatarModule, MessageModule, DividerModule, NavbarComponent],
  styles: [`
    .page { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
    .page-title { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 24px; }
    .avatar-section { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    label { font-size: 0.875rem; font-weight: 500; color: #374151; }
    .error-text { font-size: 0.75rem; color: #EF4444; }
    .section-title { font-size: 1rem; font-weight: 700; color: #111827; margin: 24px 0 16px; }
  `],
  template: `
    <app-navbar />
    <div class="page">
      <h1 class="page-title">Profil Saya</h1>

      <!-- Avatar -->
      <div class="avatar-section">
        <p-avatar
          [label]="authStore.user()?.full_name?.charAt(0)?.toUpperCase() ?? 'U'"
          size="xlarge"
          shape="circle"
          [style]="{'background-color': '#6C63FF', 'color': '#fff', 'font-size': '1.5rem'}"
        />
        <div>
          <div style="font-size: 1rem; font-weight: 700; color: #111827;">{{ authStore.user()?.full_name }}</div>
          <div style="font-size: 0.875rem; color: #6B7280;">{{ authStore.user()?.email }}</div>
          <div style="font-size: 0.75rem; color: #6B7280; margin-top: 4px;">
            {{ authStore.user()?.role === 'ORGANIZER' ? 'Event Organizer' : 'Pengguna' }}
          </div>
        </div>
      </div>

      @if (saveSuccess()) {
        <p-message severity="success" text="Profil berhasil diperbarui!" styleClass="w-full mb-3" />
      }
      @if (saveError()) {
        <p-message severity="error" [text]="saveError()!" styleClass="w-full mb-3" />
      }

      <!-- Profile Form -->
      <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
        <div class="field">
          <label for="fullName">Nama Lengkap</label>
          <input pInputText id="fullName" formControlName="fullName" style="width: 100%" />
        </div>
        <div class="field">
          <label>Email</label>
          <input pInputText [value]="authStore.user()?.email" disabled style="width: 100%; opacity: 0.6;" />
        </div>
        <button pButton type="submit" label="Simpan Perubahan"
          [loading]="isSaving()" [disabled]="profileForm.invalid || isSaving()"
          style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
      </form>

      <p-divider />

      <div class="section-title">Ubah Password</div>

      @if (pwSuccess()) {
        <p-message severity="success" text="Password berhasil diubah!" styleClass="w-full mb-3" />
      }
      @if (pwError()) {
        <p-message severity="error" [text]="pwError()!" styleClass="w-full mb-3" />
      }

      <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
        <div class="field">
          <label for="currentPassword">Password Saat Ini</label>
          <p-password id="currentPassword" formControlName="currentPassword"
            [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" />
        </div>
        <div class="field">
          <label for="newPassword">Password Baru</label>
          <p-password id="newPassword" formControlName="newPassword"
            [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" />
          @if (passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched) {
            <span class="error-text">Password min. 8 karakter dengan huruf besar, kecil, dan angka</span>
          }
        </div>
        <div class="field">
          <label for="confirmPassword">Konfirmasi Password Baru</label>
          <p-password id="confirmPassword" formControlName="confirmPassword"
            [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" />
          @if (passwordForm.errors?.['passwordMismatch'] && passwordForm.get('confirmPassword')?.touched) {
            <span class="error-text">Password tidak sama</span>
          }
        </div>
        <button pButton type="submit" label="Ubah Password"
          [loading]="isPwSaving()" [disabled]="passwordForm.invalid || isPwSaving()"
          outlined style="border-radius: 9999px;"></button>
      </form>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  private readonly accountApi = inject(AccountApiService);
  private readonly fb = inject(FormBuilder);

  readonly isSaving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly isPwSaving = signal(false);
  readonly pwSuccess = signal(false);
  readonly pwError = signal<string | null>(null);

  readonly profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit() {
    this.profileForm.patchValue({ fullName: this.authStore.user()?.full_name ?? '' });
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);
    this.accountApi.updateProfile({ full_name: this.profileForm.value.fullName! }).subscribe({
      next: (user) => {
        this.authStore.setTokens(this.authStore.accessToken()!, user);
        this.isSaving.set(false);
        this.saveSuccess.set(true);
      },
      error: () => { this.isSaving.set(false); this.saveError.set('Gagal menyimpan. Coba lagi.'); },
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;
    this.isPwSaving.set(true);
    this.pwSuccess.set(false);
    this.pwError.set(null);
    const val = this.passwordForm.value;
    this.accountApi.changePassword(val.currentPassword!, val.newPassword!).subscribe({
      next: () => {
        this.isPwSaving.set(false);
        this.pwSuccess.set(true);
        this.passwordForm.reset();
      },
      error: (err) => {
        this.isPwSaving.set(false);
        this.pwError.set(err.error?.error?.code === 'WRONG_PASSWORD' ? 'Password saat ini salah.' : 'Gagal mengubah password.');
      },
    });
  }
}
