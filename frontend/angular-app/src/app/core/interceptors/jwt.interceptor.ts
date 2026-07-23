import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token;

  const isApiRequest = req.url.includes('/api/') || req.url.startsWith('/api');
  const isThirdParty = req.url.includes('google.com') || req.url.includes('googleapis.com');

  if (token && isApiRequest && !isThirdParty) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
