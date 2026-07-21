import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#fafaf9] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 animate-floating-orb rounded-full blur-[140px] pointer-events-none"></div>

      <div class="max-w-md w-full space-y-8 z-10 animate-fadeIn">
        <div class="text-center space-y-2">
          <a routerLink="/" class="inline-flex justify-center items-center gap-3 text-[#1c1917]">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1c1917] to-[#292524] flex items-center justify-center shadow-lg shadow-slate-900/20">
              <span class="material-icons text-white text-3xl font-black">bolt</span>
            </div>
            <span class="text-3xl font-black tracking-tight text-[#1c1917]">GrownX<span class="text-amber-600 font-medium">CRM</span></span>
          </a>
          <h2 class="text-xl font-extrabold text-[#1c1917] tracking-tight pt-2">Account Recovery & OTP Reset</h2>
          <p class="text-xs text-[#44403c] font-medium">Reset your workspace password using a 6-digit email OTP code.</p>
        </div>

        <div class="bg-white border border-[#e7e5e4] shadow-xl rounded-2xl p-8 space-y-6">
          
          <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-xl text-xs text-center font-bold">
            {{ errorMessage() }}
          </div>

          <div *ngIf="successMessage()" class="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl text-xs text-center font-bold">
            {{ successMessage() }}
          </div>

          <!-- Step 1: Enter Email to Receive OTP -->
          <form *ngIf="step() === 1" [formGroup]="emailForm" (ngSubmit)="sendOtp()" class="space-y-4">
            <div>
              <label for="email" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1">Registered Email Address</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">email</span>
                <input 
                  id="email" 
                  type="email" 
                  formControlName="email" 
                  placeholder="vatsaludani94@gmail.com" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-medium rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600">
              </div>
            </div>

            <button 
              type="submit" 
              [disabled]="emailForm.invalid || isLoading()" 
              class="w-full py-3 bg-[#1c1917] hover:bg-[#292524] disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
              <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Send 6-Digit Email OTP</span>
            </button>
          </form>

          <!-- Step 2: Enter 6-Digit OTP & New Password -->
          <form *ngIf="step() === 2" [formGroup]="otpResetForm" (ngSubmit)="verifyOtpAndReset()" class="space-y-4">
            <div>
              <label for="otp" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1">Enter 6-Digit OTP Code</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">pin</span>
                <input 
                  id="otp" 
                  type="text" 
                  maxlength="6"
                  formControlName="otp" 
                  placeholder="e.g. 842915" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-black tracking-widest rounded-xl text-md focus:outline-none focus:ring-2 focus:ring-amber-600">
              </div>
            </div>

            <div>
              <label for="newPassword" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1">New Password</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">lock</span>
                <input 
                  id="newPassword" 
                  type="password" 
                  formControlName="newPassword" 
                  placeholder="Minimum 6 characters" 
                  class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] text-[#1c1917] font-medium rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600">
              </div>
            </div>

            <button 
              type="submit" 
              [disabled]="otpResetForm.invalid || isLoading()" 
              class="w-full py-3 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
              <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Verify OTP & Update Password</span>
            </button>
          </form>

          <div class="text-center pt-2">
            <a routerLink="/login" class="text-xs font-bold text-[#44403c] hover:text-[#1c1917]">Back to Login</a>
          </div>

        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  step = signal<number>(1);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  emailForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  otpResetForm: FormGroup = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  sendOtp() {
    if (this.emailForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const email = this.emailForm.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'OTP sent to your email.');
        this.step.set(2);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to send OTP email.');
      }
    });
  }

  verifyOtpAndReset() {
    if (this.otpResetForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const email = this.emailForm.value.email;
    const { otp, newPassword } = this.otpResetForm.value;

    this.authService.resetPasswordWithOtp({ email, otp, newPassword }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'Password updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Invalid or expired OTP code.');
      }
    });
  }
}
