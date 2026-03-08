import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Read the required roles from the route's data
  const requiredRoles: string[] = route.data['roles'] ?? [];
  const userRole = authService.getUserRole();

  const hasAccess = requiredRoles.some(role =>
    role.toLowerCase() === userRole?.toLowerCase()
  );

  if (hasAccess) return true;

  return router.createUrlTree(['/403']);
};
