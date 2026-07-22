import { Component, inject, signal, OnInit, AfterViewInit } from '@angular/core';
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

          <!-- TOTP 2FA Verification Panel -->
          <div *ngIf="show2faChallenge()" class="space-y-5 animate-fadeIn">
            <div class="text-center space-y-2 flex flex-col items-center">
              <span class="material-icons text-amber-600 text-3xl">security</span>
              <h3 class="text-sm font-black text-[#1c1917]">2FA Verification Required</h3>
              <p class="text-[11px] text-[#44403c] leading-relaxed text-center">Open your Google Authenticator app and enter the 6-digit login validation code.</p>
            </div>
            
            <div class="space-y-4 pt-2">
              <div>
                <label for="totpCode" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1.5 text-center">6-Digit Code</label>
                <input 
                  id="totpCode" 
                  type="text" 
                  maxLength="6"
                  placeholder="000000" 
                  [(ngModel)]="totpCode"
                  class="w-full text-center tracking-[0.75em] text-xl font-mono py-3 bg-white border border-[#e7e5e4] text-[#1c1917] font-black rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600">
              </div>
              
              <button 
                (click)="submit2faChallenge()" 
                [disabled]="totpCode.length !== 6 || isLoading()" 
                class="w-full py-3.5 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Confirm & Sign In</span>
              </button>

              <button 
                (click)="cancel2faChallenge()" 
                class="w-full py-2 bg-stone-100 hover:bg-stone-200 text-[#1c1917] font-bold text-xs rounded-xl cursor-pointer">
                Cancel
              </button>
            </div>
          </div>

          <!-- Standard Email & Password / Passkey Login Form -->
          <div *ngIf="!show2faChallenge()" class="space-y-5">
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
              
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

              <div class="flex flex-col gap-2 pt-2">
                <button 
                  type="submit" 
                  [disabled]="loginForm.invalid || isLoading()" 
                  class="w-full py-3 bg-[#1c1917] hover:bg-[#292524] disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                  <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Sign In</span>
                </button>

                <button 
                  type="button" 
                  (click)="loginWithPasskey()" 
                  [disabled]="!loginForm.get('email')?.valid || isLoading()"
                  class="w-full py-2.5 bg-stone-100 hover:bg-stone-200 disabled:bg-stone-50 disabled:text-stone-300 text-[#1c1917] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#e7e5e4]">
                  <span class="material-icons text-sm">fingerprint</span>
                  <span>Sign In with Passkey</span>
                </button>
              </div>

            </form>

            <div class="relative flex py-2 items-center">
              <div class="flex-grow border-t border-[#e7e5e4]"></div>
              <span class="flex-shrink mx-4 text-[11px] font-bold text-[#44403c] uppercase">Or continue with</span>
              <div class="flex-grow border-t border-[#e7e5e4]"></div>
            </div>

            <!-- Official Google Sign In Button Container -->
            <div class="w-full flex justify-center py-1">
              <div id="google-signin-btn" class="w-full flex justify-center"></div>
            </div>

            <div class="text-center pt-2">
              <span class="text-xs text-[#44403c]">Don't have an account? </span>
              <a routerLink="/register" class="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors">Create Workspace Account</a>
            </div>
          </div>

        </div>

        <div class="text-center text-xs text-[#44403c] font-medium">
          <a routerLink="/" class="hover:text-[#1c1917] underline">← Back to Main Website</a>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  show2faChallenge = signal(false);
  totpCode = '';
  temp2faToken = '';

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit() {}

  ngAfterViewInit() {
    this.loadGoogleSdk();
  }

  loadGoogleSdk() {
    this.authService.getGoogleClientId().subscribe({
      next: (res) => {
        const clientId = res.clientId;
        if (!clientId) {
          console.warn('Google Client ID not configured in backend .env');
          return;
        }

        if (typeof document !== 'undefined') {
          if (document.getElementById('google-jssdk')) {
            this.initGoogleAuth(clientId);
            return;
          }
          const script = document.createElement('script');
          script.id = 'google-jssdk';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => this.initGoogleAuth(clientId);
          document.head.appendChild(script);
        }
      },
      error: (err) => {
        console.error('Error fetching Google Client ID:', err);
      }
    });
  }

  private initGoogleAuth(clientId: string) {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => this.handleGoogleCredential(response),
        context: 'signin',
        ux_mode: 'popup',
        select_by: 'user'
      });

      google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'outline', size: 'large', width: 320, text: 'signin_with', shape: 'rectangular' }
      );
    }
  }

  private handleGoogleCredential(response: any) {
    if (response && response.credential) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.authService.googleLogin(response.credential).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res && res.require2FA) {
            this.temp2faToken = res.tempToken;
            this.show2faChallenge.set(true);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.message || 'Google Sign-In failed.');
        }
      });
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && (res as any).require2FA) {
          this.temp2faToken = (res as any).tempToken;
          this.show2faChallenge.set(true);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Invalid email or password');
      }
    });
  }

  async loginWithPasskey() {
    const email = this.loginForm.get('email')?.value;
    if (!email) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.getPasskeyLoginOptions(email).subscribe({
      next: async (options) => {
        try {
          const { startAuthentication } = await import('@simplewebauthn/browser');
          const assertionResponse = await startAuthentication(options);

          this.authService.verifyPasskeyLogin(email, assertionResponse).subscribe({
            next: (res) => {
              this.isLoading.set(false);
              if (res.require2FA) {
                this.temp2faToken = res.tempToken;
                this.show2faChallenge.set(true);
              } else {
                this.router.navigate(['/dashboard']);
              }
            },
            error: (err) => {
              this.isLoading.set(false);
              this.errorMessage.set(err.error?.error || 'Passkey signature verification failed on backend.');
            }
          });
        } catch (err: any) {
          this.isLoading.set(false);
          this.errorMessage.set(err.message || 'Passkey login cancelled or failed.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'No passkeys registered for this email address.');
      }
    });
  }

  submit2faChallenge() {
    if (this.totpCode.length !== 6) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.challenge2FA(this.totpCode, this.temp2faToken).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.show2faChallenge.set(false);
        this.totpCode = '';
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Invalid Authenticator code.');
      }
    });
  }

  cancel2faChallenge() {
    this.show2faChallenge.set(false);
    this.totpCode = '';
    this.temp2faToken = '';
    this.errorMessage.set(null);
  }
}
