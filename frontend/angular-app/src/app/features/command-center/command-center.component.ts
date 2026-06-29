import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-command-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      
      <!-- Welcome Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Executive Command Center</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">SaaS isolation diagnostics, pipeline forecasting, and real-time AI performance audits.</p>
        </div>
        <div class="flex gap-2">
          <button (click)="refreshInsights()" class="bg-indigo-600 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5">
            <span class="material-icons text-sm">psychology</span> Refresh AI Audits
          </button>
        </div>
      </div>

      <!-- AI-Generated Executive Insights -->
      <div class="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-6 rounded-2xl border border-indigo-500/20 shadow-xl space-y-4">
        <div class="flex items-center gap-2">
          <span class="material-icons text-indigo-400 animate-pulse">auto_awesome</span>
          <h4 class="font-extrabold text-xs text-indigo-400 uppercase tracking-widest">AI Command Room Audits</h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div *ngFor="let insight of aiInsights()" class="bg-slate-950/60 p-4 rounded-xl border border-slate-900/80 flex items-start gap-3">
            <span class="material-icons text-indigo-400 text-sm mt-0.5">info_outline</span>
            <p class="text-xs text-slate-300 leading-relaxed font-medium">{{ insight }}</p>
          </div>
          <div *ngIf="aiInsights().length === 0" class="col-span-3 text-center py-6 text-xs text-slate-500">
            No audits compiled. Click "Refresh AI Audits" above to run heuristics models.
          </div>
        </div>
      </div>

      <!-- KPI metrics panels -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-2">
          <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Revenue This Month</span>
          <h3 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight">$145,280</h3>
          <span class="text-[9px] text-emerald-500 font-bold block">+18.4% compared to target</span>
        </div>

        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-2">
          <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Leads Acquired Today</span>
          <h3 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight">18</h3>
          <span class="text-[9px] text-indigo-400 font-bold block">Source channels: Website, Form</span>
        </div>

        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-2">
          <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Deals Value</span>
          <h3 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight">$340,500</h3>
          <span class="text-[9px] text-indigo-400 font-bold block">In negotiations pipeline</span>
        </div>

        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-2">
          <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pipeline Forecasting</span>
          <h3 class="text-3xl font-black text-emerald-500 tracking-tight">\${{ forecast().projectedRevenue?.toLocaleString() || '85,000' }}</h3>
          <span class="text-[9px] text-slate-400 font-bold block">Confidence Level: {{ forecast().forecastAccuracy || 85 }}%</span>
        </div>

      </div>

      <!-- Forecast Analysis and Details Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Forecasting Factors -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-4">
          <h4 class="font-extrabold text-sm text-slate-755 dark:text-white uppercase tracking-wider">Forecast Confidence Intervals</h4>
          
          <div class="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border dark:border-slate-700 space-y-3">
            <div class="flex justify-between text-xs">
              <span class="text-slate-500">Expected Lower Bound:</span>
              <strong class="text-slate-800 dark:text-white">$72,250</strong>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-slate-500">Expected Upper Bound:</span>
              <strong class="text-slate-800 dark:text-white">$97,750</strong>
            </div>
            <div class="flex justify-between text-xs pt-2 border-t dark:border-slate-800 font-bold text-slate-800 dark:text-white">
              <span>Confidence Range:</span>
              <span>{{ forecast().confidenceInterval || '$72,250 - $97,750' }}</span>
            </div>
          </div>

          <div class="space-y-3">
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Market Dynamics & Risks Factors</p>
            <div *ngFor="let fact of forecast().marketFactors" class="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <span class="material-icons text-indigo-400 text-sm">trending_up</span>
              <span>{{ fact }}</span>
            </div>
          </div>
        </div>

        <!-- Team Leaderboard / Performance -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-4">
          <h4 class="font-extrabold text-sm text-slate-755 dark:text-white uppercase tracking-wider">Campaign results distribution</h4>
          
          <div class="space-y-4 text-xs font-semibold">
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-600 dark:text-slate-300">Product Funnel opt-in rate</span>
                <span class="text-slate-800 dark:text-white">62.4%</span>
              </div>
              <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500" style="width: 62.4%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-655 dark:text-slate-355">SaaS trial to paid conversion</span>
                <span class="text-slate-800 dark:text-white">14.2%</span>
              </div>
              <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-violet-500" style="width: 14.2%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-600 dark:text-slate-300">SMS campaign delivery rate</span>
                <span class="text-slate-800 dark:text-white">98.1%</span>
              </div>
              <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500" style="width: 98.1%"></div>
              </div>
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

  aiInsights = signal<string[]>([]);
  forecast = signal<any>({});

  ngOnInit() {
    this.refreshInsights();
  }

  refreshInsights() {
    this.apiService.getBusinessInsights().subscribe({
      next: (res) => {
        if (res.success) this.aiInsights.set(res.data || []);
      }
    });

    this.apiService.getPipelineForecast().subscribe({
      next: (res) => {
        if (res.success) this.forecast.set(res.data || {});
      }
    });
  }
}
