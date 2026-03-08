import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth/auth.service';
import { ThemeService } from '../core/services/theme/theme';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  public themeService = inject(ThemeService);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  isLoading = false;
  errorMessage = '';

  ngOnInit() {


  }


  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const payload = {
        email: this.loginForm.value.email || '',
        password: this.loginForm.value.password || ''
      };

      this.authService.login(payload).subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.status) {
            // Route into the dashboard on successful login
            this.router.navigate(['/dashboard']);
          } else {
            // Backend handled failure safely but returned false status
            this.errorMessage = res.message || 'Login failed. Please check your credentials.';
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'A network error occurred. Please try again later.';
          console.error('Login error', err);
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
