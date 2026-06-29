import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div class="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"></div>

      <div class="max-w-md w-full space-y-8 z-10">
        <div class="text-center">
          <div class="flex justify-center items-center gap-3 text-sky-400">
            <span class="material-icons text-5xl">donut_large</span>
          </div>
          <h2 class="mt-4 text-3xl font-extrabold text-white tracking-tight">Grownox Technologies</h2>
          <p class="mt-2 text-sm text-slate-400">
            Update account password credentials
          </p>
        </div>

        <div class="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-6">
            
            <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm text-center font-medium">
              {{ errorMessage() }}
            </div>

            <div *ngIf="successMessage()" class="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm text-center font-medium">
              {{ successMessage() }}
            </div>

            <!-- Password Input -->
            <div>
              <label for="password" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">New Password</label>
              <div class="mt-1.5 relative">
                <span class="material-icons absolute left-3 top-2.5 text-slate-500 text-lg">lock</span>
                <input 
                  id="password" 
                  type="password" 
                  formControlName="password" 
                  placeholder="••••••••" 
                  class="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
              </div>
              <div *ngIf="resetForm.get('password')?.touched && resetForm.get('password')?.invalid" class="text-rose-400 text-xs mt-1">
                Password must be at least 6 characters
              </div>
            </div>

            <!-- Submit Button -->
            <button 
              type="submit" 
              [disabled]="resetForm.invalid || isLoading() || successMessage() !== null"
              class="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold shadow-lg shadow-sky-600/20 active:scale-95 transition-all flex justify-center items-center gap-2">
              <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Update Password</span>
            </button>
          </form>

          <div class="mt-6 text-center text-xs">
            <a routerLink="/login" class="text-slate-400 hover:text-slate-300 font-semibold">Back to Login</a>
          </div>

        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  token = '';

  resetForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.token) {
      this.errorMessage.set('No recovery token was detected. Please request a new recovery link.');
    }
  }

  onSubmit() {
    if (this.resetForm.invalid || !this.token) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.resetPassword({
      token: this.token,
      newPassword: this.resetForm.value.password
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set('Your password was updated successfully. Redirecting...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Password update failed');
      }
    });
  }
}
