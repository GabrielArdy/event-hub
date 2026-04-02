import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO: On init, read token from query param and call POST /auth/verify-email

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  template: `<p>Verify Email — TODO</p>`,
})
export class VerifyEmailComponent {}
