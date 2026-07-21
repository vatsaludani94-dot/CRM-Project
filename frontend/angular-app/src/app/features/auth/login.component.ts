import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#fafaf9] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <!-- Ambient decorative warm background orbs -->
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 animate-floating-orb rounded-full blur-[140px] pointer-events-none"></div>
      <div class="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-stone-400/10 animate-floating-orb rounded-full blur-[160px] pointer-events-none"></div>

      <div class="max-w-md w-full space-y-8 z-10 animate-fadeIn">
        
        <!-- Brand Header -->
        <div class="text-center space-y-2">
          <a routerLink="/" class="inline-flex justify-center items-center gap-3 text-[#1c1917] group">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1c1917] to-[#292524] flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-all">
              <span class="material-icons text-white text-3xl font-black">bolt</span>
            </div>
            <span class="text-3xl font-black tracking-tight text-[#1c1917]">GrownX<span class="text-amber-600 font-medium">CRM</span></span>
          </a>
          <h2 class="text-xl font-extrabold text-[#1c1917] tracking-tight pt-2">Sign In to Your Workspace</h2>
          <p class="text-xs text-[#44403c] font-medium">Enter your credentials or authenticate via Google to access your account.</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white border border-[#e7e5e4] shadow-xl rounded-2xl p-8 space-y-6">
          
          <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-xl text-xs text-center font-bold">
            {{ errorMessage() }}
          </div>

          <!-- Email & Password Form -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
            
            <div>
              <label for="email" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1.5">Email Address</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">email</span>
                <input 
                  id="email" 
                  type="email" 
                  formControlName="email" 
                  placeholder="name@company.com" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-medium rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600">
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1.5">
                <label for="password" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider">Password</label>
                <a routerLink="/forgot-password" class="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors">Forgot Password?</a>
              </div>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">lock</span>
                <input 
                  id="password" 
                  type="password" 
                  formControlName="password" 
                  placeholder="••••••••" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-medium rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600">
              </div>
            </div>

            <button 
              type="submit" 
              [disabled]="loginForm.invalid || isLoading()" 
              class="w-full py-3 bg-[#1c1917] hover:bg-[#292524] disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
              <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Sign In</span>
            </button>

          </form>

          <div class="relative flex py-2 items-center">
            <div class="flex-grow border-t border-[#e7e5e4]"></div>
            <span class="flex-shrink mx-4 text-[11px] font-bold text-[#44403c] uppercase">Or continue with</span>
            <div class="flex-grow border-t border-[#e7e5e4]"></div>
          </div>

          <!-- Google Sign In Button -->
          <button (click)="openGooglePopup()" class="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-50 border border-[#e7e5e4] text-[#1c1917] font-bold text-sm py-3 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95">
            <svg class="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign In with Google</span>
          </button>

          <div class="text-center pt-2">
            <span class="text-xs text-[#44403c]">Don't have an account? </span>
            <a routerLink="/register" class="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors">Create Workspace Account</a>
          </div>

        </div>

        <div class="text-center text-xs text-[#44403c] font-medium">
          <a routerLink="/" class="hover:text-[#1c1917] underline">← Back to Main Website</a>
        </div>

      </div>

      <!-- Google OAuth Account Selection Modal -->
      <div *ngIf="showGooglePopup()" class="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scaleIn border border-[#e7e5e4] text-[#1c1917]">
          
          <div class="p-6 border-b border-[#e7e5e4] flex flex-col items-center text-center space-y-4">
            <svg class="h-8 w-8" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <div class="space-y-1">
              <h3 class="text-md font-extrabold text-[#1c1917]">Sign in with Google</h3>
              <p class="text-xs text-[#44403c]">to continue to <strong class="text-amber-700">GrownX CRM</strong></p>
            </div>
          </div>

          <div class="p-4 space-y-2">
            <div *ngIf="googleAuthenticating()" class="flex flex-col items-center py-8 space-y-4">
              <div class="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full"></div>
              <p class="text-xs text-[#1c1917] font-bold">Authenticating with Google OAuth...</p>
            </div>

            <div *ngIf="!googleAuthenticating()" class="space-y-1.5">
              <p class="text-[10px] text-[#44403c] font-bold uppercase px-2 mb-2">Select Google Account</p>
              
              <div (click)="selectGoogleAccount('Vatsal Udani', 'vatsaludani94@gmail.com')" class="flex items-center gap-3 p-3 hover:bg-stone-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-[#e7e5e4]">
                <div class="h-8 w-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">VU</div>
                <div class="flex-1 text-left">
                  <p class="text-xs font-bold text-[#1c1917]">Vatsal Udani</p>
                  <p class="text-[10px] text-[#44403c]">vatsaludani94@gmail.com</p>
                </div>
              </div>

              <div (click)="selectGoogleAccount('Enterprise User', 'user@company.com')" class="flex items-center gap-3 p-3 hover:bg-stone-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-[#e7e5e4]">
                <div class="h-8 w-8 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs">EU</div>
                <div class="flex-1 text-left">
                  <p class="text-xs font-bold text-[#1c1917]">Enterprise User</p>
                  <p class="text-[10px] text-[#44403c]">user@company.com</p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-stone-50 px-6 py-4 border-t border-[#e7e5e4] flex justify-between items-center text-[10px] text-[#44403c] font-bold">
            <button (click)="closeGooglePopup()" class="hover:text-[#1c1917]">Cancel</button>
            <span>Google Accounts OAuth 2.0</span>
          </div>

        </div>
      </div>

    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  
  showGooglePopup = signal<boolean>(false);
  googleAuthenticating = signal<boolean>(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Invalid email or password');
      }
    });
  }

  openGooglePopup() {
    this.showGooglePopup.set(true);
    this.googleAuthenticating.set(false);
  }

  closeGooglePopup() {
    this.showGooglePopup.set(false);
  }

  selectGoogleAccount(name: string, email: string) {
    this.googleAuthenticating.set(true);
    
    this.authService.googleLogin({
      name,
      email,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=b45309&color=fff`
    }).subscribe({
      next: () => {
        this.googleAuthenticating.set(false);
        this.showGooglePopup.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.googleAuthenticating.set(false);
        this.showGooglePopup.set(false);
        this.errorMessage.set('Google Sign-In failed.');
      }
    });
  }
}
