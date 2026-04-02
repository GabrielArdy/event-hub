import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO: Implement register form
// Fields: full_name, email, password, password_confirm, role (END_USER | ORGANIZER)

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="register-page">
      <!-- TODO: Implement register form -->
      <p>Register Page — TODO</p>
    </div>
  `,
})
export class RegisterComponent {}
