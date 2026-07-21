import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      
      <!-- Welcome Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-[#1c1917] tracking-tight">Executive Dashboard</h1>
          <p class="text-sm text-[#574c43] mt-1 font-medium">Real-time KPI metrics and sales funnel analytics</p>
        </div>
        <div class="text-xs text-[#574c43] font-semibold bg-white border border-[#e7e5e4] px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Live sync active</span>
        </div>
      </div>

      <!-- Universal Clickable Actions System -->
      <!-- 1. Alert Banner Link -->
      <div (click)="triggerAction('/workflows')" class="bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-semibold py-3 px-4 rounded-xl flex justify-between items-center cursor-pointer hover:bg-amber-500/20 active:scale-[0.99] transition-all">
        <div class="flex items-center gap-2">
          <span class="bg-amber-700 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">Admin Alert Action</span>
          <span>Workflow Automation Engine requires verification: 15 pending leads need path mapping rules.</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-900">Configure Automation</span>
          <span class="material-icons text-sm">arrow_forward</span>
        </div>
      </div>

      <!-- 2. CTA Cards and 3. Clickable Boxes -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- CTA Card: Proposals & Invoices -->
        <div (click)="triggerAction('/documents-invoices')" class="bg-white border border-[#e7e5e4] hover:border-amber-600/40 p-5 rounded-2xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between h-36">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-500/10 px-2 py-0.5 rounded">Universal CTA Card</span>
              <h4 class="text-sm font-bold text-[#1c1917] mt-2 group-hover:text-amber-700 transition-colors">Manage Proposals & Invoicing Hub</h4>
              <p class="text-[11px] text-[#574c43] mt-1">Review outstanding invoices, send professional agreements, and calculate custom tax values.</p>
            </div>
            <span class="material-icons text-amber-700 opacity-80 group-hover:scale-110 transition-transform">receipt_long</span>
          </div>
          <span class="text-[10px] text-amber-700 font-bold uppercase flex items-center gap-1">Launch Module <span class="material-icons text-xs">arrow_forward</span></span>
        </div>

        <!-- Clickable Box: Support Center -->
        <div (click)="triggerAction('/tickets')" class="bg-white border border-[#e7e5e4] hover:border-amber-600/40 p-5 rounded-2xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between h-36">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-[#1c1917] bg-stone-200 px-2 py-0.5 rounded">Universal Action Box</span>
              <h4 class="text-sm font-bold text-[#1c1917] mt-2 group-hover:text-amber-700 transition-colors">AI Help Support Center</h4>
              <p class="text-[11px] text-[#574c43] mt-1">Classify client queries automatically and answer tickets using AI Auto-replies.</p>
            </div>
            <span class="material-icons text-[#1c1917] opacity-80 group-hover:scale-110 transition-transform">confirmation_number</span>
          </div>
          <span class="text-[10px] text-[#1c1917] font-bold uppercase flex items-center gap-1">Open Tickets <span class="material-icons text-xs">arrow_forward</span></span>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <!-- Revenue Card -->
        <div class="kpi-card bg-[#1c1917] text-white rounded-2xl p-5 shadow-md">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400">Total Revenue</span>
              <h3 class="text-2xl font-black mt-2 tracking-tight text-white">\${{ kpis().revenue.toLocaleString() }}</h3>
            </div>
            <span class="material-icons text-3xl text-amber-400 opacity-40">monetization_on</span>
          </div>
          <span class="text-[10px] text-emerald-400 mt-4 block font-semibold">+14.2% from last month</span>
        </div>

        <!-- Customers Card -->
        <div class="kpi-card bg-white border border-[#e7e5e4] rounded-2xl p-5 shadow-sm">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-[#574c43]">Customers</span>
              <h3 class="text-2xl font-black mt-2 text-[#1c1917] tracking-tight">{{ kpis().customers }}</h3>
            </div>
            <span class="material-icons text-3xl text-emerald-600 opacity-30">people</span>
          </div>
          <span class="text-[10px] text-emerald-600 mt-4 block font-semibold">Active & VIP clients</span>
        </div>

        <!-- Leads Card -->
        <div class="kpi-card bg-white border border-[#e7e5e4] rounded-2xl p-5 shadow-sm">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-[#574c43]">Sales Leads</span>
              <h3 class="text-2xl font-black mt-2 text-[#1c1917] tracking-tight">{{ kpis().leads }}</h3>
            </div>
            <span class="material-icons text-3xl text-amber-600 opacity-30">leaderboard</span>
          </div>
          <span class="text-[10px] text-amber-700 mt-4 block font-semibold">Kanban pipeline active</span>
        </div>

        <!-- Support Tickets Card -->
        <div class="kpi-card bg-white border border-[#e7e5e4] rounded-2xl p-5 shadow-sm">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-[#574c43]">Support Tickets</span>
              <h3 class="text-2xl font-black mt-2 text-[#1c1917] tracking-tight">{{ kpis().tickets }}</h3>
            </div>
            <span class="material-icons text-3xl text-rose-600 opacity-30">confirmation_number</span>
          </div>
          <span class="text-[10px] text-rose-600 mt-4 block font-semibold">Real-time ticket hub</span>
        </div>

        <!-- Employees Card -->
        <div class="kpi-card bg-white bg-white border border-slate-200 border-[#e7e5e4]/50">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-[#44403c]">Employees</span>
              <h3 class="text-2xl font-black mt-2 text-slate-800 text-[#1c1917] tracking-tight">{{ kpis().employees }}</h3>
            </div>
            <span class="material-icons text-3xl text-amber-500 opacity-20">badge</span>
          </div>
          <span class="text-[10px] text-amber-500 mt-4 block font-semibold">Sales & Support staff</span>
        </div>

      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Revenue Trend Chart -->
        <div class="bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm">
          <h4 class="font-bold text-sm text-slate-700 text-[#1c1917] uppercase tracking-wider mb-4">Revenue Trend & Forecast</h4>
          <div class="h-64 relative">
            <canvas #revenueChart></canvas>
          </div>
        </div>

        <!-- Lead Funnel Stages Chart -->
        <div class="bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm">
          <h4 class="font-bold text-sm text-slate-700 text-[#1c1917] uppercase tracking-wider mb-4">Lead Funnel Distribution</h4>
          <div class="h-64 relative">
            <canvas #leadFunnelChart></canvas>
          </div>
        </div>

        <!-- Ticket Status Distribution Chart -->
        <div class="bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm">
          <h4 class="font-bold text-sm text-slate-700 text-[#1c1917] uppercase tracking-wider mb-4">Ticket Status Metrics</h4>
          <div class="h-64 relative flex items-center justify-center">
            <canvas #ticketChart class="max-h-full"></canvas>
          </div>
        </div>

        <!-- Lead Sources Chart -->
        <div class="bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm">
          <h4 class="font-bold text-sm text-slate-700 text-[#1c1917] uppercase tracking-wider mb-4">Lead Source Channels</h4>
          <div class="h-64 relative">
            <canvas #leadSourceChart></canvas>
          </div>
        </div>

      </div>

      <!-- Bottom Lists (Recent Tickets & Activity logs) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Recent Tickets -->
        <div class="bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm">
          <h4 class="font-bold text-sm text-slate-700 text-[#1c1917] uppercase tracking-wider mb-4">Recent Support Queries</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead>
                <tr class="text-left text-xs text-[#44403c] font-bold uppercase">
                  <th class="pb-3">Code</th>
                  <th class="pb-3">Title</th>
                  <th class="pb-3">Priority</th>
                  <th class="pb-3">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                <tr *ngFor="let ticket of recentTickets()" class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="py-3 font-semibold text-sky-500">{{ ticket.ticketCode }}</td>
                  <td class="py-3 font-medium text-slate-700 dark:text-[#1c1917] truncate max-w-[150px]">{{ ticket.title }}</td>
                  <td class="py-3">
                    <span [ngClass]="{
                      'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400': ticket.priority === 'Critical',
                      'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400': ticket.priority === 'High',
                      'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400': ticket.priority === 'Medium',
                      'bg-slate-100 text-slate-600 dark:bg-[#f8fafc] dark:text-[#44403c]': ticket.priority === 'Low'
                    }" class="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase">
                      {{ ticket.priority }}
                    </span>
                  </td>
                  <td class="py-3">
                    <span [ngClass]="{
                      'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400': ticket.status === 'Resolved' || ticket.status === 'Closed',
                      'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400': ticket.status === 'In Progress',
                      'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400': ticket.status === 'Assigned',
                      'bg-slate-100 text-slate-600 dark:bg-white dark:text-[#44403c]': ticket.status === 'Open'
                    }" class="px-2 py-0.5 rounded-full font-bold text-[9px]">
                      {{ ticket.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Actions / Timelines -->
        <div class="bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm">
          <h4 class="font-bold text-sm text-slate-700 text-[#1c1917] uppercase tracking-wider mb-4">Recent Client Activities</h4>
          <div class="space-y-4">
            <div *ngFor="let act of recentActivities()" class="flex items-start gap-3 text-xs">
              <span class="material-icons text-[#44403c] text-sm mt-0.5">history</span>
              <div class="flex-1">
                <span class="font-bold text-slate-800 text-[#1c1917]">{{ act.companyName }}</span>
                <span class="text-[#574c43] ml-1.5">{{ act.description }}</span>
                <span class="text-[#44403c] text-[10px] block mt-0.5">{{ act.date | date:'mediumDate' }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .kpi-card {
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      transition: all 0.2s;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  triggerAction(routePath: string) {
    this.router.navigate([routePath]);
  }

  // Canvas ViewChild hooks
  @ViewChild('revenueChart') revenueCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('leadFunnelChart') leadFunnelCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ticketChart') ticketCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('leadSourceChart') leadSourceCanvas!: ElementRef<HTMLCanvasElement>;

  // Charts references
  private chartsList: Chart[] = [];

  kpis = signal({
    revenue: 0,
    customers: 0,
    leads: 0,
    tickets: 0,
    employees: 0
  });

  recentTickets = signal<any[]>([]);
  recentActivities = signal<any[]>([]);
  chartData = signal<any>(null);

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    // If data loaded before view init, build charts. Otherwise ngOnInit will trigger it.
    if (this.chartData()) {
      this.buildCharts();
    }
  }

  loadData() {
    this.apiService.getDashboard().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const data = res.data;
          this.kpis.set(data.kpi);
          this.recentTickets.set(data.recentTickets);
          this.recentActivities.set(data.recentActivities);
          this.chartData.set(data.charts);
          
          // Rebuild charts on data receive
          setTimeout(() => this.buildCharts(), 100);
        }
      }
    });
  }

  buildCharts() {
    const data = this.chartData();
    if (!data) return;

    // Destroy existing charts to prevent memory leaks or redraw bugs
    this.chartsList.forEach(c => c.destroy());
    this.chartsList = [];

    // Check canvas exists
    if (!this.revenueCanvas || !this.leadFunnelCanvas || !this.ticketCanvas || !this.leadSourceCanvas) return;

    // 1. Revenue line Chart
    const revCtx = this.revenueCanvas.nativeElement.getContext('2d');
    if (revCtx) {
      const gradient = revCtx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)'); // sky 500
      gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

      this.chartsList.push(new Chart(revCtx, {
        type: 'line',
        data: {
          labels: data.revenueTrend.labels,
          datasets: [{
            label: 'Monthly Revenue ($)',
            data: data.revenueTrend.datasets,
            borderColor: '#0ea5e9',
            borderWidth: 3,
            fill: true,
            backgroundColor: gradient,
            tension: 0.4,
            pointBackgroundColor: '#0ea5e9'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(148, 163, 184, 0.1)' } },
            x: { grid: { display: false } }
          }
        }
      }));
    }

    // 2. Lead Funnel horizontal bar chart
    const funnelCtx = this.leadFunnelCanvas.nativeElement.getContext('2d');
    if (funnelCtx) {
      this.chartsList.push(new Chart(funnelCtx, {
        type: 'bar',
        data: {
          labels: data.leadFunnel.labels,
          datasets: [{
            label: 'Leads count',
            data: data.leadFunnel.datasets,
            backgroundColor: 'rgba(139, 92, 246, 0.85)', // violet 500
            borderRadius: 6,
            barThickness: 18
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(148, 163, 184, 0.1)' } },
            y: { grid: { display: false } }
          }
        }
      }));
    }

    // 3. Ticket Status doughnut chart
    const tktCtx = this.ticketCanvas.nativeElement.getContext('2d');
    if (tktCtx) {
      this.chartsList.push(new Chart(tktCtx, {
        type: 'doughnut',
        data: {
          labels: data.ticketStatus.labels,
          datasets: [{
            data: data.ticketStatus.datasets,
            backgroundColor: [
              '#94a3b8', // Slate Open
              '#f59e0b', // Amber Assigned
              '#0284c7', // Sky In Progress
              '#10b981', // Emerald Resolved
              '#047857'  // Dark green Closed
            ],
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { boxWidth: 12, font: { size: 10 } }
            }
          }
        }
      }));
    }

    // 4. Lead Source Radar/Polar area chart
    const sourceCtx = this.leadSourceCanvas.nativeElement.getContext('2d');
    if (sourceCtx) {
      this.chartsList.push(new Chart(sourceCtx, {
        type: 'bar',
        data: {
          labels: data.leadSource.labels,
          datasets: [{
            label: 'Lead Count',
            data: data.leadSource.datasets,
            backgroundColor: [
              '#38bdf8', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#fb7185', '#94a3b8'
            ],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(148, 163, 184, 0.1)' } },
            x: { grid: { display: false } }
          }
        }
      }));
    }
  }
}
