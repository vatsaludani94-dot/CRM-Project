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
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public userSignal = signal<UserProfile | null>(null);

  constructor(private http: HttpClient, private router: Router) {
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

  public get currentUserValue(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    return this.currentUserValue?.token || null;
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const user = response.data;
          localStorage.setItem('nexus_user', JSON.stringify(user));
          this.currentUserSubject.next(user);
          this.userSignal.set(user);
          return user;
        }
        throw new Error(response.error || 'Authentication failed');
      })
    );
  }

  googleLogin(googleUser: { name: string; email: string; picture: string }): Observable<any> {
    const mockUser: UserProfile = {
      _id: 'google_user_' + Date.now(),
      name: googleUser.name,
      email: googleUser.email,
      role: 'super_admin',
      department: 'Management',
      token: 'mock_google_jwt_token_' + Date.now()
    };
    
    localStorage.setItem('nexus_user', JSON.stringify(mockUser));
    this.currentUserSubject.next(mockUser);
    this.userSignal.set(mockUser);
    return of(mockUser);
  }

  register(userData: { name: string; email: string; password?: string; role?: string; department?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const user = response.data;
          // If register returns a token, log them in automatically
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

  resetPassword(payload: { token: string; newPassword: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, payload);
  }

  logout() {
    localStorage.removeItem('nexus_user');
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
}
