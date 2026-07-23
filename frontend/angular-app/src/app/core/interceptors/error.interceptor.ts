import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((err) => {
      // Auto logout ONLY if 401 Unauthorized is returned from protected API requests
      const isPublicAuthEndpoint = req.url.includes('/api/auth/login') ||
                                   req.url.includes('/api/auth/register') ||
                                   req.url.includes('/api/auth/google') ||
                                   req.url.includes('/api/auth/forgot-password') ||
                                   req.url.includes('/api/auth/reset-password');

      if (err.status === 401 && !isPublicAuthEndpoint) {
        authService.logout();
      }

      const error = err.error?.error || err.statusText || 'An unknown network error occurred';
      return throwError(() => new Error(error));
    })
  );
};
