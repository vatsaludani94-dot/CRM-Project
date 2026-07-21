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
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
            
            <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-xl text-xs text-center font-bold">
              {{ errorMessage() }}
            </div>

            <!-- Full Name -->
            <div>
              <label for="name" class="block text-xs font-bold text-[#1c1917] uppercase tracking-wider mb-1">Full Name</label>
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
              <span>Register Workspace</span>
            </button>

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

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Registration failed');
      }
    });
  }
}
