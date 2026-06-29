import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

export interface PayrollModel {
  _id: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: 'Draft' | 'Paid';
  employee: {
    _id: string;
    name: string;
    email: string;
    department: string;
  };
}

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Payroll Hub</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure compensation structures, record performance bonuses, and retrieve payslips.</p>
        </div>
        
        <button 
          *ngIf="isAdminOrManager()"
          (click)="openAddModal()" 
          class="py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-sky-600/20 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-icons text-sm">payments</span>
          <span>Generate Payroll</span>
        </button>
      </div>

      <!-- Toolbar filter -->
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl shadow-sm flex gap-4 items-center justify-between">
        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-400 font-bold uppercase">Statement Month:</span>
          <input 
            type="month" 
            [(ngModel)]="selectedMonth" 
            (change)="loadPayroll()"
            class="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
        </div>
        
        <div class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
          Showing statements for {{ selectedMonth }}
        </div>
      </div>

      <!-- Payroll List Table -->
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr class="text-left text-xs font-bold uppercase tracking-wider">
                <th class="px-6 py-4">Employee</th>
                <th class="px-6 py-4">Month</th>
                <th class="px-6 py-4">Base salary</th>
                <th class="px-6 py-4">Bonus</th>
                <th class="px-6 py-4">Deductions</th>
                <th class="px-6 py-4">Net pay</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr *ngIf="payrolls().length === 0" class="text-center text-slate-400 p-8">
                <td colspan="8" class="py-8">No payroll statements logged for this month</td>
              </tr>
              <tr *ngFor="let p of payrolls()" class="hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900 dark:text-white">{{ p.employee?.name }}</div>
                  <div class="text-xs text-slate-400">{{ p.employee?.department }}</div>
                </td>
                <td class="px-6 py-4 text-xs font-semibold">{{ p.month }}</td>
                <td class="px-6 py-4 font-medium">\${{ p.baseSalary.toLocaleString() }}</td>
                <td class="px-6 py-4 text-emerald-500 font-semibold">+\${{ p.bonus.toLocaleString() }}</td>
                <td class="px-6 py-4 text-rose-500 font-semibold">-\${{ p.deductions.toLocaleString() }}</td>
                <td class="px-6 py-4 font-black text-slate-800 dark:text-white">\${{ p.netSalary.toLocaleString() }}</td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400': p.status === 'Paid',
                    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400': p.status === 'Draft'
                  }" class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                    {{ p.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right text-xs font-bold space-x-2">
                  <button 
                    (click)="triggerPayslipDownload(p)" 
                    class="text-sky-500 hover:text-sky-400 inline-flex items-center gap-1">
                    <span class="material-icons text-xs">download</span>
                    <span>Payslip PDF</span>
                  </button>
                  <button 
                    *ngIf="isAdminOrManager() && p.status === 'Draft'" 
                    (click)="releasePayment(p._id)"
                    class="text-emerald-500 hover:text-emerald-400">
                    Release
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add Payroll Modal Overlay -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 class="text-base font-bold text-slate-800 dark:text-white">Configure Employee Compensation</h3>
            <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-icons">close</span></button>
          </div>
          <form class="space-y-4 text-xs text-slate-700 dark:text-slate-200">
            <div>
              <label class="block font-semibold uppercase tracking-wider text-slate-400">Select Employee</label>
              <select [(ngModel)]="formModel.employeeId" name="employeeId" class="modal-input">
                <option *ngFor="let emp of staffList()" [value]="emp._id">{{ emp.name }} ({{ emp.department }})</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold uppercase tracking-wider text-slate-400">Salary Statement Month</label>
              <input type="month" [(ngModel)]="formModel.month" name="month" class="modal-input">
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block font-semibold uppercase tracking-wider text-slate-400">Base Pay ($)</label>
                <input type="number" [(ngModel)]="formModel.baseSalary" name="baseSalary" class="modal-input">
              </div>
              <div>
                <label class="block font-semibold uppercase tracking-wider text-slate-400">Bonus ($)</label>
                <input type="number" [(ngModel)]="formModel.bonus" name="bonus" class="modal-input">
              </div>
              <div>
                <label class="block font-semibold uppercase tracking-wider text-slate-400">Deductions ($)</label>
                <input type="number" [(ngModel)]="formModel.deductions" name="deductions" class="modal-input">
              </div>
            </div>
            <div>
              <label class="block font-semibold uppercase tracking-wider text-slate-400">Status</label>
              <select [(ngModel)]="formModel.status" name="status" class="modal-input">
                <option value="Draft">Draft</option>
                <option value="Paid">Released & Paid</option>
              </select>
            </div>
          </form>
          <div class="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button (click)="closeModal()" class="flex-1 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-bold">Cancel</button>
            <button (click)="submitForm()" class="flex-1 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-white font-bold">Log Record</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .modal-input {
      width: 100%;
      padding: 8px 12px;
      margin-top: 6px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      background-color: transparent;
    }
    .dark .modal-input {
      border-color: #334155;
      background-color: #0f172a;
      color: white;
    }
  `]
})
export class PayrollComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  payrolls = signal<PayrollModel[]>([]);
  staffList = signal<any[]>([]);
  selectedMonth = '2026-06';

  isModalOpen = signal(false);
  formModel = {
    employeeId: '',
    month: '2026-06',
    baseSalary: 4000,
    bonus: 0,
    deductions: 0,
    status: 'Draft'
  };

  ngOnInit() {
    this.loadPayroll();
    if (this.isAdminOrManager()) {
      this.loadStaff();
    }
  }

  loadPayroll() {
    const filters = { month: this.selectedMonth };
    this.apiService.getPayrolls(filters).subscribe({
      next: (res) => {
        if (res.success) {
          this.payrolls.set(res.data);
        }
      }
    });
  }

  loadStaff() {
    this.apiService.getEmployees().subscribe({
      next: (res) => {
        if (res.success) {
          this.staffList.set(res.data);
          if (res.data.length > 0) {
            this.formModel.employeeId = res.data[0]._id;
          }
        }
      }
    });
  }

  openAddModal() {
    this.formModel = {
      employeeId: this.staffList().length > 0 ? this.staffList()[0]._id : '',
      month: this.selectedMonth,
      baseSalary: 4500,
      bonus: 0,
      deductions: 250,
      status: 'Draft'
    };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  submitForm() {
    this.apiService.createPayroll(this.formModel).subscribe({
      next: () => {
        this.loadPayroll();
        this.closeModal();
      }
    });
  }

  releasePayment(id: string) {
    if (confirm('Mark this statement as PAID? This action will record transaction histories.')) {
      this.apiService.updatePayroll(id, { status: 'Paid' }).subscribe({
        next: () => this.loadPayroll()
      });
    }
  }

  triggerPayslipDownload(payroll: PayrollModel) {
    const downloadUrl = this.apiService.getPayslipDownloadUrl(payroll._id);
    const sanitizedName = payroll.employee.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `payslip-${payroll.month}-${sanitizedName}.pdf`;

    // Download the PDF file using HttpClient with responseType: 'blob' to ensure
    // the Authorization Bearer header is automatically attached by our jwtInterceptor!
    this.http.get(downloadUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const fileUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileUrl);
      },
      error: (err) => {
        console.error('Failed to download payslip:', err);
        alert('An error occurred while exporting the payslip. Please try again.');
      }
    });
  }

  isAdminOrManager(): boolean {
    return this.authService.hasRole(['super_admin', 'manager']);
  }
}
