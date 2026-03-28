import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth/auth.service';
@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './forbidden.component.html',
  styleUrls: ['./forbidden.component.css']
})
export class ForbiddenComponent {
  private authService = inject(AuthService);
  constructor(private router: Router) { }

  goHome() {

    const userRole = this.authService.getUserRole();
    if (userRole === 'ADMIN') {
      this.router.navigate(['/dashboard']);
    } else if (userRole === 'MECHANIC') {
      this.router.navigate(['/services']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
