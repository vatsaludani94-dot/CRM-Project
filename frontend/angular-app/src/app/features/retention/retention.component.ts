import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-retention',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fadeIn">
      
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="material-icons text-amber-600 bg-amber-50 p-2 rounded-xl text-xl">favorite</span>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">Customer Retention & Success Operating System</h2>
          </div>
          <p class="text-xs text-slate-500 font-medium mt-1">
            Monitor customer health scores, prevent churn, track unresolved issues, and automate retention workflows across workspace accounts.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="loadDashboard()" class="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer">
            <span class="material-icons text-sm">refresh</span> Refresh Metrics
          </button>
        </div>
      </div>

      <!-- Health Score Distribution Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Healthy -->
        <div (click)="filterHealthStatus('Healthy')" [class.ring-2]="selectedHealthStatus() === 'Healthy'" class="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3 cursor-pointer hover:border-emerald-500 transition-all">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">Healthy (80-100)</span>
            <span class="material-icons text-emerald-500">sentiment_very_satisfied</span>
          </div>
          <div class="flex items-baseline justify-between">
            <h3 class="text-3xl font-black text-slate-900">{{ dashboardData()?.distribution?.healthy || 0 }}</h3>
            <span class="text-xs font-bold text-slate-400">Accounts</span>
          </div>
          <p class="text-[10px] text-slate-500 font-semibold">Active contact & zero unresolved risk factors.</p>
        </div>

        <!-- Stable -->
        <div (click)="filterHealthStatus('Stable')" [class.ring-2]="selectedHealthStatus() === 'Stable'" class="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3 cursor-pointer hover:border-sky-500 transition-all">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full uppercase">Stable (60-79)</span>
            <span class="material-icons text-sky-500">sentiment_satisfied</span>
          </div>
          <div class="flex items-baseline justify-between">
            <h3 class="text-3xl font-black text-slate-900">{{ dashboardData()?.distribution?.stable || 0 }}</h3>
            <span class="text-xs font-bold text-slate-400">Accounts</span>
          </div>
          <p class="text-[10px] text-slate-500 font-semibold">Consistent relationship with minor follow-up items.</p>
        </div>

        <!-- At Risk -->
        <div (click)="filterHealthStatus('At Risk')" [class.ring-2]="selectedHealthStatus() === 'At Risk'" class="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3 cursor-pointer hover:border-amber-500 transition-all">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase">At Risk (40-59)</span>
            <span class="material-icons text-amber-500">warning</span>
          </div>
          <div class="flex items-baseline justify-between">
            <h3 class="text-3xl font-black text-slate-900">{{ dashboardData()?.distribution?.atRisk || 0 }}</h3>
            <span class="text-xs font-bold text-amber-600">Action Required</span>
          </div>
          <p class="text-[10px] text-slate-500 font-semibold">Inactivity or open tickets risking satisfaction.</p>
        </div>

        <!-- Critical -->
        <div (click)="filterHealthStatus('Critical')" [class.ring-2]="selectedHealthStatus() === 'Critical'" class="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3 cursor-pointer hover:border-rose-500 transition-all">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase">Critical (0-39)</span>
            <span class="material-icons text-rose-500">dangerous</span>
          </div>
          <div class="flex items-baseline justify-between">
            <h3 class="text-3xl font-black text-slate-900">{{ dashboardData()?.distribution?.critical || 0 }}</h3>
            <span class="text-xs font-bold text-rose-600">Urgent Escalation</span>
          </div>
          <p class="text-[10px] text-slate-500 font-semibold">Multiple unresolved tickets or long-term inactivity.</p>
        </div>
      </div>

      <!-- Retention Actions & Churn Risk Radar -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Priority Customer Actions (7 Cols) -->
        <div class="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div class="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 class="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span class="material-icons text-amber-600 text-base">notifications_active</span> Priority Customer Retention Actions
              </h3>
              <p class="text-[11px] text-slate-500 font-medium">System-identified accounts requiring immediate team intervention</p>
            </div>
            <span class="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Real-time</span>
          </div>

          <div *ngIf="(dashboardData()?.priorityActions || []).length === 0" class="p-8 text-center text-slate-400 text-xs font-medium">
            <span class="material-icons text-emerald-500 text-2xl mb-1">check_circle</span>
            <p>No urgent retention actions required! All customer accounts are healthy.</p>
          </div>

          <div *ngIf="(dashboardData()?.priorityActions || []).length > 0" class="space-y-3 max-h-96 overflow-y-auto pr-1">
            <div *ngFor="let act of dashboardData()?.priorityActions" class="p-4 border border-slate-100 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span [ngClass]="{
                    'bg-rose-100 text-rose-700': act.severity === 'critical',
                    'bg-amber-100 text-amber-800': act.severity === 'high',
                    'bg-sky-100 text-sky-800': act.severity === 'medium'
                  }" class="px-2 py-0.5 rounded text-[9px] font-black uppercase">
                    {{ act.actionType }}
                  </span>
                  <span class="font-bold text-xs text-slate-900">{{ act.customerName }}</span>
                </div>
                <p class="text-xs text-slate-600 font-medium">{{ act.message }}</p>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button (click)="openCustomer360(act.customerId)" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer">
                  View 360
                </button>
                <button (click)="openFollowUpModal(act.customerId, act.customerName)" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-bold text-xs transition-all cursor-pointer">
                  + Follow-up
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Churn Risk & Retention Radar Metrics (5 Cols) -->
        <div class="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h3 class="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span class="material-icons text-indigo-600 text-base">radar</span> Workspace Retention Health Radar
            </h3>
            <p class="text-[11px] text-slate-500 font-medium">Aggregated operational risk metrics across workspace</p>
          </div>

          <div class="space-y-4">
            <div class="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
              <div class="flex items-center gap-2.5">
                <span class="material-icons text-amber-600 bg-amber-100 p-2 rounded-lg text-base">hourglass_empty</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-900">Inactive Accounts (30+ Days)</h4>
                  <p class="text-[10px] text-slate-500">No interaction logged in past month</p>
                </div>
              </div>
              <span class="text-lg font-black text-slate-900">{{ dashboardData()?.metrics?.inactiveCount || 0 }}</span>
            </div>

            <div class="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
              <div class="flex items-center gap-2.5">
                <span class="material-icons text-rose-600 bg-rose-100 p-2 rounded-lg text-base">confirmation_number</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-900">Open Support Issues</h4>
                  <p class="text-[10px] text-slate-500">Unresolved customer support tickets</p>
                </div>
              </div>
              <span class="text-lg font-black text-slate-900">{{ dashboardData()?.metrics?.openTicketsCount || 0 }}</span>
            </div>

            <div class="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
              <div class="flex items-center gap-2.5">
                <span class="material-icons text-indigo-600 bg-indigo-100 p-2 rounded-lg text-base">receipt_long</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-900">Overdue Invoice Balances</h4>
                  <p class="text-[10px] text-slate-500">Unpaid invoice balances over 30 days</p>
                </div>
              </div>
              <span class="text-lg font-black text-slate-900">{{ dashboardData()?.metrics?.overduePaymentsCount || 0 }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Customer Segmentation & Health List -->
      <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        
        <!-- Filter Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 class="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Customer Health Segmentation</h3>
            <p class="text-xs text-slate-500 font-medium">Filter accounts by health status and business indicators</p>
          </div>

          <!-- Segment Pills -->
          <div class="flex flex-wrap gap-2 text-xs font-bold">
            <button (click)="setSegment('')" [class.bg-slate-900]="selectedSegment() === ''" [class.text-white]="selectedSegment() === ''" class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl cursor-pointer transition-all">
              All Accounts
            </button>
            <button (click)="setSegment('at_risk')" [class.bg-amber-600]="selectedSegment() === 'at_risk'" [class.text-white]="selectedSegment() === 'at_risk'" class="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl cursor-pointer transition-all">
              At Risk & Critical
            </button>
            <button (click)="setSegment('inactive')" [class.bg-indigo-600]="selectedSegment() === 'inactive'" [class.text-white]="selectedSegment() === 'inactive'" class="px-3 py-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl cursor-pointer transition-all">
              Inactive (30+ Days)
            </button>
            <button (click)="setSegment('high_value')" [class.bg-emerald-600]="selectedSegment() === 'high_value'" [class.text-white]="selectedSegment() === 'high_value'" class="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl cursor-pointer transition-all">
              High Value ($5k+)
            </button>
            <button (click)="setSegment('open_tickets')" [class.bg-rose-600]="selectedSegment() === 'open_tickets'" [class.text-white]="selectedSegment() === 'open_tickets'" class="px-3 py-1.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl cursor-pointer transition-all">
              Open Tickets
            </button>
          </div>
        </div>

        <!-- Customer Table -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-xs">
            <thead>
              <tr class="text-left text-slate-400 font-bold uppercase tracking-wider">
                <th class="pb-3">Customer Account</th>
                <th class="pb-3">Health Score</th>
                <th class="pb-3">Health Status</th>
                <th class="pb-3">Revenue</th>
                <th class="pb-3">Last Interaction</th>
                <th class="pb-3">Open Tickets</th>
                <th class="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let record of customerHealthRecords()" class="hover:bg-slate-50/60 transition-colors">
                <td class="py-3.5 font-bold text-slate-900">
                  {{ record.customer?.companyName || 'Unnamed Customer' }}
                  <div class="text-[10px] text-slate-400 font-normal">{{ record.customer?.contactPerson }} • {{ record.customer?.email }}</div>
                </td>

                <td class="py-3.5">
                  <div class="flex items-center gap-2">
                    <div class="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div [style.width.%]="record.healthScore" [ngClass]="{
                        'bg-emerald-500': record.healthScore >= 80,
                        'bg-sky-500': record.healthScore >= 60 && record.healthScore < 80,
                        'bg-amber-500': record.healthScore >= 40 && record.healthScore < 60,
                        'bg-rose-500': record.healthScore < 40
                      }" class="h-2 rounded-full"></div>
                    </div>
                    <span class="font-extrabold text-slate-800 text-xs">{{ record.healthScore }}/100</span>
                  </div>
                </td>

                <td class="py-3.5">
                  <span [ngClass]="{
                    'bg-emerald-100 text-emerald-800 border-emerald-300': record.healthStatus === 'Healthy',
                    'bg-sky-100 text-sky-800 border-sky-300': record.healthStatus === 'Stable',
                    'bg-amber-100 text-amber-800 border-amber-300': record.healthStatus === 'At Risk',
                    'bg-rose-100 text-rose-800 border-rose-300': record.healthStatus === 'Critical'
                  }" class="px-2.5 py-0.5 border rounded-full text-[10px] font-extrabold uppercase">
                    {{ record.healthStatus }}
                  </span>
                </td>

                <td class="py-3.5 font-bold text-slate-800">
                  \${{ (record.totalRevenue || 0).toLocaleString() }}
                </td>

                <td class="py-3.5 font-medium text-slate-600">
                  {{ record.lastInteractionAt ? (record.lastInteractionAt | date:'mediumDate') : 'No recent contact' }}
                </td>

                <td class="py-3.5 font-bold">
                  <span [class.text-rose-600]="record.openTickets > 0" [class.text-slate-400]="record.openTickets === 0">
                    {{ record.openTickets }} issue(s)
                  </span>
                </td>

                <td class="py-3.5 text-right space-x-2">
                  <button (click)="openCustomer360(record.customer._id)" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold text-[11px] transition-colors cursor-pointer">
                    Customer 360
                  </button>
                  <button (click)="recalculateHealth(record.customer._id)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer" title="Recalculate Score">
                    <span class="material-icons text-xs">sync</span>
                  </button>
                </td>
              </tr>

              <tr *ngIf="customerHealthRecords().length === 0">
                <td colspan="7" class="text-center py-12 text-slate-400 font-semibold">
                  No customer health records match selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Schedule Follow-Up Modal -->
      <div *ngIf="showFollowUpModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div class="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
          <div class="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 class="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span class="material-icons text-indigo-600">event</span> Schedule Customer Follow-Up
            </h4>
            <button (click)="showFollowUpModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <span class="material-icons text-sm">close</span>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Account</label>
              <input type="text" [value]="modalCustomerName" disabled class="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700">
            </div>

            <div>
              <label class="block font-bold text-slate-500 uppercase tracking-wider mb-1">Follow-up Title</label>
              <input type="text" [(ngModel)]="followUpTitle" placeholder="e.g. Account Review Call" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold">
            </div>

            <div>
              <label class="block font-bold text-slate-500 uppercase tracking-wider mb-1">Target Date</label>
              <input type="date" [(ngModel)]="followUpDate" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold">
            </div>

            <div>
              <label class="block font-bold text-slate-500 uppercase tracking-wider mb-1">Notes / Retention Objective</label>
              <textarea [(ngModel)]="followUpNotes" rows="3" placeholder="Discuss support issues & schedule quarterly review..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold"></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button (click)="showFollowUpModal.set(false)" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
            <button (click)="submitFollowUp()" [disabled]="!followUpTitle" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
              Schedule Task
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class RetentionComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  dashboardData = signal<any | null>(null);
  customerHealthRecords = signal<any[]>([]);
  selectedHealthStatus = signal<string>('');
  selectedSegment = signal<string>('');

  showFollowUpModal = signal<boolean>(false);
  modalCustomerId = '';
  modalCustomerName = '';
  followUpTitle = '';
  followUpDate = '';
  followUpNotes = '';

  ngOnInit() {
    this.loadDashboard();
    this.loadSegmentedCustomers();
  }

  loadDashboard() {
    this.apiService.getRetentionDashboard().subscribe({
      next: (res) => {
        if (res.success) {
          this.dashboardData.set(res.data);
        }
      }
    });
  }

  loadSegmentedCustomers() {
    const params: any = {};
    if (this.selectedHealthStatus()) params.healthStatus = this.selectedHealthStatus();
    if (this.selectedSegment()) params.segment = this.selectedSegment();

    this.apiService.getSegmentedCustomers(params).subscribe({
      next: (res) => {
        if (res.success) {
          this.customerHealthRecords.set(res.data);
        }
      }
    });
  }

  filterHealthStatus(status: string) {
    if (this.selectedHealthStatus() === status) {
      this.selectedHealthStatus.set('');
    } else {
      this.selectedHealthStatus.set(status);
    }
    this.loadSegmentedCustomers();
  }

  setSegment(segment: string) {
    this.selectedSegment.set(segment);
    this.loadSegmentedCustomers();
  }

  recalculateHealth(customerId: string) {
    this.apiService.recalculateCustomerHealth(customerId).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadDashboard();
          this.loadSegmentedCustomers();
        }
      }
    });
  }

  openCustomer360(customerId: string) {
    this.router.navigate(['/sales/customers', customerId]);
  }

  openFollowUpModal(customerId: string, customerName: string) {
    this.modalCustomerId = customerId;
    this.modalCustomerName = customerName;
    this.followUpTitle = `Retention Follow-up with ${customerName}`;
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    this.followUpDate = nextWeek.toISOString().split('T')[0];
    this.followUpNotes = '';
    this.showFollowUpModal.set(true);
  }

  submitFollowUp() {
    if (!this.modalCustomerId || !this.followUpTitle) return;

    this.apiService.createCustomerFollowUp(this.modalCustomerId, {
      title: this.followUpTitle,
      dueDate: this.followUpDate,
      description: this.followUpNotes
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.showFollowUpModal.set(false);
          this.loadDashboard();
          this.loadSegmentedCustomers();
        }
      }
    });
  }
}
