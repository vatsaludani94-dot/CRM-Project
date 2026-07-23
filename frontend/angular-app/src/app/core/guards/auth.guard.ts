import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUserValue;

  if (currentUser) {
    // Check if route has role restrictions
    const requiredRoles = route.data['roles'] as Array<string>;
    if (requiredRoles) {
      const isAllowed = requiredRoles.includes(currentUser.role) ||
        (currentUser.role === 'workspace_owner' && (requiredRoles.includes('manager') || requiredRoles.includes('super_admin')));
      if (!isAllowed) {
        router.navigate(['/dashboard']);
        return false;
      }
    }
    
    // Authorized
    return true;
  }

  // Not logged in - redirect to login page with return url
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
