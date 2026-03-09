import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LayoutService } from '../core/services/layout/layout';
import { PolicyService } from '../core/services/policy/policy.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  public layoutService = inject(LayoutService);
  public router = inject(Router);
  public policyService = inject(PolicyService);
  
  isProductsExpanded = false;

  toggleProducts() {
    this.isProductsExpanded = !this.isProductsExpanded;
  }
}

