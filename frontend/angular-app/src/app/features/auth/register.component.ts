import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#fafaf9] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 animate-floating-orb rounded-full blur-[140px] pointer-events-none"></div>
      <div class="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-stone-400/10 animate-floating-orb rounded-full blur-[160px] pointer-events-none"></div>

      <div class="max-w-md w-full space-y-8 z-10 animate-fadeIn">
        <div class="text-center space-y-2">
          <a routerLink="/" class="inline-flex justify-center items-center gap-3 text-[#1c1917] group">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1c1917] to-[#292524] flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-all">
              <span class="material-icons text-white text-3xl font-black">bolt</span>
            </div>
            <span class="text-3xl font-black tracking-tight text-[#1c1917]">GrownX<span class="text-amber-600 font-medium">CRM</span></span>
          </a>
          <h2 class="text-xl font-extrabold text-[#1c1917] tracking-tight pt-2">Create Your Workspace</h2>
          <p class="text-xs text-[#44403c] font-medium">Register your business account to access sales tools and software downloads.</p>
        </div>

        <div class="bg-white border border-[#e7e5e4] shadow-xl rounded-2xl p-8 space-y-6">
          
          <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-xl text-xs text-center font-bold">
            {{ errorMessage() }}
          </div>

          <div *ngIf="successMessage()" class="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl text-xs text-center font-bold">
            {{ successMessage() }}
          </div>

          <!-- Step 1: Workspace Registration Details -->
          <form *ngIf="step() === 1" [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
            
            <!-- Company / Workspace Name -->
            <div>
              <label for="companyName" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1">Company / Workspace Name</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">business</span>
                <input 
                  id="companyName" 
                  type="text" 
                  formControlName="companyName" 
                  placeholder="Acme Technologies" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-medium rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600">
              </div>
            </div>

            <!-- Full Name (Owner Name) -->
            <div>
              <label for="name" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1">Owner Name</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">person</span>
                <input 
                  id="name" 
                  type="text" 
                  formControlName="name" 
                  placeholder="Vatsal Udani" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-medium rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600">
              </div>
            </div>

            <!-- Email Address -->
            <div>
              <label for="email" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1">Email Address</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">email</span>
                <input 
                  id="email" 
                  type="email" 
                  formControlName="email" 
                  placeholder="vatsal@example.com" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-medium rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600">
              </div>
            </div>

            <!-- Password -->
            <div>
              <label for="password" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1">Password</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">lock</span>
                <input 
                  id="password" 
                  type="password" 
                  formControlName="password" 
                  placeholder="Minimum 6 characters" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-medium rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600">
              </div>
            </div>

            <button 
              type="submit" 
              [disabled]="registerForm.invalid || isLoading()" 
              class="w-full py-3 bg-[#1c1917] hover:bg-[#292524] disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2">
              <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Send Verification Code</span>
            </button>

          </form>

          <!-- Step 2: Verification Code Entry -->
          <form *ngIf="step() === 2" [formGroup]="verifyForm" (ngSubmit)="onVerify()" class="space-y-4">
            <div class="text-center pb-2">
              <p class="text-xs text-[#44403c] font-medium">A 6-digit verification code has been sent to:</p>
              <p class="text-sm font-bold text-[#1c1917]">{{ registeredEmail() }}</p>
            </div>

            <div>
              <label for="code" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1">Enter 6-Digit Verification Code</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">pin</span>
                <input 
                  id="code" 
                  type="text" 
                  maxlength="6"
                  formControlName="code" 
                  placeholder="e.g. 942815" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-black tracking-widest rounded-xl text-md focus:outline-none focus:ring-2 focus:ring-amber-600">
              </div>
            </div>

            <button 
              type="submit" 
              [disabled]="verifyForm.invalid || isLoading()" 
              class="w-full py-3 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2">
              <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Verify & Create Workspace</span>
            </button>

            <div class="flex items-center justify-between text-xs font-bold pt-2">
              <button type="button" (click)="resendCode()" [disabled]="isLoading()" class="text-amber-700 hover:text-amber-800 underline cursor-pointer">
                Resend Verification Code
              </button>
              <button type="button" (click)="step.set(1)" class="text-[#44403c] hover:text-[#1c1917] underline cursor-pointer">
                Edit Details
              </button>
            </div>
          </form>

          <div class="text-center pt-2">
            <span class="text-xs text-[#44403c]">Already have an account? </span>
            <a routerLink="/login" class="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors">Sign In Here</a>
          </div>
        </div>

        <div class="text-center text-xs text-[#44403c] font-medium">
          <a routerLink="/" class="hover:text-[#1c1917] underline">← Back to Main Website</a>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  step = signal<number>(1);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  registeredEmail = signal<string>('');

  registerForm: FormGroup = this.fb.group({
    companyName: ['', [Validators.required]],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  verifyForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const email = this.registerForm.value.email;
    this.registeredEmail.set(email);

    this.authService.registerWorkspace(this.registerForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.requireEmailVerification) {
          this.successMessage.set(res.message || 'Verification code sent to your email.');
          this.step.set(2);
        } else if (res && res._id) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || err.message || 'Workspace registration failed');
      }
    });
  }

  onVerify() {
    if (this.verifyForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const email = this.registeredEmail();
    const code = this.verifyForm.value.code;

    this.authService.verifyWorkspaceRegistration(email, code).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Invalid or expired verification code');
      }
    });
  }

  resendCode() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.resendRegistrationCode(this.registeredEmail()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'A new verification code has been sent.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to resend verification code');
      }
    });
  }
}
