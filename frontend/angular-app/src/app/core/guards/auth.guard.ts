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
    if (requiredRoles && !requiredRoles.includes(currentUser.role)) {
      // Role not authorized - redirect to home page or dashboard
      router.navigate(['/dashboard']);
      return false;
    }
    
    // Authorized
    return true;
  }

  // Not logged in - redirect to login page with return url
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
