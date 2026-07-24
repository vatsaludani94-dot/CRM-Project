import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

export interface PriorityActionItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  actionText: string;
  route: string;
  severity: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-command-center',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      
      <!-- Welcome Header -->
      <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-[#1c1917] tracking-tight">Executive Command Center</h1>
          <p class="text-xs text-stone-500 mt-1 font-medium">Real-time SaaS operational priorities, pipeline snapshot, and actionable intelligence feed.</p>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="loadDashboardData()" [disabled]="isLoading()" class="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer">
            <span class="material-icons text-sm" [class.animate-spin]="isLoading()">sync</span> Refresh Command Center
          </button>
        </div>
      </div>

      <!-- TODAY'S OVERVIEW KPI CARDS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        <div class="bg-white border border-[#e7e5e4] p-5 rounded-2xl shadow-sm space-y-1.5">
          <div class="flex justify-between items-center text-stone-500">
            <span class="text-[10px] font-black uppercase tracking-wider">Active Revenue</span>
            <span class="material-icons text-amber-600 text-lg">attach_money</span>
          </div>
          <h3 class="text-2xl font-black text-[#1c1917] tracking-tight">\${{ kpi().revenue?.toLocaleString() || '0' }}</h3>
          <span class="text-[10px] text-emerald-600 font-bold block">+18.4% monthly forecast growth</span>
        </div>

        <div class="bg-white border border-[#e7e5e4] p-5 rounded-2xl shadow-sm space-y-1.5">
          <div class="flex justify-between items-center text-stone-500">
            <span class="text-[10px] font-black uppercase tracking-wider">Active Leads</span>
            <span class="material-icons text-amber-600 text-lg">leaderboard</span>
          </div>
          <h3 class="text-2xl font-black text-[#1c1917] tracking-tight">{{ kpi().leads || 0 }}</h3>
          <span class="text-[10px] text-amber-600 font-bold block">Kanban Sales Pipeline</span>
        </div>

        <div class="bg-white border border-[#e7e5e4] p-5 rounded-2xl shadow-sm space-y-1.5">
          <div class="flex justify-between items-center text-stone-500">
            <span class="text-[10px] font-black uppercase tracking-wider">Customer Accounts</span>
            <span class="material-icons text-amber-600 text-lg">people_alt</span>
          </div>
          <h3 class="text-2xl font-black text-[#1c1917] tracking-tight">{{ kpi().customers || 0 }}</h3>
          <span class="text-[10px] text-stone-500 font-medium block">Customer 360 Accounts</span>
        </div>

        <div class="bg-white border border-[#e7e5e4] p-5 rounded-2xl shadow-sm space-y-1.5">
          <div class="flex justify-between items-center text-stone-500">
            <span class="text-[10px] font-black uppercase tracking-wider">Support Tickets</span>
            <span class="material-icons text-amber-600 text-lg">confirmation_number</span>
          </div>
          <h3 class="text-2xl font-black text-[#1c1917] tracking-tight">{{ kpi().tickets || 0 }}</h3>
          <span class="text-[10px] text-stone-500 font-medium block">Open & In-Progress</span>
        </div>

      </div>

      <!-- PRIORITY ACTION FEED -->
      <div class="bg-white border border-[#e7e5e4] p-6 rounded-2xl shadow-sm space-y-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="material-icons text-amber-600 text-lg">notifications_active</span>
            <h4 class="font-extrabold text-sm text-[#1c1917] uppercase tracking-wider">Priority Actions Required</h4>
          </div>
          <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            {{ priorityActions().length }} Action Items
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            *ngFor="let item of priorityActions()" 
            class="p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all"
            [ngClass]="{
              'bg-rose-50/50 border-rose-200': item.severity === 'high',
              'bg-amber-50/50 border-amber-200': item.severity === 'medium',
              'bg-stone-50 border-stone-200': item.severity === 'low'
            }">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-start gap-2.5">
                <span class="material-icons text-base mt-0.5" [ngClass]="{
                  'text-rose-600': item.severity === 'high',
                  'text-amber-600': item.severity === 'medium',
                  'text-stone-600': item.severity === 'low'
                }">
                  {{ item.type === 'overdue_task' ? 'error_outline' : item.type === 'meeting_today' ? 'event' : item.type === 'pending_proposal' ? 'history_edu' : 'snowboarding' }}
                </span>
                <div>
                  <h5 class="text-xs font-bold text-[#1c1917]">{{ item.title }}</h5>
                  <p class="text-[11px] text-stone-600 mt-0.5">{{ item.subtitle }}</p>
                </div>
              </div>
              <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded" [ngClass]="{
                'bg-rose-100 text-rose-700': item.severity === 'high',
                'bg-amber-100 text-amber-800': item.severity === 'medium',
                'bg-stone-200 text-stone-700': item.severity === 'low'
              }">
                {{ item.severity }}
              </span>
            </div>

            <div class="flex justify-end pt-2 border-t border-stone-200/60">
              <button (click)="navigateToRoute(item.route)" class="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1">
                <span>{{ item.actionText }}</span>
                <span class="material-icons text-xs">chevron_right</span>
              </button>
            </div>
          </div>

          <div *ngIf="priorityActions().length === 0" class="col-span-2 text-center py-8 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500 font-semibold">
            🎉 All priorities cleared! No overdue tasks or pending follow-ups required right now.
          </div>
        </div>
      </div>

      <!-- PIPELINE SNAPSHOT & RECENT ACTIVITY GRID -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Pipeline Stage Breakdown Snapshot -->
        <div class="bg-white border border-[#e7e5e4] p-6 rounded-2xl shadow-sm space-y-4">
          <div class="flex justify-between items-center">
            <h4 class="font-extrabold text-sm text-[#1c1917] uppercase tracking-wider">Sales Pipeline Breakdown</h4>
            <a routerLink="/sales/pipeline" class="text-xs font-bold text-amber-700 hover:underline">View Pipeline →</a>
          </div>

          <div class="space-y-3">
            <div *ngFor="let stage of pipelineStages()" class="space-y-1">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-stone-700">{{ stage.name }}</span>
                <span class="text-[#1c1917] font-bold">{{ stage.count }} leads</span>
              </div>
              <div class="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div class="h-full bg-amber-600 transition-all duration-500" [style.width.%]="stage.percentage"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="bg-white border border-[#e7e5e4] p-6 rounded-2xl shadow-sm space-y-4">
          <h4 class="font-extrabold text-sm text-[#1c1917] uppercase tracking-wider">Tenant Activity Stream</h4>
          
          <div class="space-y-3.5 divide-y divide-stone-100">
            <div *ngFor="let act of recentActivities()" class="pt-3 first:pt-0 flex items-start gap-3">
              <div class="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <span class="material-icons text-xs">history</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-[#1c1917] truncate">{{ act.companyName || 'Workspace Event' }}</p>
                <p class="text-[11px] text-stone-600 leading-tight mt-0.5">{{ act.description }}</p>
                <span class="text-[9px] text-stone-400 block mt-1 font-medium">{{ act.date | date:'short' }}</span>
              </div>
            </div>

            <div *ngIf="recentActivities().length === 0" class="py-6 text-center text-xs text-stone-500 font-medium">
              No recent customer activity recorded yet.
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class CommandCenterComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  isLoading = signal(false);
  kpi = signal<any>({});
  priorityActions = signal<PriorityActionItem[]>([]);
  recentActivities = signal<any[]>([]);
  pipelineStages = signal<{ name: string; count: number; percentage: number }[]>([]);

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading.set(true);

    this.apiService.getDashboard().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.kpi.set(res.data.kpi || {});
          this.priorityActions.set(res.data.priorityActions || []);
          this.recentActivities.set(res.data.recentActivities || []);

          if (res.data.charts?.leadFunnel) {
            const labels = res.data.charts.leadFunnel.labels || [];
            const datasets = res.data.charts.leadFunnel.datasets || [];
            const maxVal = Math.max(...datasets, 1);
            
            const stages = labels.map((label: string, idx: number) => {
              const count = datasets[idx] || 0;
              return {
                name: label,
                count,
                percentage: Math.round((count / maxVal) * 100)
              };
            });
            this.pipelineStages.set(stages);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to load Command Center dashboard:', err);
      }
    });
  }

  navigateToRoute(route: string) {
    if (route) {
      this.router.navigateByUrl(route);
    }
  }
}
