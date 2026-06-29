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
    <div class="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div class="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl"></div>

      <div class="max-w-md w-full space-y-8 z-10">
        <div class="text-center">
          <div class="flex justify-center items-center gap-3 text-emerald-400">
            <span class="material-icons text-5xl">donut_large</span>
          </div>
          <h2 class="mt-4 text-3xl font-extrabold text-white tracking-tight">Grownox Technologies</h2>
          <p class="mt-2 text-sm text-slate-400">
            Create a custom testing account workspace
          </p>
        </div>

        <div class="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
            
            <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm text-center font-medium">
              {{ errorMessage() }}
            </div>

            <!-- Full Name -->
            <div>
              <label for="name" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
              <div class="mt-1.5 relative">
                <span class="material-icons absolute left-3 top-2.5 text-slate-500 text-lg">person</span>
                <input 
                  id="name" 
                  type="text" 
                  formControlName="name" 
                  placeholder="John Doe" 
                  class="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
              </div>
              <div *ngIf="registerForm.get('name')?.touched && registerForm.get('name')?.invalid" class="text-rose-400 text-xs mt-1">
                Full name is required
              </div>
            </div>

            <!-- Email Address -->
            <div>
              <label for="email" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div class="mt-1.5 relative">
                <span class="material-icons absolute left-3 top-2.5 text-slate-500 text-lg">email</span>
                <input 
                  id="email" 
                  type="email" 
                  formControlName="email" 
                  placeholder="john@example.com" 
                  class="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
              </div>
              <div *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.invalid" class="text-rose-400 text-xs mt-1">
                Please enter a valid email address
              </div>
            </div>

            <!-- Password -->
            <div>
              <label for="password" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <div class="mt-1.5 relative">
                <span class="material-icons absolute left-3 top-2.5 text-slate-500 text-lg">lock</span>
                <input 
                  id="password" 
                  type="password" 
                  formControlName="password" 
                  placeholder="Minimum 6 characters" 
                  class="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
              </div>
              <div *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.invalid" class="text-rose-400 text-xs mt-1">
                Password must be at least 6 characters
              </div>
            </div>

            <!-- Account Type / Role -->
            <div>
              <label for="role" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Demo Role type</label>
              <div class="mt-1.5 relative">
                <span class="material-icons absolute left-3 top-2.5 text-slate-500 text-lg">supervised_user_circle</span>
                <select 
                  id="role" 
                  formControlName="role" 
                  class="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none">
                  <option value="employee">Employee / Sales Representative</option>
                  <option value="customer">Customer Portal</option>
                </select>
                <span class="material-icons absolute right-3 top-2.5 text-slate-400 pointer-events-none">arrow_drop_down</span>
              </div>
            </div>

            <!-- Department (Optional for Employees) -->
            <div *ngIf="registerForm.get('role')?.value === 'employee'">
              <label for="department" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Department</label>
              <div class="mt-1.5 relative">
                <span class="material-icons absolute left-3 top-2.5 text-slate-500 text-lg">work</span>
                <select 
                  id="department" 
                  formControlName="department" 
                  class="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none">
                  <option value="Sales">Sales & Business Development</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Engineering">Product Engineering</option>
                  <option value="HR">Human Resources</option>
                </select>
                <span class="material-icons absolute right-3 top-2.5 text-slate-400 pointer-events-none">arrow_drop_down</span>
              </div>
            </div>

            <!-- Submit -->
            <button 
              type="submit" 
              [disabled]="registerForm.invalid || isLoading()"
              class="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex justify-center items-center gap-2">
              <span *ngIf="isLoading()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Register Workspace</span>
            </button>
          </form>

          <div class="mt-6 text-center text-xs">
            <span class="text-slate-500">Already registered?</span>
            <a routerLink="/login" class="ml-1 text-emerald-400 hover:text-emerald-300 font-semibold">Sign in here</a>
          </div>

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
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['employee', [Validators.required]],
    department: ['Sales']
  });

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Registration failed');
      }
    });
  }
}
