import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((err) => {
      // Auto logout if 401 Unauthorized or 403 Forbidden is returned from API
      if ([401, 403].includes(err.status) && !req.url.includes('/api/auth/login')) {
        authService.logout();
      }

      const error = err.error?.error || err.statusText || 'An unknown network error occurred';
      return throwError(() => new Error(error));
    })
  );
};
