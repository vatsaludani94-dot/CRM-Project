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
    delayUnit?: 'seconds' | 'minutes' | 'hours' | 'days' | 'Days';
  };
}

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h1 class="text-2xl font-extrabold text-stone-900 tracking-tight">Workflow Automation Engine</h1>
          <p class="text-xs text-stone-500 mt-0.5">Design natural-language workflows or build visual triggers & delays.</p>
        </div>
        <div class="flex gap-2">
          <button (click)="setView('list')" 
                  [class.bg-amber-600]="activeView() === 'list'" 
                  [class.text-white]="activeView() === 'list'"
                  [class.bg-stone-100]="activeView() !== 'list'"
                  [class.text-stone-800]="activeView() !== 'list'"
                  class="hover:bg-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm border border-stone-200">
            Workflows List
          </button>
          <button (click)="startNewWorkflow()" 
                  [class.bg-amber-600]="activeView() === 'builder'" 
                  [class.text-white]="activeView() === 'builder'"
                  [class.bg-stone-100]="activeView() !== 'builder'"
                  [class.text-stone-800]="activeView() !== 'builder'"
                  class="hover:bg-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 border border-stone-200">
            <span class="material-icons text-sm">add</span> Create Workflow
          </button>
          <button (click)="setView('logs')" 
                  [class.bg-amber-600]="activeView() === 'logs'" 
                  [class.text-white]="activeView() === 'logs'"
                  [class.bg-stone-100]="activeView() !== 'logs'"
                  [class.text-stone-800]="activeView() !== 'logs'"
                  class="hover:bg-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm border border-stone-200">
            Execution Logs
          </button>
        </div>
      </div>

      <!-- View: Workflow List -->
      <div *ngIf="activeView() === 'list'" class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
        <div *ngFor="let wf of workflows()" class="bg-white border border-stone-200/80 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div class="space-y-3">
            <div class="flex justify-between items-start">
              <span class="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-200">{{ wf.trigger }}</span>
              <span class="h-2.5 w-2.5 rounded-full" [class.bg-emerald-500]="wf.isActive" [class.bg-stone-300]="!wf.isActive"></span>
            </div>
            <h3 class="text-lg font-bold text-stone-900">{{ wf.name }}</h3>
            <p class="text-xs text-stone-500 font-medium">Configured Steps: <strong>{{ wf.steps?.length || 0 }}</strong></p>
          </div>
          <div class="flex gap-2 pt-2 border-t border-stone-100">
            <button (click)="editWorkflow(wf)" class="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs py-2.5 rounded-xl transition-colors">
              Configure
            </button>
            <button (click)="deleteWorkflow(wf._id)" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2.5 rounded-xl transition-colors">
              <span class="material-icons text-sm">delete</span>
            </button>
          </div>
        </div>

        <div *ngIf="workflows().length === 0" class="col-span-3 text-center py-16 bg-white border border-dashed border-stone-300 rounded-2xl space-y-3">
          <span class="material-icons text-4xl text-stone-400">account_tree</span>
          <p class="text-xs font-bold text-stone-600">No automation workflows found. Click Create Workflow to start.</p>
        </div>
      </div>

      <!-- View: Builder (Dual-Mode: Natural Language vs Manual Flowchart) -->
      <div *ngIf="activeView() === 'builder'" class="space-y-6 animate-fadeIn">
        
        <!-- Mode Switcher Header -->
        <div class="bg-white p-4 rounded-2xl border border-stone-200 flex justify-between items-center shadow-sm">
          <div class="flex gap-3">
            <button 
              (click)="builderMode = 'natural'" 
              [class.bg-amber-600]="builderMode === 'natural'" 
              [class.text-white]="builderMode === 'natural'" 
              class="px-4 py-2 bg-stone-100 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
              <span class="material-icons text-sm">auto_awesome</span>
              Describe Workflow (Natural Language)
            </button>

            <button 
              (click)="builderMode = 'manual'" 
              [class.bg-amber-600]="builderMode === 'manual'" 
              [class.text-white]="builderMode === 'manual'" 
              class="px-4 py-2 bg-stone-100 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
              <span class="material-icons text-sm">account_tree</span>
              Build Manually (Flowchart Builder)
            </button>
          </div>
        </div>

        <!-- MODE 1: NATURAL LANGUAGE WORKFLOW ASSISTANT -->
        <div *ngIf="builderMode === 'natural'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div class="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 block mb-1">AI WORKFLOW BUILDER</span>
              <h3 class="text-base font-extrabold text-stone-900">What do you want this workflow to do?</h3>
              <p class="text-xs text-stone-500 mt-1">Describe your automation goal in plain language. Our capability parser will analyze triggers, delays, and connected actions.</p>
            </div>

            <div>
              <textarea 
                [(ngModel)]="naturalPrompt" 
                rows="5" 
                placeholder="e.g. When a lead becomes Interested, send them an email introducing our services and create a follow-up task after 2 days." 
                class="w-full p-4 border border-stone-300 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none font-sans text-stone-900 bg-stone-50/50"></textarea>
            </div>

            <button 
              (click)="analyzeNaturalWorkflow()" 
              [disabled]="!naturalPrompt || isAnalyzing"
              class="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all">
              <span class="material-icons text-sm">psychology</span>
              {{ isAnalyzing ? 'Analyzing Capability Registry...' : 'Analyze & Parse Workflow' }}
            </button>
          </div>

          <!-- Parsed Output & Integration Status -->
          <div class="lg:col-span-5 space-y-4">
            
            <!-- Real Product Capability Registry Card -->
            <div class="bg-stone-900 text-white p-5 rounded-2xl shadow-sm space-y-3 border border-stone-800">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span class="material-icons text-sm">verified</span>
                Workspace Capability Registry
              </h4>
              
              <div class="space-y-2 text-[11px]">
                <div class="flex justify-between items-center p-2 bg-stone-800/80 rounded-lg">
                  <span>Outbound Email Infrastructure</span>
                  <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded">Connected</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-stone-800/80 rounded-lg">
                  <span>Google Drive Document Sync</span>
                  <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded">Connected</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-stone-800/80 rounded-lg">
                  <span>Marketing Automation Engine</span>
                  <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded">Connected</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-stone-800/80 rounded-lg">
                  <span>WhatsApp API Messaging</span>
                  <span class="px-2 py-0.5 bg-rose-500/20 text-rose-400 font-bold rounded">Not Connected</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-stone-800/80 rounded-lg">
                  <span>SMS Provider Gateway</span>
                  <span class="px-2 py-0.5 bg-rose-500/20 text-rose-400 font-bold rounded">Not Configured</span>
                </div>
              </div>
            </div>

            <!-- Structured Workflow Intent Result Card -->
            <div *ngIf="parsedIntent" class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-stone-900">Parsed Workflow Structure</h4>

              <!-- Trigger Card -->
              <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <span class="text-[9px] font-black uppercase text-indigo-700 tracking-wider">Trigger</span>
                <div class="font-bold text-xs text-indigo-900">{{ parsedIntent?.trigger?.label }}</div>
              </div>

              <!-- Steps List -->
              <div class="space-y-2">
                <div *ngFor="let step of parsedIntent?.steps" class="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                  <span class="text-[9px] font-black uppercase text-stone-500 tracking-wider">{{ step.type }}</span>
                  <div class="font-bold text-xs text-stone-900">{{ step.label || step.config?.actionType }}</div>
                </div>
              </div>

              <!-- Unsupported Channel Warning Box -->
              <div *ngIf="parsedIntent?.unsupportedActions?.length" class="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <h5 class="font-extrabold text-xs text-rose-900 flex items-center gap-1.5">
                  <span class="material-icons text-sm text-rose-600">warning</span>
                  Unsupported Capability Requested
                </h5>
                <div *ngFor="let un of parsedIntent?.unsupportedActions" class="text-xs text-rose-700 space-y-1">
                  <p><strong>{{ un.requested }}:</strong> {{ un.reason }}</p>
                  <p class="text-[10px] text-rose-600"><strong>Alternatives:</strong> {{ un.alternatives.join(', ') }}</p>
                </div>
              </div>

              <!-- Activate Button -->
              <button 
                *ngIf="parsedIntent?.canActivate" 
                (click)="activateParsedWorkflow()" 
                class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md">
                Activate Generated Workflow
              </button>
            </div>

          </div>

        </div>

        <!-- MODE 2: MANUAL FLOWCHART BUILDER -->
        <div *ngIf="builderMode === 'manual'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div class="lg:col-span-8 bg-stone-900 border border-stone-800 p-8 rounded-2xl flex flex-col items-center min-h-[520px] relative overflow-y-auto shadow-inner">
            
            <div class="absolute top-4 left-4">
              <input type="text" [(ngModel)]="workflowName" placeholder="Untitled Workflow" class="bg-transparent border-b border-stone-700 text-lg font-extrabold text-white focus:outline-none focus:border-amber-500 py-1 max-w-xs">
            </div>

            <!-- Trigger Node -->
            <div class="w-64 bg-amber-600 text-white p-4 rounded-2xl shadow-xl flex flex-col items-center text-center mt-12 relative border border-amber-400">
              <span class="material-icons text-2xl mb-1.5">bolt</span>
              <span class="text-[10px] font-black uppercase tracking-wider text-amber-100">Workflow Trigger Event</span>
              <select [(ngModel)]="workflowTrigger" class="bg-stone-900 text-white font-bold text-xs rounded-lg px-2 py-1.5 mt-2 focus:outline-none w-full border border-amber-400 text-center">
                <option value="Lead Created">Lead Created</option>
                <option value="Lead Stage Changed">Lead Stage Changed</option>
                <option value="Lead Converted">Lead Converted</option>
                <option value="Customer Becomes At Risk">Customer Becomes At Risk</option>
                <option value="Ticket Created">Ticket Created</option>
                <option value="Proposal Sent">Proposal Sent</option>
              </select>
            </div>

            <div class="h-8 w-0.5 bg-stone-700 flex justify-center items-center">
              <span class="material-icons text-stone-500 text-sm translate-y-1">arrow_downward</span>
            </div>

            <!-- Steps Loop -->
            <div class="flex flex-col items-center w-full space-y-0" *ngFor="let step of steps(); let idx = index">
              
              <div 
                [class.ring-2]="selectedStepIdx() === idx"
                [class.ring-amber-500]="selectedStepIdx() === idx"
                class="w-64 bg-stone-800 text-stone-100 border border-stone-700 p-4 rounded-2xl shadow-lg relative group flex flex-col items-center text-center">
                
                <button (click)="removeStep(idx)" class="absolute -top-2.5 -right-2.5 h-6 w-6 bg-stone-700 border border-stone-600 text-stone-300 hover:text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <span class="material-icons text-sm">close</span>
                </button>
                
                <div class="flex items-center gap-1.5 mb-2">
                  <span class="material-icons text-sm text-amber-400">bolt</span>
                  <span class="text-[10px] font-extrabold uppercase tracking-widest text-stone-300">{{ step.type }}</span>
                </div>

                <p class="text-xs font-bold text-stone-100 max-w-[200px] truncate" *ngIf="step.type === 'Action'">
                  {{ step.config.actionType || 'Define Action' }}
                </p>
                <p class="text-xs font-bold text-stone-100 max-w-[200px]" *ngIf="step.type === 'Delay'">
                  Wait: {{ step.config.delayDuration || 0 }} {{ step.config.delayUnit || 'days' }}
                </p>

                <button (click)="selectStepForConfig(idx)" class="text-[10px] text-amber-400 hover:text-amber-300 font-bold mt-2 underline">
                  Configure Step
                </button>
              </div>

              <div class="h-8 w-0.5 bg-stone-700 flex justify-center items-center">
                <span class="material-icons text-stone-500 text-sm translate-y-1">arrow_downward</span>
              </div>

            </div>

            <!-- Controls -->
            <div class="flex gap-2 py-4">
              <button (click)="addStep('Action')" class="bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] px-3.5 py-2 rounded-xl transition-colors uppercase flex items-center gap-1">
                <span class="material-icons text-[12px]">add</span> Add Action
              </button>
              <button (click)="addStep('Delay')" class="bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/30 font-bold text-[10px] px-3.5 py-2 rounded-xl transition-colors uppercase flex items-center gap-1">
                <span class="material-icons text-[12px]">add</span> Add Delay
              </button>
            </div>

            <div class="absolute bottom-4 right-4">
              <button (click)="saveWorkflow()" [disabled]="!workflowName" class="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg transition-all">
                Save Workflow
              </button>
            </div>

          </div>

          <!-- Step Config Form -->
          <div class="lg:col-span-4 bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 class="text-md font-extrabold text-stone-900 flex items-center gap-2">
              <span class="material-icons text-amber-600">settings</span> Step Configuration
            </h3>

            <div *ngIf="selectedStepIdx() === null" class="text-center py-16 text-stone-400 text-xs font-medium">
              Select a step in the flowchart to edit configuration.
            </div>

            <div *ngIf="selectedStepIdx() !== null" class="space-y-4 text-xs">
              <div *ngIf="getSelectedStep()?.type === 'Action'">
                <label class="block text-[10px] font-bold text-stone-600 uppercase mb-1">Action Type</label>
                <select [(ngModel)]="getSelectedStep()!.config.actionType" class="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-semibold">
                  <option value="Send Direct Marketing Email">Send Marketing Email</option>
                  <option value="Enroll in Marketing Campaign">Enroll in Marketing Campaign</option>
                  <option value="Create Task">Create Task</option>
                  <option value="Create Ticket">Create Support Ticket</option>
                </select>
              </div>

              <div *ngIf="getSelectedStep()?.type === 'Delay'" class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-bold text-stone-600 uppercase mb-1">Duration</label>
                  <input type="number" [(ngModel)]="getSelectedStep()!.config.delayDuration" class="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-semibold">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-stone-600 uppercase mb-1">Unit</label>
                  <select [(ngModel)]="getSelectedStep()!.config.delayUnit" class="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-semibold">
                    <option value="days">days</option>
                    <option value="hours">hours</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      <!-- View: Execution Logs -->
      <div *ngIf="activeView() === 'logs'" class="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
        <h3 class="text-xs font-extrabold text-stone-900 uppercase tracking-wider mb-4">Workflow Execution History</h3>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-stone-200 text-xs">
            <thead>
              <tr class="text-left text-stone-500 font-bold uppercase tracking-wider">
                <th class="pb-3">Workflow Name</th>
                <th class="pb-3">Trigger Entity</th>
                <th class="pb-3">Status</th>
                <th class="pb-3">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              <tr *ngFor="let log of workflowLogs()" class="hover:bg-stone-50 transition-colors">
                <td class="py-3 font-bold text-stone-900">{{ log.workflow?.name || 'Workflow' }}</td>
                <td class="py-3 font-medium text-stone-600">{{ log.entityType }} [{{ log.entityId }}]</td>
                <td class="py-3">
                  <span class="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase bg-emerald-100 text-emerald-800">
                    {{ log.status }}
                  </span>
                </td>
                <td class="py-3 font-medium text-stone-500">{{ log.createdAt | date:'medium' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class WorkflowsComponent implements OnInit {
  private apiService = inject(ApiService);

  activeView = signal<string>('list');
  builderMode: 'natural' | 'manual' = 'natural';
  workflows = signal<any[]>([]);
  workflowLogs = signal<any[]>([]);

  naturalPrompt = 'When a lead becomes Interested, send them an email and create a follow-up task after 2 days.';
  isAnalyzing = false;
  parsedIntent: any = null;

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
      next: (res: any) => {
        if (res.success) this.workflows.set(res.data);
      }
    });
  }

  loadWorkflowLogs() {
    this.apiService.getWorkflowLogs().subscribe({
      next: (res: any) => {
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
    this.parsedIntent = null;
    this.setView('builder');
  }

  analyzeNaturalWorkflow() {
    if (!this.naturalPrompt) return;
    this.isAnalyzing = true;
    this.apiService.post('/workflows/parse-intent', { prompt: this.naturalPrompt }).subscribe({
      next: (res: any) => {
        this.isAnalyzing = false;
        if (res.success) {
          this.parsedIntent = res.data;
          this.workflowName = res.data.suggestedName || 'Natural Language Workflow';
          this.workflowTrigger = res.data.trigger?.key || 'Lead Stage Changed';
          this.steps.set(res.data.steps || []);
        }
      },
      error: () => {
        this.isAnalyzing = false;
      }
    });
  }

  activateParsedWorkflow() {
    if (!this.parsedIntent) return;
    this.saveWorkflow();
  }

  addStep(type: 'Condition' | 'Action' | 'Delay') {
    const newStep: WorkflowStep = {
      type,
      config: type === 'Delay' ? { delayDuration: 2, delayUnit: 'days' } : { actionType: 'Send Direct Marketing Email' }
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
    this.builderMode = 'manual';
    this.setView('builder');
  }

  saveWorkflow() {
    const payload = {
      name: this.workflowName || 'Automated Workflow',
      trigger: this.workflowTrigger,
      steps: this.steps()
    };

    const request = this.workflowId 
      ? this.apiService.updateWorkflow(this.workflowId, payload)
      : this.apiService.createWorkflow(payload);

    request.subscribe({
      next: () => {
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
