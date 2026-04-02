import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO: Implement login form with reactive forms, AuthStore, and AuthApiService
// Business rules: BR-AUTH-002 (lockout display), BR-AUTH-003 (unverified notice)

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-page">
      <!-- TODO: Implement login form -->
      <p>Login Page — TODO</p>
    </div>
  `,
})
export class LoginComponent {}
