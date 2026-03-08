import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login').then(m => m.Login) },
  { path: '403', loadComponent: () => import('./403/forbidden.component').then(m => m.ForbiddenComponent) },

  {
    path: '',
    loadComponent: () => import('./layout/layout').then(m => m.Layout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'products/brand', loadComponent: () => import('./products/brand/brand').then(m => m.Brand) },
      { path: 'products/category', loadComponent: () => import('./products/category/category').then(m => m.CategoryComponent) },
      { path: 'products/product-items', loadComponent: () => import('./products/product-items/product-items').then(m => m.ProductItems) },
      { path: 'customer', loadComponent: () => import('./customer/customer').then(m => m.CustomerComponent) },
      { path: 'orders', loadComponent: () => import('./orders/orders').then(m => m.Orders) },
      {
        path: 'user-management',
        loadComponent: () => import('./user-management/user-management').then(m => m.UserManagement),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] }   // 👈 Only Admin can access this page
      }
    ]
  }
];
