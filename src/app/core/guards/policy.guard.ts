import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { PolicyService } from '../services/policy/policy.service';

export const policyGuard: CanActivateFn = async (route, state) => {
  const policyService = inject(PolicyService);
  const router = inject(Router);

  // 1. Ensure policies are fully loaded into memory.
  // This helps when hitting a protected route directly on fresh reload.
  if (!policyService.isLoaded()) {
    await policyService.loadPolicies();
  }

  // 2. Determine what policy is needed for this route.
  // E.g., data: { policy: 'PRODUCT_VIEW' }
  const requiredPolicy = route.data['policy'] as string;

  // 3. If no specific policy is mandated, auto-allow access.
  if (!requiredPolicy) {
    return true;
  }

  // 4. Check if the user's fetched policies array contains this policy.
  const hasAccess = policyService.hasPolicy(requiredPolicy);

  // 5. Navigate to 403 Forbidden page on failure, else true.
  if (!hasAccess) {
    return router.createUrlTree(['/403']);
  }

  return true;
};
