import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <!-- Ambient decorative background glows -->
      <div class="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"></div>

      <div class="max-w-4xl w-full space-y-10 z-10 animate-fadeIn">
        
        <!-- Brand Header -->
        <div class="text-center space-y-3">
          <a routerLink="/" class="inline-flex justify-center items-center gap-3 text-slate-900 group">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-all">
              <span class="material-icons text-white text-3xl font-black">bolt</span>
            </div>
            <span class="text-3xl font-black tracking-tight text-slate-900">GrownX<span class="text-amber-600 font-medium">CRM</span></span>
          </a>
          <h2 class="text-xl font-extrabold text-slate-800 tracking-tight">Enterprise Commands Portal</h2>
          <p class="text-sm text-[#292524] max-w-lg mx-auto">
            Choose a mock workspace role below or authenticate via Google to instantly access the CRM Command Center.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          <!-- Column 1: One-Click Demo Role Cards -->
          <div class="md:col-span-2 space-y-6">
            <div class="flex justify-between items-center px-2">
              <span class="text-xs font-bold uppercase tracking-wider text-[#292524]">Select Demo Profile</span>
              <span class="text-[10px] bg-slate-900 text-white border border-slate-700 px-3 py-1 rounded-full font-bold uppercase">No password required</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <!-- Card: Super Admin -->
              <div (click)="quickLogin('admin@grownox.com', 'admin123')" class="role-card bg-white border border-slate-200 hover:border-red-500/50 shadow-sm hover:shadow-xl transition-all duration-300 group">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-red-500 bg-red-500/10 p-2.5 rounded-xl text-xl">admin_panel_settings</span>
                  <div>
                    <h4 class="text-sm font-black text-slate-900">Super Admin</h4>
                    <p class="text-[10px] text-red-500 font-bold">admin@grownox.com</p>
                  </div>
                </div>
                <p class="text-[11px] text-[#292524] leading-relaxed pt-2">Full access to manage staff, configure payroll, download executive reports, and edit white-label settings.</p>
              </div>

              <!-- Card: Company Owner -->
              <div (click)="quickLogin('owner@grownox.com', 'owner123')" class="role-card bg-white border border-slate-200 hover:border-amber-500/50 shadow-sm hover:shadow-xl transition-all duration-300 group">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-amber-600 bg-amber-500/10 p-2.5 rounded-xl text-xl">stars</span>
                  <div>
                    <h4 class="text-sm font-black text-slate-900">Company Owner</h4>
                    <p class="text-[10px] text-amber-600 font-bold">owner@grownox.com</p>
                  </div>
                </div>
                <p class="text-[11px] text-[#292524] leading-relaxed pt-2">Executive dashboard view, monitors business KPIs, visualizes forecasts, and reviews deal conversion values.</p>
              </div>

              <!-- Card: Sales Manager -->
              <div (click)="quickLogin('manager@grownox.com', 'manager123')" class="role-card bg-white border border-slate-200 hover:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 group">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-slate-800 bg-slate-900/10 p-2.5 rounded-xl text-xl">manage_accounts</span>
                  <div>
                    <h4 class="text-sm font-black text-slate-900">Sales Manager</h4>
                    <p class="text-[10px] text-slate-800 font-bold">manager@grownox.com</p>
                  </div>
                </div>
                <p class="text-[11px] text-[#292524] leading-relaxed pt-2">Oversees sales funnel metrics, schedules manager syncs, assigns support tickets, and reviews timelines.</p>
              </div>

              <!-- Card: Sales Representative -->
              <div (click)="quickLogin('employee@grownox.com', 'employee123')" class="role-card bg-white border border-slate-200 hover:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 group">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-slate-700 bg-slate-100 p-2.5 rounded-xl text-xl">storefront</span>
                  <div>
                    <h4 class="text-sm font-black text-slate-900">Sales Rep</h4>
                    <p class="text-[10px] text-slate-700 font-bold">employee@grownox.com</p>
                  </div>
                </div>
                <p class="text-[11px] text-[#292524] leading-relaxed pt-2">Manages pipeline leads on the Kanban board, adds conversation notes, and converts leads to customers.</p>
              </div>

              <!-- Card: HR & Support Representative -->
              <div (click)="quickLogin('alice@grownox.com', 'employee123')" class="role-card bg-white border border-slate-200 hover:border-emerald-500/50 shadow-sm hover:shadow-xl transition-all duration-300 group">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-emerald-600 bg-emerald-500/10 p-2.5 rounded-xl text-xl">support_agent</span>
                  <div>
                    <h4 class="text-sm font-black text-slate-900">HR & Support</h4>
                    <p class="text-[10px] text-emerald-600 font-bold">alice@grownox.com</p>
                  </div>
                </div>
                <p class="text-[11px] text-[#292524] leading-relaxed pt-2">Resolves support queries, views payroll summaries, and writes ticket comments with AI suggested replies.</p>
              </div>

              <!-- Card: Customer Portal -->
              <div (click)="quickLogin('customer@grownox.com', 'customer123')" class="role-card bg-white border border-slate-200 hover:border-sky-500/50 shadow-sm hover:shadow-xl transition-all duration-300 group">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-sky-600 bg-sky-500/10 p-2.5 rounded-xl text-xl">person</span>
                  <div>
                    <h4 class="text-sm font-black text-slate-900">Customer Portal</h4>
                    <p class="text-[10px] text-sky-600 font-bold">customer@grownox.com</p>
                  </div>
                </div>
                <p class="text-[11px] text-[#292524] leading-relaxed pt-2">Restricted customer portal. Open support requests, upload files, and reply to comments in real-time.</p>
              </div>

            </div>
          </div>

        </div>

        <!-- Google OAuth & Footer -->
        <div class="pt-6 border-t border-slate-900 flex flex-col items-center space-y-6">
          <div *ngIf="errorMessage()" class="p-3 max-w-md w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs text-center font-bold">
            {{ errorMessage() }}
          </div>

          <!-- Premium Google Sign In Button -->
          <button (click)="openGooglePopup()" class="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm px-8 py-3.5 rounded-xl shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer active:scale-95">
            <svg class="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div class="text-xs text-slate-600 font-bold flex gap-4">
            <a routerLink="/" class="hover:text-[#44403c]">Back to Website</a>
            <span>•</span>
            <a routerLink="/register" class="hover:text-[#44403c]">Create New Workspace</a>
          </div>
        </div>

      </div>

      <!-- Simulated Google OAuth Popup Modal -->
      <div *ngIf="showGooglePopup()" class="fixed inset-0 bg-[#f8fafc]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scaleIn border border-slate-200 text-slate-800">
          
          <!-- Google popup Header -->
          <div class="p-6 border-b border-slate-100 flex flex-col items-center text-center space-y-4">
            <svg class="h-8 w-8" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <div class="space-y-1">
              <h3 class="text-md font-bold text-slate-900">Sign in with Google</h3>
              <p class="text-xs text-[#292524]">to continue to <strong class="text-indigo-600">GrownX Technologies</strong></p>
            </div>
          </div>

          <!-- Accounts Selection List -->
          <div class="p-4 space-y-2">
            
            <div *ngIf="googleAuthenticating()" class="flex flex-col items-center py-8 space-y-4">
              <div class="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
              <p class="text-xs text-[#292524] font-bold">Verifying Google account credentials...</p>
            </div>

            <div *ngIf="!googleAuthenticating()" class="space-y-1.5">
              <p class="text-[10px] text-[#44403c] font-bold uppercase px-2 mb-2">Choose an account</p>
              
              <!-- Account Item 1 -->
              <div (click)="selectGoogleAccount('Alex Morgan', 'alex.morgan@gmail.com')" class="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                <div class="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">AM</div>
                <div class="flex-1 text-left">
                  <p class="text-xs font-bold text-slate-900">Alex Morgan</p>
                  <p class="text-[10px] text-[#292524]">alex.morgan@gmail.com</p>
                </div>
              </div>

              <!-- Account Item 2 -->
              <div (click)="selectGoogleAccount('Taylor Reed', 'taylor.reed@gmail.com')" class="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                <div class="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">TR</div>
                <div class="flex-1 text-left">
                  <p class="text-xs font-bold text-slate-900">Taylor Reed</p>
                  <p class="text-[10px] text-[#292524]">taylor.reed@gmail.com</p>
                </div>
              </div>

              <!-- Option: Use another account -->
              <div (click)="selectGoogleAccount('Google Guest', 'google.guest@grownox.com')" class="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                <div class="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><span class="material-icons text-sm">person_outline</span></div>
                <div class="flex-1 text-left">
                  <p class="text-xs font-bold text-slate-900">Use another account</p>
                </div>
              </div>
            </div>

          </div>

          <!-- Popup Footer -->
          <div class="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-[#292524] font-bold">
            <button (click)="closeGooglePopup()" class="hover:text-slate-800">Cancel</button>
            <a href="#" class="hover:underline">Help & Privacy</a>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-scaleIn {
      animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .role-card {
      padding: 16px;
      border: 1px solid;
      border-radius: 16px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .role-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 20px -8px rgba(99, 102, 241, 0.15);
    }
    .role-card:active {
      transform: translateY(0);
      scale: 0.98;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Google sign in popup overlays
  showGooglePopup = signal<boolean>(false);
  googleAuthenticating = signal<boolean>(false);

  quickLogin(email: string, pass: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(email, pass).subscribe({
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
    
    // Simulate circular authentication network delay
    setTimeout(() => {
      this.authService.googleLogin({
        name,
        email,
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366F1&color=fff`
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
    }, 1800);
  }
}
