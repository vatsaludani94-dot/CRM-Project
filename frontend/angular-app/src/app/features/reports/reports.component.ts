import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Executive Reports</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Export structured directories, pipelines, and ticketing data into professional CSV/PDF files.</p>
      </div>

      <!-- Reports grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Customers Report -->
        <div class="report-card">
          <div class="h-12 w-12 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
            <span class="material-icons text-2xl">people</span>
          </div>
          <h3 class="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Customer Directory</h3>
          <p class="text-xs text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
            Generates a comprehensive statement listing all customer codes, company names, key contacts, emails, statuses, and total revenues generated.
          </p>
          <div class="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-6">
            <button (click)="exportReport('customers', 'csv')" class="btn-export border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">CSV Spreadsheet</button>
            <button (click)="exportReport('customers', 'pdf')" class="btn-export bg-sky-600 hover:bg-sky-500 text-white border-transparent">PDF Document</button>
          </div>
        </div>

        <!-- Leads Report -->
        <div class="report-card">
          <div class="h-12 w-12 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
            <span class="material-icons text-2xl">leaderboard</span>
          </div>
          <h3 class="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Sales Pipeline</h3>
          <p class="text-xs text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
            Exports active pipeline cards showing prospective companies, expected contracts value, sources, current stages, and AI conversion scores.
          </p>
          <div class="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-6">
            <button (click)="exportReport('leads', 'csv')" class="btn-export border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">CSV Spreadsheet</button>
            <button (click)="exportReport('leads', 'pdf')" class="btn-export bg-violet-600 hover:bg-violet-500 text-white border-transparent">PDF Document</button>
          </div>
        </div>

        <!-- Tickets Report -->
        <div class="report-card">
          <div class="h-12 w-12 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
            <span class="material-icons text-2xl">confirmation_number</span>
          </div>
          <h3 class="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Support Ticketing</h3>
          <p class="text-xs text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
            Compiles customer queries, categories, priorities (Low to Critical), open statuses, and assigned customer support personnel.
          </p>
          <div class="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-6">
            <button (click)="exportReport('tickets', 'csv')" class="btn-export border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">CSV Spreadsheet</button>
            <button (click)="exportReport('tickets', 'pdf')" class="btn-export bg-rose-600 hover:bg-rose-500 text-white border-transparent">PDF Document</button>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .report-card {
      background-color: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      display: flex;
      flex-col: column;
      justify-content: space-between;
    }
    .dark .report-card {
      background-color: #1e293b;
      border-color: #334155;
    }
    .btn-export {
      flex: 1;
      padding: 8px 10px;
      border: 1px solid;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      text-align: center;
      transition: all 0.2s;
    }
  `]
})
export class ReportsComponent {
  private apiService = inject(ApiService);
  private http = inject(HttpClient);

  exportReport(module: 'customers' | 'leads' | 'tickets', format: 'csv' | 'pdf') {
    const exportUrl = this.apiService.getReportExportUrl(module, format);
    const filename = `${module}_report_${new Date().toISOString().split('T')[0]}.${format}`;

    // Download the report using HttpClient blob download to pass the JWT bearer headers automatically
    this.http.get(exportUrl, { responseType: 'blob' }).subscribe({
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
        console.error(`Failed to export ${module} report:`, err);
        alert('An error occurred during report generation. Please try again.');
      }
    });
  }
}
