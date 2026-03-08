import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../core/services/layout/layout';
import { ThemeService } from '../core/services/theme/theme';
import { AuthService } from '../core/services/auth/auth.service';
import { Router } from '@angular/router';
import { PolicyService } from '../core/services/policy/policy.service';
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar implements OnInit {
  public layoutService = inject(LayoutService);

  public themeService = inject(ThemeService);

  public isProfileMenuOpen = signal(false);

  private authService = inject(AuthService);

  private router = inject(Router);

  private policyService = inject(PolicyService);

  public userFullName = signal('');

  public userRole = signal('');

  toggleSidebar() {
    if (window.innerWidth <= 768) {
      this.layoutService.toggleSidebar();
    } else {
      this.layoutService.toggleDesktopSidebar();
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen.update(v => !v);
  }

  logout() {
    this.authService.logout();
    this.policyService.clearPolicies();  // Wipe in-memory policies
    this.router.navigate(['/login']);
  }

  setUserDetailInProfile() {

    this.userFullName.set(this.authService.getUserFullName()!);
    this.userRole.set(this.authService.getUserRole()!);

  }

  ngOnInit() {
    this.setUserDetailInProfile();
  }


}
