import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface CustomerModel {
  _id: string;
  customerCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  industry: string;
  status: 'Active' | 'Inactive' | 'VIP';
  revenueGenerated: number;
  assignedEmployee?: {
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Customer Directory</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage corporate profiles, VIP accounts, and account assignments</p>
        </div>
        
        <button 
          *ngIf="canModify()"
          (click)="openAddModal()" 
          class="py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-sky-600/20 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-icons text-sm">add</span>
          <span>Add Customer</span>
        </button>
      </div>

      <!-- Filters Toolbar -->
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        <!-- Search Input -->
        <div class="relative w-full md:max-w-xs">
          <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (input)="onSearchChange()"
            placeholder="Search company, code..." 
            class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-700 dark:text-slate-200">
        </div>

        <!-- Filter Dropdowns -->
        <div class="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          
          <select 
            [(ngModel)]="selectedStatus" 
            (change)="loadCustomers()"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="VIP">VIP</option>
          </select>

          <select 
            [(ngModel)]="selectedIndustry" 
            (change)="loadCustomers()"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500">
            <option value="">All Industries</option>
            <option value="Software & Technology">Software & Tech</option>
            <option value="Retail & E-commerce">Retail & E-commerce</option>
            <option value="Healthcare & Pharma">Healthcare & Pharma</option>
            <option value="Finance & Banking">Finance & Banking</option>
            <option value="Other">Other</option>
          </select>

        </div>
      </div>

      <!-- Directory Table Card -->
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr class="text-left text-xs font-bold uppercase tracking-wider">
                <th class="px-6 py-4">Client Code</th>
                <th class="px-6 py-4">Company</th>
                <th class="px-6 py-4">Contact person</th>
                <th class="px-6 py-4">Industry</th>
                <th class="px-6 py-4">Agent Assigned</th>
                <th class="px-6 py-4">Revenue</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              <tr *ngIf="customers().length === 0" class="text-center text-slate-400 p-8">
                <td colspan="8" class="py-8">No customers found match filters</td>
              </tr>
              <tr *ngFor="let c of customers()" class="hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition-colors">
                <td class="px-6 py-4 font-bold text-sky-600 dark:text-sky-400">
                  <a [routerLink]="['/customers', c._id]" class="hover:underline">{{ c.customerCode }}</a>
                </td>
                <td class="px-6 py-4 font-bold text-slate-800 dark:text-white">{{ c.companyName }}</td>
                <td class="px-6 py-4">
                  <div class="font-medium">{{ c.contactPerson }}</div>
                  <div class="text-xs text-slate-400">{{ c.email }}</div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">{{ c.industry }}</td>
                <td class="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {{ c.assignedEmployee ? c.assignedEmployee.name : 'Unassigned' }}
                </td>
                <td class="px-6 py-4 font-semibold text-slate-800 dark:text-white">
                  \${{ c.revenueGenerated.toLocaleString() }}
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400': c.status === 'VIP',
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400': c.status === 'Active',
                    'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400': c.status === 'Inactive'
                  }" class="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    {{ c.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right text-xs font-semibold space-x-2">
                  <button [routerLink]="['/customers', c._id]" class="text-sky-500 hover:text-sky-400">View 360</button>
                  <button *ngIf="canModify()" (click)="openEditModal(c)" class="text-slate-500 hover:text-slate-400">Edit</button>
                  <button *ngIf="canDelete()" (click)="deleteCustomer(c._id)" class="text-rose-500 hover:text-rose-400">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add/Edit Slideover Drawer Modal -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
        <div class="w-full max-w-lg bg-white dark:bg-slate-800 h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
          <div class="space-y-6">
            <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
              <h3 class="text-lg font-bold text-slate-800 dark:text-white">
                {{ isEditMode() ? 'Modify Customer Profile' : 'Add Corporate Client' }}
              </h3>
              <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-icons">close</span></button>
            </div>

            <!-- Modal Form -->
            <form class="space-y-4 text-slate-700 dark:text-slate-200">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">Company Name</label>
                <input type="text" [(ngModel)]="formModel.companyName" name="companyName" class="modal-input">
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">Contact Person</label>
                <input type="text" [(ngModel)]="formModel.contactPerson" name="contactPerson" class="modal-input">
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
                  <input type="email" [(ngModel)]="formModel.email" name="email" class="modal-input">
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">Phone</label>
                  <input type="text" [(ngModel)]="formModel.phone" name="phone" class="modal-input">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">Industry</label>
                  <select [(ngModel)]="formModel.industry" name="industry" class="modal-input">
                    <option value="Software & Technology">Software & Tech</option>
                    <option value="Retail & E-commerce">Retail & E-commerce</option>
                    <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                    <option value="Finance & Banking">Finance & Banking</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">Status</label>
                  <select [(ngModel)]="formModel.status" name="status" class="modal-input">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">Revenue Generated</label>
                  <input type="number" [(ngModel)]="formModel.revenueGenerated" name="revenueGenerated" class="modal-input">
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Agent</label>
                  <select [(ngModel)]="formModel.assignedEmployee" name="assignedEmployee" class="modal-input">
                    <option *ngFor="let emp of employees()" [value]="emp._id">{{ emp.name }}</option>
                  </select>
                </div>
              </div>
            </form>
          </div>

          <div class="flex gap-3 border-t border-slate-200 dark:border-slate-700 pt-4 mt-6">
            <button (click)="closeModal()" class="flex-1 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-white font-semibold text-sm">Cancel</button>
            <button (click)="submitForm()" class="flex-1 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-white font-semibold text-sm">Save Client</button>
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
      font-size: 14px;
      background-color: transparent;
    }
    .dark .modal-input {
      border-color: #334155;
      background-color: #0f172a;
      color: white;
    }
  `]
})
export class CustomersComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  customers = signal<CustomerModel[]>([]);
  employees = signal<any[]>([]);
  searchQuery = '';
  selectedStatus = '';
  selectedIndustry = '';

  isModalOpen = signal(false);
  isEditMode = signal(false);
  
  formModel: any = {
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    industry: 'Software & Technology',
    status: 'Active',
    revenueGenerated: 0,
    assignedEmployee: ''
  };

  ngOnInit() {
    this.loadCustomers();
    this.loadEmployees();
  }

  loadCustomers() {
    const filters = {
      search: this.searchQuery,
      status: this.selectedStatus,
      industry: this.selectedIndustry
    };
    this.apiService.getCustomers(filters).subscribe({
      next: (res) => {
        if (res.success) {
          this.customers.set(res.data);
        }
      }
    });
  }

  loadEmployees() {
    this.apiService.getEmployees().subscribe({
      next: (res) => {
        if (res.success) {
          this.employees.set(res.data);
        }
      }
    });
  }

  onSearchChange() {
    this.loadCustomers();
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.formModel = {
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      industry: 'Software & Technology',
      status: 'Active',
      revenueGenerated: 0,
      assignedEmployee: this.employees().length > 0 ? this.employees()[0]._id : ''
    };
    this.isModalOpen.set(true);
  }

  openEditModal(customer: CustomerModel) {
    this.isEditMode.set(true);
    this.formModel = {
      _id: customer._id,
      companyName: customer.companyName,
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      industry: customer.industry,
      status: customer.status,
      revenueGenerated: customer.revenueGenerated,
      assignedEmployee: customer.assignedEmployee ? (customer.assignedEmployee as any)._id : ''
    };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  submitForm() {
    if (this.isEditMode()) {
      this.apiService.updateCustomer(this.formModel._id, this.formModel).subscribe({
        next: () => {
          this.loadCustomers();
          this.closeModal();
        }
      });
    } else {
      this.apiService.createCustomer(this.formModel).subscribe({
        next: () => {
          this.loadCustomers();
          this.closeModal();
        }
      });
    }
  }

  deleteCustomer(id: string) {
    if (confirm('Are you sure you want to delete this customer profile? All history logs will be lost.')) {
      this.apiService.deleteCustomer(id).subscribe({
        next: () => this.loadCustomers()
      });
    }
  }

  canModify(): boolean {
    return this.authService.hasRole(['super_admin', 'manager', 'employee']);
  }

  canDelete(): boolean {
    return this.authService.hasRole(['super_admin', 'manager']);
  }
}
