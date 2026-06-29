import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-sms-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">SMS Marketing Campaign Center</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Schedule targeted text campaigns, track instant delivery rates, and synchronize segment tags.</p>
        </div>
        
        <div class="flex gap-2">
          <button (click)="openCreateModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5">
            <span class="material-icons text-sm">add</span> Create SMS Campaign
          </button>
        </div>
      </div>

      <!-- Campaign List Table -->
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm p-6 overflow-hidden animate-fadeIn">
        <h4 class="font-extrabold text-xs text-slate-400 uppercase tracking-widest mb-4">SMS Deliveries History</h4>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            <thead>
              <tr class="text-left text-slate-400 font-bold uppercase tracking-wider">
                <th class="pb-3">Campaign Name</th>
                <th class="pb-3">Message template</th>
                <th class="pb-3">Target Segments</th>
                <th class="pb-3">Status</th>
                <th class="pb-3">Recipients Count</th>
                <th class="pb-3">Scheduled date</th>
                <th class="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
              <tr *ngFor="let camp of campaigns()" class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td class="py-4 font-bold text-slate-800 dark:text-white">{{ camp.name }}</td>
                <td class="py-4 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{{ camp.messageTemplate }}</td>
                <td class="py-4 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                  {{ camp.segments?.join(', ') || 'All Contacts' }}
                </td>
                <td class="py-4">
                  <span [ngClass]="{
                    'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400': camp.status === 'Completed',
                    'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-455': camp.status === 'Draft',
                    'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400': camp.status === 'Sending' || camp.status === 'Scheduled'
                  }" class="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase">
                    {{ camp.status }}
                  </span>
                </td>
                <td class="py-4 font-bold text-slate-700 dark:text-white">{{ camp.deliveryCount }} sent</td>
                <td class="py-4 text-slate-400">{{ camp.scheduledAt | date:'mediumDate' }}</td>
                <td class="py-4">
                  <div class="flex gap-2">
                    <button *ngIf="camp.status === 'Draft' || camp.status === 'Scheduled'" (click)="sendCampaign(camp._id)" class="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors uppercase">
                      Send
                    </button>
                    <button (click)="deleteCampaign(camp._id)" class="text-rose-500 hover:text-rose-400 p-1.5 rounded-lg">
                      <span class="material-icons text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="campaigns().length === 0">
                <td colspan="7" class="text-center py-12 text-slate-400 font-semibold">No SMS campaigns designed yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal: Create SMS Campaign -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 border dark:border-slate-700 p-6 rounded-2xl w-full max-w-sm space-y-4 text-xs animate-fadeIn">
          <h3 class="text-sm font-extrabold text-slate-800 dark:text-white">Create SMS Campaign</h3>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campaign Name</label>
            <input type="text" [(ngModel)]="newCampName" placeholder="Holiday Sale Alert" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Segment</label>
            <select (change)="toggleSegment($event)" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
              <option value="Lead">Leads Segment Only</option>
              <option value="Customer">Customers Segment Only</option>
              <option value="VIP">VIP Accounts</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Message template</label>
            <textarea [(ngModel)]="newCampBody" rows="4" placeholder="Hello! Quick update from GrownX. We are offering..." class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"></textarea>
          </div>
          <div class="flex gap-2 pt-2">
            <button (click)="closeCreateModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 py-2.5 rounded-xl font-bold transition-colors">Cancel</button>
            <button (click)="createCampaign()" [disabled]="!newCampName || !newCampBody" class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold transition-all">Create Campaign</button>
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
export class SmsMarketingComponent implements OnInit {
  private apiService = inject(ApiService);

  campaigns = signal<any[]>([]);
  showCreateModal = signal<boolean>(false);

  // Form state
  newCampName = '';
  newCampBody = '';
  newCampSegments: string[] = ['Lead'];

  ngOnInit() {
    this.loadCampaigns();
  }

  loadCampaigns() {
    this.apiService.getSmsCampaigns().subscribe({
      next: (res) => {
        if (res.success) this.campaigns.set(res.data);
      }
    });
  }

  openCreateModal() {
    this.newCampName = '';
    this.newCampBody = '';
    this.newCampSegments = ['Lead'];
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  toggleSegment(event: any) {
    this.newCampSegments = [event.target.value];
  }

  createCampaign() {
    const payload = {
      name: this.newCampName,
      messageTemplate: this.newCampBody,
      segments: this.newCampSegments,
    };

    this.apiService.createSmsCampaign(payload).subscribe({
      next: (res) => {
        this.closeCreateModal();
        this.loadCampaigns();
      }
    });
  }

  sendCampaign(id: string) {
    this.apiService.sendSmsCampaign(id).subscribe({
      next: (res) => {
        this.loadCampaigns();
        
        // Simulates polling completed status locally
        setTimeout(() => this.loadCampaigns(), 3000);
      }
    });
  }

  deleteCampaign(id: string) {
    if (confirm('Delete this SMS campaign permanently?')) {
      this.apiService.deleteSmsCampaign(id).subscribe({
        next: () => this.loadCampaigns()
      });
    }
  }
}
