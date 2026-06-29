import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

export interface EmployeeModel {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
}

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Staff Management</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Employee directories, department configurations, and monthly productivity tracking.</p>
      </div>

      <!-- Main Layout: Grid structure -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left: Employees List (Col span 2) -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 class="font-bold text-xs text-slate-700 dark:text-white uppercase tracking-wider">Employee Directory</h3>
              
              <!-- Department filter -->
              <select 
                [(ngModel)]="selectedDept" 
                (change)="loadEmployees()"
                class="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-xs focus:outline-none text-slate-700 dark:text-slate-200">
                <option value="">All Departments</option>
                <option value="Sales">Sales</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
              </select>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                <thead>
                  <tr class="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th class="px-6 py-3">Name</th>
                    <th class="px-6 py-3">Department</th>
                    <th class="px-6 py-3">Role</th>
                    <th class="px-6 py-3">Status</th>
                    <th class="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                  <tr *ngFor="let emp of employees()" (click)="selectEmployee(emp)" [class.bg-sky-500/5]="activeEmployee()?._id === emp._id" class="hover:bg-slate-50/50 dark:hover:bg-slate-700/10 cursor-pointer transition-colors">
                    <td class="px-6 py-3">
                      <div class="font-bold text-slate-800 dark:text-white">{{ emp.name }}</div>
                      <div class="text-xs text-slate-400">{{ emp.email }}</div>
                    </td>
                    <td class="px-6 py-3 text-xs">{{ emp.department }}</td>
                    <td class="px-6 py-3 text-xs capitalize">{{ emp.role.replace('_', ' ') }}</td>
                    <td class="px-6 py-3">
                      <span [class.bg-emerald-100]="emp.status === 'active'" [class.text-emerald-700]="emp.status === 'active'" [class.bg-slate-100]="emp.status !== 'active'" [class.text-slate-500]="emp.status !== 'active'" class="px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                        {{ emp.status }}
                      </span>
                    </td>
                    <td class="px-6 py-3 text-right text-xs">
                      <button (click)="selectEmployee(emp)" class="text-sky-500 hover:text-sky-400 font-semibold">Performance</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right: Productivity & Leaderboard (Col span 1) -->
        <div class="space-y-6">
          
          <!-- Performance Review Card -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="font-bold text-sm text-slate-700 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 pb-3">Performance Audit</h3>
            
            <div *ngIf="!performanceData()" class="text-center py-8 text-slate-400 text-xs">
              Click on an employee directory entry to view metrics.
            </div>

            <div *ngIf="performanceData()" class="space-y-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm uppercase">
                  {{ performanceData().employee.name.charAt(0) }}
                </div>
                <div>
                  <h4 class="font-bold text-xs text-slate-900 dark:text-white">{{ performanceData().employee.name }}</h4>
                  <span class="text-[10px] text-slate-400 font-medium">{{ performanceData().employee.department }}</span>
                </div>
              </div>

              <!-- Productivity Ring/Value -->
              <div class="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl flex items-center justify-between">
                <div>
                  <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Productivity Index</span>
                  <div class="text-xl font-black text-sky-500 mt-1">{{ performanceData().metrics.productivityIndex }}%</div>
                </div>
                <div class="text-[10px] text-slate-500 font-medium max-w-[120px] text-right">
                  Score derived from converted leads & resolved tickets.
                </div>
              </div>

              <!-- Metrics Breakdown -->
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                  <span class="text-slate-400 font-semibold block text-[10px] uppercase">Leads Assigned</span>
                  <span class="font-bold text-slate-900 dark:text-white text-base mt-1 block">{{ performanceData().metrics.leadsAssigned }}</span>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                  <span class="text-slate-400 font-semibold block text-[10px] uppercase">Leads Converted</span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400 text-base mt-1 block">{{ performanceData().metrics.leadsConverted }}</span>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                  <span class="text-slate-400 font-semibold block text-[10px] uppercase">Tickets Resolved</span>
                  <span class="font-bold text-indigo-500 text-base mt-1 block">{{ performanceData().metrics.ticketsResolved }}</span>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                  <span class="text-slate-400 font-semibold block text-[10px] uppercase">Tickets Claimed</span>
                  <span class="font-bold text-slate-900 dark:text-white text-base mt-1 block">{{ performanceData().metrics.ticketsAssigned }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Leaderboard -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="font-bold text-sm text-slate-700 dark:text-white uppercase tracking-wider mb-2">Team Leaderboard</h3>
            <div class="space-y-3">
              <div *ngFor="let leader of leaderboard(); let idx = index" class="flex items-center justify-between text-xs p-2.5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700">
                <div class="flex items-center gap-2.5">
                  <span [ngClass]="{
                    'bg-amber-400 text-white': idx === 0,
                    'bg-slate-300 text-slate-700': idx === 1,
                    'bg-amber-600 text-white': idx === 2,
                    'bg-slate-200 text-slate-500': idx > 2
                  }" class="h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px]">
                    {{ idx + 1 }}
                  </span>
                  <div>
                    <div class="font-bold text-slate-800 dark:text-white">{{ leader.name }}</div>
                    <span class="text-[9px] text-slate-400 font-semibold uppercase">{{ leader.department }}</span>
                  </div>
                </div>
                <div class="text-right">
                  <span class="font-extrabold text-sky-500">{{ leader.overallScore }} pts</span>
                  <span class="text-[9px] text-emerald-500 font-bold block mt-0.5">\${{ leader.revenueGenerated.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  `
})
export class EmployeesComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  employees = signal<EmployeeModel[]>([]);
  leaderboard = signal<any[]>([]);
  activeEmployee = signal<EmployeeModel | null>(null);
  performanceData = signal<any | null>(null);
  selectedDept = '';

  ngOnInit() {
    this.loadEmployees();
    this.loadLeaderboard();
  }

  loadEmployees() {
    const filters = {
      department: this.selectedDept
    };
    this.apiService.getEmployees(filters).subscribe({
      next: (res) => {
        if (res.success) {
          this.employees.set(res.data);
          // Auto-select first employee
          if (res.data.length > 0 && !this.activeEmployee()) {
            this.selectEmployee(res.data[0]);
          }
        }
      }
    });
  }

  loadLeaderboard() {
    this.apiService.getLeaderboard().subscribe({
      next: (res) => {
        if (res.success) {
          this.leaderboard.set(res.data);
        }
      }
    });
  }

  selectEmployee(emp: EmployeeModel) {
    this.activeEmployee.set(emp);
    this.apiService.getEmployeePerformance(emp._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.performanceData.set(res.data);
        }
      }
    });
  }
}
