import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'manager' | 'employee' | 'customer';
  department: string;
  token?: string;
  profilePicture?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public get apiUrl(): string {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const protocol = window.location.protocol;
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:3000/api/auth';
      }
      return `${protocol}//${window.location.host}/api/auth`;
    }
    return 'http://localhost:3000/api/auth';
  }

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public userSignal = signal<UserProfile | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('nexus_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          this.currentUserSubject.next(user);
          this.userSignal.set(user);
        } catch (e) {
          this.logout();
        }
      }
    }
  }

  public get currentUserValue(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    return this.currentUserValue?.token || null;
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      map(response => {
        if (response && response.success) {
          if (response.require2FA) {
            return response;
          }
          if (response.data) {
            const user = response.data;
            localStorage.setItem('nexus_user', JSON.stringify(user));
            this.currentUserSubject.next(user);
            this.userSignal.set(user);
            return user;
          }
        }
        throw new Error(response.error || 'Authentication failed');
      })
    );
  }

  googleLogin(googleToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/google`, { googleToken }).pipe(
      map(response => {
        if (response && response.success) {
          if (response.require2FA) {
            return response;
          }
          if (response.data) {
            const user = response.data;
            localStorage.setItem('nexus_user', JSON.stringify(user));
            this.currentUserSubject.next(user);
            this.userSignal.set(user);
            return user;
          }
        }
        throw new Error(response.error || 'Google Identity login verification failed');
      })
    );
  }

  register(userData: { name: string; email: string; password?: string; role?: string; department?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const user = response.data;
          if (user.token) {
            localStorage.setItem('nexus_user', JSON.stringify(user));
            this.currentUserSubject.next(user);
            this.userSignal.set(user);
          }
          return user;
        }
        throw new Error(response.error || 'Registration failed');
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(payload: { token?: string; email?: string; otp?: string; newPassword: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, payload);
  }

  resetPasswordWithOtp(payload: { email: string; otp: string; newPassword: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password-otp`, payload);
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexus_user');
    }
    this.currentUserSubject.next(null);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(allowedRoles: string[]): boolean {
    const user = this.currentUserValue;
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }

  isSuperAdmin(): boolean {
    return this.currentUserValue?.role === 'super_admin';
  }

  isManager(): boolean {
    return this.currentUserValue?.role === 'manager';
  }

  isEmployee(): boolean {
    return this.currentUserValue?.role === 'employee';
  }

  isCustomer(): boolean {
    return this.currentUserValue?.role === 'customer';
  }

  getGoogleClientId(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/google/client-id`);
  }

  // Passkeys Helpers
  getPasskeyRegisterOptions(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/passkey/register-options`, {});
  }

  verifyPasskeyRegistration(credential: any, deviceName: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/passkey/verify-registration`, { credential, deviceName });
  }

  getPasskeyLoginOptions(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/passkey/login-options`, { email });
  }

  verifyPasskeyLogin(email: string, credential: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/passkey/verify-login`, { email, credential });
  }

  deletePasskey(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/passkey/${id}`);
  }

  // 2FA Helpers
  setup2FA(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/2fa/setup`, {});
  }

  verify2FA(code: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/2fa/verify`, { code });
  }

  disable2FA(password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/2fa/disable`, { password });
  }

  challenge2FA(code: string, tempToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/2fa/challenge`, { code, tempToken }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const user = response.data;
          localStorage.setItem('nexus_user', JSON.stringify(user));
          this.currentUserSubject.next(user);
          this.userSignal.set(user);
          return user;
        }
        throw new Error(response.error || '2FA code verification failed');
      })
    );
  }

  getMe(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`);
  }
}
