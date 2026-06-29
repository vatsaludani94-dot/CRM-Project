import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface WorkflowStep {
  type: 'Condition' | 'Action' | 'Delay';
  config: {
    actionType?: string;
    emailSubject?: string;
    emailBody?: string;
    smsText?: string;
    whatsappText?: string;
    assignedEmployee?: string;
    taskTitle?: string;
    taskPriority?: string;
    webhookUrl?: string;
    conditionField?: string;
    conditionOperator?: 'equals' | 'not_equals' | 'contains';
    conditionValue?: string;
    delayDuration?: number;
    delayUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  };
}

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Workflow Automation</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Design visual triggers, conditions, delays, and automated triggers.</p>
        </div>
        <div class="flex gap-3">
          <button (click)="setView('list')" [class.bg-indigo-600]="activeView() === 'list'" class="bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md">
            Workflows List
          </button>
          <button (click)="startNewWorkflow()" [class.bg-indigo-600]="activeView() === 'builder'" class="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-500 transition-all shadow-md flex items-center gap-1.5">
            <span class="material-icons text-sm">add</span> Create Workflow
          </button>
          <button (click)="setView('logs')" [class.bg-indigo-600]="activeView() === 'logs'" class="bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md">
            Execution Logs
          </button>
        </div>
      </div>

      <!-- View: Workflow List -->
      <div *ngIf="activeView() === 'list'" class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
        <div *ngFor="let wf of workflows()" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div class="space-y-3">
            <div class="flex justify-between items-start">
              <span class="text-xs font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase">{{ wf.trigger }}</span>
              <span class="h-2 w-2 rounded-full" [class.bg-emerald-500]="wf.isActive" [class.bg-slate-400]="!wf.isActive"></span>
            </div>
            <h3 class="text-lg font-bold text-slate-800 dark:text-white">{{ wf.name }}</h3>
            <p class="text-xs text-slate-400">Total Steps configured: {{ wf.steps?.length || 0 }}</p>
          </div>
          <div class="flex gap-2 pt-2">
            <button (click)="editWorkflow(wf)" class="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2 rounded-xl transition-colors">
              Configure
            </button>
            <button (click)="deleteWorkflow(wf._id)" class="bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-xl transition-colors">
              <span class="material-icons text-sm">delete</span>
            </button>
          </div>
        </div>

        <div *ngIf="workflows().length === 0" class="col-span-3 text-center py-16 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-3">
          <span class="material-icons text-4xl text-slate-300">account_tree</span>
          <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">No automation workflows found. Click Create Workflow to start.</p>
        </div>
      </div>

      <!-- View: Visual Builder -->
      <div *ngIf="activeView() === 'builder'" class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
        
        <!-- Left Panel: Steps Designer -->
        <div class="lg:col-span-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center min-h-[500px] relative overflow-y-auto">
          
          <div class="absolute top-4 left-4">
            <input type="text" [(ngModel)]="workflowName" placeholder="Untitled Workflow" class="bg-transparent border-b border-slate-700 text-lg font-bold text-white focus:outline-none focus:border-indigo-500 py-1 max-w-xs">
          </div>

          <!-- Trigger Node -->
          <div class="w-64 bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center text-center mt-12 relative border border-indigo-400">
            <span class="material-icons text-2xl mb-1.5">bolt</span>
            <span class="text-[10px] font-black uppercase tracking-wider text-indigo-200">Workflow Trigger</span>
            <select [(ngModel)]="workflowTrigger" class="bg-slate-900 text-white font-bold text-xs rounded-lg px-2 py-1 mt-2 focus:outline-none w-full border border-indigo-500 text-center">
              <option value="Lead Created">Lead Created</option>
              <option value="Lead Converted">Lead Converted</option>
              <option value="Customer Created">Customer Created</option>
              <option value="Ticket Created">Ticket Created</option>
              <option value="Form Submitted">Form Submitted</option>
              <option value="Survey Submitted">Survey Submitted</option>
              <option value="Appointment Booked">Appointment Booked</option>
              <option value="Deal Won">Deal Won</option>
              <option value="Deal Lost">Deal Lost</option>
              <option value="Email Received">Email Received</option>
              <option value="WhatsApp Message Received">WhatsApp Message Received</option>
              <option value="Instagram Message Received">Instagram Message Received</option>
            </select>
          </div>

          <!-- Connection Arrow -->
          <div class="h-8 w-0.5 bg-slate-700 flex justify-center items-center">
            <span class="material-icons text-slate-700 text-sm translate-y-1">arrow_downward</span>
          </div>

          <!-- Steps Loop -->
          <div class="flex flex-col items-center w-full space-y-0" *ngFor="let step of steps(); let idx = index">
            
            <!-- Step Card -->
            <div class="w-64 bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-md relative group flex flex-col items-center text-center">
              <button (click)="removeStep(idx)" class="absolute -top-2.5 -right-2.5 h-6 w-6 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="material-icons text-sm">close</span>
              </button>
              
              <div class="flex items-center gap-1.5 mb-2">
                <span class="material-icons text-sm" [ngClass]="{
                  'text-pink-400': step.type === 'Condition',
                  'text-emerald-400': step.type === 'Action',
                  'text-amber-400': step.type === 'Delay'
                }">
                  {{ step.type === 'Condition' ? 'rule' : step.type === 'Action' ? 'bolt' : 'schedule' }}
                </span>
                <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">{{ step.type }}</span>
              </div>

              <!-- Render Brief Config Description -->
              <p class="text-xs font-bold text-white max-w-[200px] truncate" *ngIf="step.type === 'Action'">
                {{ step.config.actionType || 'Define Action' }}
              </p>
              <p class="text-xs font-bold text-white max-w-[200px]" *ngIf="step.type === 'Condition'">
                If: {{ step.config.conditionField || 'field' }} {{ step.config.conditionOperator }} {{ step.config.conditionValue || 'value' }}
              </p>
              <p class="text-xs font-bold text-white max-w-[200px]" *ngIf="step.type === 'Delay'">
                Wait: {{ step.config.delayDuration || 0 }} {{ step.config.delayUnit || 'minutes' }}
              </p>

              <button (click)="selectStepForConfig(idx)" class="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold mt-2">
                Configure Step
              </button>
            </div>

            <!-- Connection Arrow -->
            <div class="h-8 w-0.5 bg-slate-700 flex justify-center items-center">
              <span class="material-icons text-slate-700 text-sm translate-y-1">arrow_downward</span>
            </div>

          </div>

          <!-- Add Step Button Node -->
          <div class="flex gap-2.5 py-4">
            <button (click)="addStep('Condition')" class="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 font-bold text-[10px] px-3.5 py-2 rounded-xl transition-colors uppercase flex items-center gap-1">
              <span class="material-icons text-[12px]">add</span> Condition
            </button>
            <button (click)="addStep('Action')" class="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] px-3.5 py-2 rounded-xl transition-colors uppercase flex items-center gap-1">
              <span class="material-icons text-[12px]">add</span> Action
            </button>
            <button (click)="addStep('Delay')" class="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold text-[10px] px-3.5 py-2 rounded-xl transition-colors uppercase flex items-center gap-1">
              <span class="material-icons text-[12px]">add</span> Delay
            </button>
          </div>

          <!-- Save Button -->
          <div class="absolute bottom-4 right-4">
            <button (click)="saveWorkflow()" [disabled]="!workflowName" class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all">
              Save Automation Flow
            </button>
          </div>

        </div>

        <!-- Right Panel: Step Configurator Form -->
        <div class="lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-6">
          <h3 class="text-md font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <span class="material-icons text-indigo-500">settings</span> Step Configuration
          </h3>
          
          <div *ngIf="selectedStepIdx() === null" class="text-center py-16 text-slate-400 text-xs">
            Select a step card in the visual flowchart builder to edit its configuration fields.
          </div>

          <div *ngIf="selectedStepIdx() !== null" class="space-y-4 text-xs animate-fadeIn">
            
            <!-- Type: Condition -->
            <div *ngIf="getSelectedStep()?.type === 'Condition'" class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Field Name</label>
                <input type="text" [(ngModel)]="getSelectedStep()!.config.conditionField" placeholder="e.g. status" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Operator</label>
                <select [(ngModel)]="getSelectedStep()!.config.conditionOperator" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
                  <option value="equals">equals</option>
                  <option value="not_equals">not_equals</option>
                  <option value="contains">contains</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Value to Match</label>
                <input type="text" [(ngModel)]="getSelectedStep()!.config.conditionValue" placeholder="e.g. Active" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
              </div>
            </div>

            <!-- Type: Delay -->
            <div *ngIf="getSelectedStep()?.type === 'Delay'" class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Duration</label>
                  <input type="number" [(ngModel)]="getSelectedStep()!.config.delayDuration" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit</label>
                  <select [(ngModel)]="getSelectedStep()!.config.delayUnit" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
                    <option value="seconds">seconds</option>
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Type: Action -->
            <div *ngIf="getSelectedStep()?.type === 'Action'" class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Action Type</label>
                <select [(ngModel)]="getSelectedStep()!.config.actionType" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
                  <option value="Send Email">Send Email</option>
                  <option value="Send SMS">Send SMS</option>
                  <option value="Send WhatsApp Message">Send WhatsApp Message</option>
                  <option value="Create Task">Create Task</option>
                  <option value="Create Ticket">Create Ticket</option>
                  <option value="Trigger Webhook">Trigger Webhook</option>
                </select>
              </div>

              <!-- Action-specific fields -->
              <div *ngIf="getSelectedStep()!.config.actionType === 'Send Email'" class="space-y-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                  <input type="text" [(ngModel)]="getSelectedStep()!.config.emailSubject" placeholder="Welcome aboard!" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Body Template</label>
                  <textarea [(ngModel)]="getSelectedStep()!.config.emailBody" rows="4" placeholder="Email body details..." class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"></textarea>
                </div>
              </div>

              <div *ngIf="getSelectedStep()!.config.actionType === 'Send SMS'" class="space-y-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">SMS Text</label>
                  <textarea [(ngModel)]="getSelectedStep()!.config.smsText" rows="3" placeholder="SMS copy text..." class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"></textarea>
                </div>
              </div>

              <div *ngIf="getSelectedStep()!.config.actionType === 'Send WhatsApp Message'" class="space-y-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">WhatsApp Text</label>
                  <textarea [(ngModel)]="getSelectedStep()!.config.whatsappText" rows="3" placeholder="WhatsApp copy..." class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"></textarea>
                </div>
              </div>

              <div *ngIf="getSelectedStep()!.config.actionType === 'Create Task'" class="space-y-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Task Title</label>
                  <input type="text" [(ngModel)]="getSelectedStep()!.config.taskTitle" placeholder="Follow-up call" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority</label>
                  <select [(ngModel)]="getSelectedStep()!.config.taskPriority" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div *ngIf="getSelectedStep()!.config.actionType === 'Trigger Webhook'" class="space-y-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Webhook URL</label>
                  <input type="text" [(ngModel)]="getSelectedStep()!.config.webhookUrl" placeholder="https://api.mycrm.com/callback" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
                </div>
              </div>

            </div>

            <button (click)="selectedStepIdx.set(null)" class="w-full bg-slate-900 border border-slate-700/80 hover:bg-slate-900 text-slate-300 py-2.5 rounded-xl font-bold transition-all text-[11px] mt-4">
              Close Settings
            </button>

          </div>
        </div>

      </div>

      <!-- View: Execution Logs -->
      <div *ngIf="activeView() === 'logs'" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm p-6 overflow-hidden animate-fadeIn">
        <h3 class="text-sm font-extrabold text-slate-700 dark:text-white uppercase tracking-wider mb-4">Workflow Automation History</h3>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            <thead>
              <tr class="text-left text-slate-400 font-bold uppercase tracking-wider">
                <th class="pb-3">Workflow Name</th>
                <th class="pb-3">Trigger Entity</th>
                <th class="pb-3">Status</th>
                <th class="pb-3">Steps Run</th>
                <th class="pb-3">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr *ngFor="let log of workflowLogs()" class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td class="py-3 font-semibold text-slate-800 dark:text-white">{{ log.workflow?.name || 'Deleted Workflow' }}</td>
                <td class="py-3 font-medium text-slate-600">{{ log.entityType }} [{{ log.entityId }}]</td>
                <td class="py-3">
                  <span [ngClass]="{
                    'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400': log.status === 'success',
                    'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400': log.status === 'failed',
                    'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400': log.status === 'in_progress'
                  }" class="px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase">
                    {{ log.status }}
                  </span>
                </td>
                <td class="py-3 font-medium text-slate-500">
                  {{ log.executedSteps?.length || 0 }} steps completed
                </td>
                <td class="py-3 font-medium text-slate-400">{{ log.createdAt | date:'medium' }}</td>
              </tr>
              <tr *ngIf="workflowLogs().length === 0">
                <td colspan="5" class="text-center py-12 text-slate-400 font-semibold">No automation history logs found.</td>
              </tr>
            </tbody>
          </table>
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
export class WorkflowsComponent implements OnInit {
  private apiService = inject(ApiService);

  activeView = signal<string>('list');
  workflows = signal<any[]>([]);
  workflowLogs = signal<any[]>([]);

  // Builder state
  workflowId: string | null = null;
  workflowName = '';
  workflowTrigger = 'Lead Created';
  steps = signal<WorkflowStep[]>([]);
  selectedStepIdx = signal<number | null>(null);

  ngOnInit() {
    this.loadWorkflows();
    this.loadWorkflowLogs();
  }

  setView(view: string) {
    this.activeView.set(view);
  }

  loadWorkflows() {
    this.apiService.getWorkflows().subscribe({
      next: (res) => {
        if (res.success) this.workflows.set(res.data);
      }
    });
  }

  loadWorkflowLogs() {
    this.apiService.getWorkflowLogs().subscribe({
      next: (res) => {
        if (res.success) this.workflowLogs.set(res.data);
      }
    });
  }

  startNewWorkflow() {
    this.workflowId = null;
    this.workflowName = '';
    this.workflowTrigger = 'Lead Created';
    this.steps.set([]);
    this.selectedStepIdx.set(null);
    this.setView('builder');
  }

  addStep(type: 'Condition' | 'Action' | 'Delay') {
    const newStep: WorkflowStep = {
      type,
      config: type === 'Condition' ? {
        conditionField: 'status',
        conditionOperator: 'equals',
        conditionValue: 'Active'
      } : type === 'Delay' ? {
        delayDuration: 10,
        delayUnit: 'minutes'
      } : {
        actionType: 'Send Email',
        emailSubject: '',
        emailBody: ''
      }
    };

    this.steps.set([...this.steps(), newStep]);
    this.selectedStepIdx.set(this.steps().length - 1);
  }

  removeStep(idx: number) {
    const cur = this.steps();
    cur.splice(idx, 1);
    this.steps.set([...cur]);
    this.selectedStepIdx.set(null);
  }

  selectStepForConfig(idx: number) {
    this.selectedStepIdx.set(idx);
  }

  getSelectedStep(): WorkflowStep | null {
    const idx = this.selectedStepIdx();
    if (idx === null) return null;
    return this.steps()[idx];
  }

  editWorkflow(wf: any) {
    this.workflowId = wf._id;
    this.workflowName = wf.name;
    this.workflowTrigger = wf.trigger;
    this.steps.set(wf.steps || []);
    this.selectedStepIdx.set(null);
    this.setView('builder');
  }

  saveWorkflow() {
    const payload = {
      name: this.workflowName,
      trigger: this.workflowTrigger,
      steps: this.steps()
    };

    const request = this.workflowId 
      ? this.apiService.updateWorkflow(this.workflowId, payload)
      : this.apiService.createWorkflow(payload);

    request.subscribe({
      next: (res) => {
        this.loadWorkflows();
        this.setView('list');
      }
    });
  }

  deleteWorkflow(id: string) {
    if (confirm('Are you sure you want to delete this workflow?')) {
      this.apiService.deleteWorkflow(id).subscribe({
        next: () => this.loadWorkflows()
      });
    }
  }
}
