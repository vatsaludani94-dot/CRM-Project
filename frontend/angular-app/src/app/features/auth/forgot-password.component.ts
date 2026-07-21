import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div class="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"></div>

      <div class="max-w-md w-full space-y-8 z-10">
        <div class="text-center">
          <div class="flex justify-center items-center gap-3 text-violet-400">
            <span class="material-icons text-5xl">donut_large</span>
          </div>
          <h2 class="mt-4 text-3xl font-extrabold text-white tracking-tight">Grownox Technologies</h2>
          <p class="mt-2 text-sm text-[#44403c]">
            Recover your account password
          </p>
        </div>

        <div class="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
          <form *ngIf="!successMessage()" [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="space-y-6">
            
            <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm text-center font-medium">
              {{ errorMessage() }}
            </div>

            <!-- Email Input -->
            <div>
              <label for="email" class="block text-xs font-semibold text-[#44403c] uppercase tracking-wider">Email Address</label>
              <div class="mt-1.5 relative">
                <span class="material-icons absolute left-3 top-2.5 text-[#292524] text-lg">email</span>
                <input 
                  id="email" 
                  type="email" 
                  formControlName="email" 
                  placeholder="name@company.com" 
                  class="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
              </div>
              <div *ngIf="forgotForm.get('email')?.touched && forgotForm.get('email')?.invalid" class="text-rose-400 text-xs mt-1">
                Please enter a valid email address
              </div>
            </div>

            <!-- Submit Button -->
            <button 
              type="submit" 
              [disabled]="forgotForm.invalid || isLoading()"
              class="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-[#44403c] text-white rounded-lg text-sm font-semibold shadow-lg shadow-violet-600/20 active:scale-95 transition-all flex justify-center items-center gap-2">
              <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Send Recovery Link</span>
            </button>
          </form>

          <!-- Mock Token Display for review speed -->
          <div *ngIf="successMessage()" class="space-y-6 text-center">
            <div class="inline-flex h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 items-center justify-center">
              <span class="material-icons text-3xl">check_circle</span>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Reset Link Generated!</h3>
              <p class="text-sm text-[#44403c] mt-2 leading-relaxed">
                We have generated a mock password reset link below. Click it to navigate directly to the password updates screen:
              </p>
            </div>

            <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl">
              <a [routerLink]="resetLink()" class="text-sky-400 hover:text-sky-300 font-semibold text-sm break-all underline">
                Go to Reset Password Form
              </a>
            </div>

            <button routerLink="/login" class="text-xs text-[#44403c] hover:text-[#1c1917] font-medium">Back to Login</button>
          </div>

          <div *ngIf="!successMessage()" class="mt-6 text-center text-xs">
            <a routerLink="/login" class="text-[#44403c] hover:text-[#1c1917] font-semibold">Back to Login</a>
          </div>

        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  resetLink = signal('');

  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit() {
    if (this.forgotForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.forgotPassword(this.forgotForm.value.email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message);
        this.resetLink.set(res.resetLink);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Password reset request failed');
      }
    });
  }
}
