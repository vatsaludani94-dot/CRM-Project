import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface TimelineEvent {
  event: string;
  description: string;
  date: Date;
  type: string;
  icon: string;
}

@Component({
  selector: 'app-customer360',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-6" *ngIf="customer360()">
      
      <!-- Back button and title -->
      <div class="flex items-center gap-4">
        <a routerLink="/customers" class="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center justify-center text-slate-500">
          <span class="material-icons">arrow_back</span>
        </a>
        <div>
          <span class="text-xs text-sky-500 font-bold uppercase tracking-widest">Client Profile</span>
          <h1 class="text-2xl font-black text-slate-800 dark:text-white mt-1 flex items-center gap-3">
            <span>{{ customer360().customer.companyName }}</span>
            <span [ngClass]="{
              'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 ring-2 ring-amber-500/25 border border-amber-500/30': customer360().customer.status === 'VIP',
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400': customer360().customer.status === 'Active',
              'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400': customer360().customer.status === 'Inactive'
            }" class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              {{ customer360().customer.status }}
            </span>
          </h1>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Panel: Profile Info and Internal Actions -->
        <div class="lg:col-span-1 space-y-6">
          
          <!-- Corporate Card -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="font-bold text-sm text-slate-700 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 pb-3">Corporate Account File</h3>
            
            <div class="space-y-3 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-400 font-semibold">Client Code:</span>
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ customer360().customer.customerCode }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 font-semibold">Contact Person:</span>
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ customer360().customer.contactPerson }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 font-semibold">Email:</span>
                <span class="font-medium text-sky-500">{{ customer360().customer.email }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 font-semibold">Phone:</span>
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ customer360().customer.phone }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 font-semibold">Industry:</span>
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ customer360().customer.industry }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 font-semibold">Representative:</span>
                <span class="font-bold text-slate-900 dark:text-slate-200">{{ customer360().customer.assignedEmployee ? customer360().customer.assignedEmployee.name : 'Unassigned' }}</span>
              </div>
              <div class="flex justify-between border-t border-slate-100 dark:border-slate-700/60 pt-3">
                <span class="text-slate-400 font-semibold">Revenue Generated:</span>
                <span class="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">\${{ customer360().revenueGenerated.toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- Add Note Section -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="font-bold text-sm text-slate-700 dark:text-white uppercase tracking-wider mb-2">Write internal Note</h3>
            <textarea 
              [(ngModel)]="newNote" 
              placeholder="Type customer update notes..." 
              rows="3" 
              class="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 dark:text-white"></textarea>
            <button 
              (click)="addNote()" 
              [disabled]="!newNote.trim()"
              class="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 disabled:bg-slate-300 disabled:text-slate-400 dark:disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold active:scale-95 transition-all">
              Post Note
            </button>
          </div>

          <!-- Log Call/Interaction Section -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="font-bold text-sm text-slate-700 dark:text-white uppercase tracking-wider mb-2">Log Interaction</h3>
            
            <div class="flex gap-2">
              <button 
                *ngFor="let t of ['Call', 'Email', 'Meeting']" 
                (click)="selectedActivityType = t"
                [class.bg-sky-600]="selectedActivityType === t"
                [class.text-white]="selectedActivityType === t"
                [class.bg-slate-50]="selectedActivityType !== t"
                [class.dark:bg-slate-900]="selectedActivityType !== t"
                class="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all">
                {{ t }}
              </button>
            </div>

            <input 
              type="text" 
              [(ngModel)]="activityDesc" 
              placeholder="e.g., Discussed renewal pricing" 
              class="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white">
            
            <button 
              (click)="logActivity()" 
              [disabled]="!activityDesc.trim()"
              class="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold transition-all">
              Save Interaction
            </button>
          </div>

        </div>

        <!-- Right Panel: Chronological Interactive Timeline & Tickets -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Timeline View -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-6">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h3 class="font-bold text-sm text-slate-700 dark:text-white uppercase tracking-wider">Client Timeline History</h3>
              <input type="text" [(ngModel)]="timelineSearch" placeholder="Search timeline..." class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-755 dark:text-white w-full sm:w-48">
            </div>
            
            <div class="relative pl-6 border-l border-slate-200 dark:border-slate-700 space-y-8">
              <div *ngFor="let event of filteredTimeline()" class="relative">
                
                <!-- Timeline bullet icon -->
                <span class="absolute -left-[35px] top-0 h-6.5 w-6.5 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-white"
                  [ngClass]="{
                    'bg-indigo-500': event.type === 'system',
                    'bg-amber-500': event.type === 'lead',
                    'bg-emerald-500': event.type === 'lead_converted',
                    'bg-rose-500': event.type === 'ticket_opened',
                    'bg-emerald-600': event.type === 'ticket_closed',
                    'bg-sky-500': event.type === 'activity',
                    'bg-slate-500': event.type === 'note',
                    'bg-violet-600': event.type === 'email',
                    'bg-indigo-600': event.type === 'document',
                    'bg-amber-600': event.type === 'task'
                  }">
                  <span class="material-icons text-xs">{{ event.icon }}</span>
                </span>

                <!-- Event Details -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between gap-4">
                    <span class="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wide">{{ event.event }}</span>
                    <span class="text-[10px] text-slate-400 font-semibold">{{ event.date | date:'medium' }}</span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 leading-normal">{{ event.description }}</p>
                </div>

              </div>
            </div>
          </div>

          <!-- Customer Support Tickets -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="font-bold text-sm text-slate-700 dark:text-white uppercase tracking-wider mb-2">Linked Tickets</h3>
            
            <div *ngIf="customer360().tickets.length === 0" class="p-6 text-center text-slate-400 text-xs">
              No tickets registered for this customer.
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div *ngFor="let t of customer360().tickets" class="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 relative hover:border-sky-500/30 transition-all">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-bold text-sky-500 text-xs">{{ t.ticketCode }}</span>
                    <h5 class="font-semibold text-xs text-slate-800 dark:text-white truncate max-w-[150px] mt-1">{{ t.title }}</h5>
                  </div>
                  <span [ngClass]="{
                    'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400': t.priority === 'Critical',
                    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400': t.priority === 'High',
                    'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400': t.priority === 'Medium',
                    'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400': t.priority === 'Low'
                  }" class="px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase">
                    {{ t.priority }}
                  </span>
                </div>
                <div class="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <span class="capitalize">Status: <b class="text-slate-600 dark:text-slate-300">{{ t.status }}</b></span>
                  <a routerLink="/tickets" class="text-sky-500 font-bold hover:underline">Support center</a>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  `
})
export class Customer360Component implements OnInit {
  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);

  customer360 = signal<any | null>(null);
  newNote = '';
  selectedActivityType = 'Call';
  activityDesc = '';

  ngOnInit() {
    const customerId = this.route.snapshot.paramMap.get('id');
    if (customerId) {
      this.load360(customerId);
    }
  }

  load360(id: string) {
    this.apiService.getCustomer360(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.customer360.set(res.data);
        }
      }
    });
  }

  addNote() {
    if (!this.newNote.trim()) return;
    const customerId = this.customer360().customer._id;

    this.apiService.addCustomerNote(customerId, this.newNote).subscribe({
      next: () => {
        this.newNote = '';
        this.load360(customerId);
      }
    });
  }

  logActivity() {
    if (!this.activityDesc.trim()) return;
    const customerId = this.customer360().customer._id;
    const activityPayload = {
      type: this.selectedActivityType,
      description: this.activityDesc
    };

    this.apiService.logCustomerActivity(customerId, activityPayload).subscribe({
      next: () => {
        this.activityDesc = '';
        this.load360(customerId);
      }
    });
  }

  timelineSearch = '';

  filteredTimeline() {
    const search = this.timelineSearch.toLowerCase().trim();
    const timeline = this.customer360()?.timeline || [];
    if (!search) return timeline;
    return timeline.filter((e: any) => 
      e.event.toLowerCase().includes(search) || 
      e.description.toLowerCase().includes(search)
    );
  }
}
