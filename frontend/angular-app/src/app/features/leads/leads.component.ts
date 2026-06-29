import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';

export interface LeadModel {
  _id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  leadSource: string;
  expectedRevenue: number;
  stage: 'New' | 'Contacted' | 'Interested' | 'Proposal Sent' | 'Negotiation' | 'Converted' | 'Lost';
  aiScore: number;
  assignedEmployee?: {
    _id: string;
    name: string;
  };
  notes: Array<{
    content: string;
    createdBy: { name: string };
    createdAt: Date;
  }>;
  activityLog: Array<{
    type: string;
    description: string;
    date: Date;
  }>;
}

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Sales Pipeline</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Drag and drop leads to advance stages. Real-time AI scoring guides conversion.</p>
        </div>
        
        <button 
          (click)="openAddModal()" 
          class="py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-sky-600/20 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-icons text-sm">add</span>
          <span>New Lead</span>
        </button>
      </div>

      <!-- Kanban Board Wrapper -->
      <div class="flex gap-4 overflow-x-auto pb-6 select-none" cdkDropListGroup>
        
        <!-- Column Stages -->
        <div *ngFor="let col of boardColumns" class="flex-1 min-w-[280px] max-w-[320px] bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex flex-col h-[70vh]">
          
          <!-- Column Header -->
          <div class="flex justify-between items-center mb-3 px-1">
            <span class="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span>{{ col.name }}</span>
              <span class="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-500 font-bold">
                {{ getLeadsByStage(col.stage).length }}
              </span>
            </span>
            <span class="text-[10px] font-extrabold text-slate-400 dark:text-slate-500">
              \${{ getExpectedRevenueSum(col.stage).toLocaleString() }}
            </span>
          </div>

          <!-- Drag Drop Container -->
          <div 
            [id]="col.stage"
            cdkDropList
            [cdkDropListData]="getLeadsByStage(col.stage)"
            (cdkDropListDropped)="onCardDropped($event)"
            class="flex-1 space-y-3 overflow-y-auto min-h-[150px] scrollbar-thin">
            
            <!-- Lead Card -->
            <div 
              *ngFor="let lead of getLeadsByStage(col.stage)"
              cdkDrag
              (click)="openDrawer(lead)"
              class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-sky-500/35 transition-all space-y-3">
              
              <div class="flex justify-between items-start gap-2">
                <h4 class="font-bold text-xs text-slate-900 dark:text-slate-100 truncate flex-1">{{ lead.company }}</h4>
                <!-- AI Score Badge -->
                <span [ngClass]="{
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-500/20': lead.aiScore >= 75,
                  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-500/20': lead.aiScore >= 40 && lead.aiScore < 75,
                  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-500/20': lead.aiScore < 40
                }" class="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide shrink-0">
                  {{ lead.aiScore }}% AI
                </span>
              </div>

              <!-- Contact & Deal size -->
              <div class="text-[11px] text-slate-600 dark:text-slate-400">
                <div class="font-semibold text-slate-700 dark:text-slate-300">{{ lead.contactName }}</div>
                <div class="mt-1 flex items-center justify-between">
                  <span class="font-extrabold text-slate-800 dark:text-slate-200">\${{ lead.expectedRevenue.toLocaleString() }}</span>
                  <span class="text-[9px] font-bold uppercase text-slate-400 tracking-widest bg-slate-50 dark:bg-slate-900 px-1 py-0.5 rounded">{{ lead.leadSource }}</span>
                </div>
              </div>

              <!-- Assignee -->
              <div class="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <span>Rep: <b>{{ lead.assignedEmployee ? lead.assignedEmployee.name : 'Unassigned' }}</b></span>
                <span class="material-icons text-slate-400 text-sm">more_horiz</span>
              </div>

            </div>

          </div>

        </div>

      </div>

      <!-- Add Lead Modal Overlay -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Create New Lead Profile</h3>
            <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-icons">close</span></button>
          </div>
          <form class="space-y-4 text-xs text-slate-700 dark:text-slate-200">
            <div>
              <label class="block font-semibold uppercase tracking-wider text-slate-400">Company Name</label>
              <input type="text" [(ngModel)]="formModel.company" name="company" class="modal-input">
            </div>
            <div>
              <label class="block font-semibold uppercase tracking-wider text-slate-400">Contact Person Name</label>
              <input type="text" [(ngModel)]="formModel.contactName" name="contactName" class="modal-input">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold uppercase tracking-wider text-slate-400">Email</label>
                <input type="email" [(ngModel)]="formModel.email" name="email" class="modal-input">
              </div>
              <div>
                <label class="block font-semibold uppercase tracking-wider text-slate-400">Phone</label>
                <input type="text" [(ngModel)]="formModel.phone" name="phone" class="modal-input">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold uppercase tracking-wider text-slate-400">Expected Value ($)</label>
                <input type="number" [(ngModel)]="formModel.expectedRevenue" name="expectedRevenue" class="modal-input">
              </div>
              <div>
                <label class="block font-semibold uppercase tracking-wider text-slate-400">Lead Source</label>
                <select [(ngModel)]="formModel.leadSource" name="leadSource" class="modal-input">
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Partner">Partner</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </form>
          <div class="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button (click)="closeModal()" class="flex-1 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-bold">Cancel</button>
            <button (click)="submitForm()" class="flex-1 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-white font-bold">Create Lead</button>
          </div>
        </div>
      </div>

      <!-- Lead Details Slideover Drawer -->
      <div *ngIf="activeLead() as lead" class="fixed inset-y-0 right-0 z-40 w-96 bg-white dark:bg-slate-800 shadow-2xl p-6 border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between overflow-y-auto">
        <div class="space-y-6">
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <span class="text-[10px] text-sky-500 font-bold uppercase tracking-wider">Lead File</span>
              <h3 class="text-sm font-bold text-slate-800 dark:text-white mt-1">{{ lead.company }}</h3>
            </div>
            <button (click)="closeDrawer()" class="text-slate-400 hover:text-slate-600"><span class="material-icons">close</span></button>
          </div>

          <!-- AI Score Insights -->
          <div class="p-4 bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-slate-700 rounded-xl space-y-2">
            <h4 class="text-xs font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
              <span class="material-icons text-sm">psychology</span>
              <span>AI Conversion Predictor</span>
            </h4>
            <p class="text-[11px] text-sky-600 dark:text-slate-400 leading-normal">
              Based on the lead source (<b>{{ lead.leadSource }}</b>) and status (<b>{{ lead.stage }}</b>), the predictive scoring model estimates a <b>{{ lead.aiScore }}%</b> probability of converting this lead into an active paying customer.
            </p>
          </div>

          <!-- Tabs (Notes & Activity Log) -->
          <div class="space-y-4">
            
            <!-- Notes -->
            <div class="space-y-2">
              <h4 class="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase">Notes ({{ lead.notes.length }})</h4>
              <div class="space-y-2 max-h-40 overflow-y-auto">
                <div *ngFor="let n of lead.notes" class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs space-y-1">
                  <p class="text-slate-600 dark:text-slate-400 leading-normal">{{ n.content }}</p>
                  <span class="text-[10px] text-slate-400 block font-semibold">- By staff</span>
                </div>
              </div>
              <div class="flex gap-2 mt-2">
                <input type="text" [(ngModel)]="newLeadNote" placeholder="Write lead update note..." class="flex-1 p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs">
                <button (click)="addLeadNote()" [disabled]="!newLeadNote.trim()" class="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-lg text-white text-xs font-bold transition-all">Add</button>
              </div>
            </div>

            <!-- Lead Activities -->
            <div class="space-y-2 border-t border-slate-100 dark:border-slate-700/60 pt-4">
              <h4 class="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase">Pipeline History</h4>
              <div class="space-y-3 max-h-48 overflow-y-auto">
                <div *ngFor="let act of lead.activityLog" class="flex items-start gap-2.5 text-xs">
                  <span class="material-icons text-slate-400 text-sm mt-0.5">history</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-slate-600 dark:text-slate-400 leading-normal truncate">{{ act.description }}</p>
                    <span class="text-[9px] text-slate-400 block mt-0.5">{{ act.date | date:'short' }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <button (click)="deleteLead(lead._id)" class="w-full mt-6 py-2 border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1.5">
          <span class="material-icons text-sm">delete</span>
          <span>Delete Lead File</span>
        </button>
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
    /* Drag & drop styles */
    .cdk-drag-preview {
      box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                  0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12);
      border-radius: 12px;
      background: white;
    }
    .dark .cdk-drag-preview {
      background: #1e293b;
    }
    .cdk-drag-placeholder {
      opacity: 0.2;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class LeadsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  leads = signal<LeadModel[]>([]);
  activeLead = signal<LeadModel | null>(null);
  newLeadNote = '';

  isModalOpen = signal(false);
  formModel = {
    company: '',
    contactName: '',
    email: '',
    phone: '',
    expectedRevenue: 0,
    leadSource: 'Website'
  };

  boardColumns = [
    { name: 'New Inquiries', stage: 'New' as const },
    { name: 'Contacted', stage: 'Contacted' as const },
    { name: 'Interested', stage: 'Interested' as const },
    { name: 'Proposal Sent', stage: 'Proposal Sent' as const },
    { name: 'Negotiation', stage: 'Negotiation' as const },
    { name: 'Converted', stage: 'Converted' as const },
    { name: 'Lost', stage: 'Lost' as const }
  ];

  ngOnInit() {
    this.loadLeads();
  }

  loadLeads() {
    this.apiService.getLeads().subscribe({
      next: (res) => {
        if (res.success) {
          this.leads.set(res.data);
          // If drawer is open, refresh activeLead data too
          if (this.activeLead()) {
            const updated = res.data.find((l: LeadModel) => l._id === this.activeLead()?._id);
            if (updated) this.activeLead.set(updated);
          }
        }
      }
    });
  }

  getLeadsByStage(stage: LeadModel['stage']): LeadModel[] {
    return this.leads().filter(l => l.stage === stage);
  }

  getExpectedRevenueSum(stage: LeadModel['stage']): number {
    return this.getLeadsByStage(stage).reduce((sum, current) => sum + (current.expectedRevenue || 0), 0);
  }

  onCardDropped(event: CdkDragDrop<LeadModel[]>) {
    // Check if stage actually changed
    if (event.previousContainer.id === event.container.id) {
      // Re-order within same stage array
      const list = [...this.getLeadsByStage(event.previousContainer.id as LeadModel['stage'])];
      moveItemInArray(list, event.previousIndex, event.currentIndex);
      return;
    }

    // Dragged item details
    const draggedLead = event.previousContainer.data[event.previousIndex];
    const targetStage = event.container.id as LeadModel['stage'];

    // Update backend stage
    this.apiService.updateLead(draggedLead._id, { stage: targetStage }).subscribe({
      next: () => this.loadLeads(),
      error: () => this.loadLeads() // reset on error
    });

    // Optimistically update frontend UI array
    this.leads.update(current => current.map(item => item._id === draggedLead._id ? { ...item, stage: targetStage } : item));
  }

  openAddModal() {
    this.formModel = {
      company: '',
      contactName: '',
      email: '',
      phone: '',
      expectedRevenue: 0,
      leadSource: 'Website'
    };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  submitForm() {
    this.apiService.createLead(this.formModel).subscribe({
      next: () => {
        this.loadLeads();
        this.closeModal();
      }
    });
  }

  openDrawer(lead: LeadModel) {
    this.activeLead.set(lead);
  }

  closeDrawer() {
    this.activeLead.set(null);
  }

  addLeadNote() {
    if (!this.newLeadNote.trim() || !this.activeLead()) return;
    const leadId = this.activeLead()?._id || '';

    this.apiService.addLeadNote(leadId, this.newLeadNote).subscribe({
      next: () => {
        this.newLeadNote = '';
        this.loadLeads();
      }
    });
  }

  deleteLead(id: string) {
    if (confirm('Delete lead record? All associated notes and logs will be lost.')) {
      this.apiService.deleteLead(id).subscribe({
        next: () => {
          this.closeDrawer();
          this.loadLeads();
        }
      });
    }
  }
}
