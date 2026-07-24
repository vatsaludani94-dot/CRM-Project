import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

export interface PipelineStageModel {
  _id: string;
  name: string;
  key: string;
  order: number;
  color: string;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  isSystemStage: boolean;
  exitRules?: string[];
}

export interface LeadModel {
  _id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  leadSource: string;
  expectedRevenue: number;
  stage: string;
  stageKey?: string;
  lostReason?: string;
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

export interface TimelineEventModel {
  type: string;
  title: string;
  description: string;
  date: Date;
  icon: string;
  badgeColor: string;
  source: string;
}

export interface ScoreFactorModel {
  factor: string;
  impact: number;
  explanation: string;
}

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header & Actions -->
      <div class="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-[#1c1917] tracking-tight">Sales Pipeline Engine</h1>
          <p class="text-xs text-stone-500 mt-1 font-medium">Dynamic multi-stage sales pipeline with explainable AI lead scoring, timeline engagement stream, and controlled stage transitions.</p>
        </div>
        
        <div class="flex items-center gap-2">
          <button 
            *ngIf="canConfigureStages()" 
            (click)="openConfigModal()" 
            class="py-2 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
            <span class="material-icons text-sm">settings</span>
            <span>Configure Stages</span>
          </button>
          
          <button 
            (click)="openAddModal()" 
            class="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
            <span class="material-icons text-sm">add</span>
            <span>New Lead</span>
          </button>
        </div>
      </div>

      <!-- ERROR / ALERT BANNER -->
      <div *ngIf="errorMessage()" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex justify-between items-center animate-fadeIn">
        <span>{{ errorMessage() }}</span>
        <button (click)="errorMessage.set('')" class="text-rose-500 hover:text-rose-800"><span class="material-icons text-sm">close</span></button>
      </div>

      <!-- DYNAMIC KANBAN BOARD WRAPPER -->
      <div class="flex gap-4 overflow-x-auto pb-6 select-none custom-scrollbar" cdkDropListGroup>
        
        <!-- Column Stages (Loaded Dynamically) -->
        <div 
          *ngFor="let col of boardColumns()" 
          class="flex-1 min-w-[280px] max-w-[320px] bg-stone-100/60 border border-stone-200 p-3 rounded-2xl flex flex-col h-[72vh]">
          
          <!-- Column Header -->
          <div class="flex justify-between items-center mb-2 px-1">
            <div class="flex items-center gap-2 truncate">
              <span class="h-3 w-3 rounded-full shrink-0" [style.backgroundColor]="col.color"></span>
              <span class="font-extrabold text-xs uppercase tracking-wider text-[#1c1917] truncate">
                {{ col.name }}
              </span>
              <span class="bg-white border border-stone-200 px-1.5 py-0.5 rounded-md text-[10px] text-stone-700 font-bold shrink-0">
                {{ getLeadsByStage(col).length }}
              </span>
            </div>
            
            <div class="text-right shrink-0">
              <span class="text-[10px] font-black text-[#1c1917] block">
                \${{ getExpectedRevenueSum(col).toLocaleString() }}
              </span>
              <span class="text-[9px] font-bold text-amber-700 block">
                Prob: {{ col.probability }}%
              </span>
            </div>
          </div>

          <!-- Stage Weighted Total Badge -->
          <div class="mb-3 px-1 flex justify-between items-center text-[9px] text-stone-500 border-b border-stone-200 pb-2">
            <span>Weighted Forecast:</span>
            <span class="font-bold text-stone-700">\${{ getWeightedRevenueSum(col).toLocaleString() }}</span>
          </div>

          <!-- Drag Drop Container -->
          <div 
            [id]="col.key"
            cdkDropList
            [cdkDropListData]="getLeadsByStage(col)"
            (cdkDropListDropped)="onCardDropped($event, col)"
            class="flex-1 space-y-3 overflow-y-auto min-h-[150px] custom-scrollbar">
            
            <!-- Lead Card -->
            <div 
              *ngFor="let lead of getLeadsByStage(col)"
              cdkDrag
              (click)="openDrawer(lead)"
              class="bg-white border border-stone-200 p-3.5 rounded-xl shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-amber-500/50 transition-all space-y-2.5">
              
              <div class="flex justify-between items-start gap-2">
                <h4 class="font-extrabold text-xs text-[#1c1917] truncate flex-1">{{ lead.company }}</h4>
                <!-- AI Score Badge -->
                <span [ngClass]="{
                  'bg-emerald-50 text-emerald-700 border border-emerald-200': lead.aiScore >= 75,
                  'bg-amber-50 text-amber-800 border border-amber-200': lead.aiScore >= 40 && lead.aiScore < 75,
                  'bg-rose-50 text-rose-700 border border-rose-200': lead.aiScore < 40
                }" class="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide shrink-0">
                  {{ lead.aiScore }}% AI
                </span>
              </div>

              <!-- Contact & Deal size -->
              <div class="text-[11px] text-stone-600">
                <div class="font-semibold text-stone-800">{{ lead.contactName }}</div>
                <div class="mt-1 flex items-center justify-between">
                  <span class="font-black text-[#1c1917]">\${{ lead.expectedRevenue.toLocaleString() }}</span>
                  <span class="text-[9px] font-bold uppercase text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">{{ lead.leadSource }}</span>
                </div>
                <div *ngIf="lead.lostReason" class="mt-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  Reason: {{ lead.lostReason }}
                </div>
              </div>

              <!-- DIRECT WORKFLOW ACTION BUTTONS -->
              <div class="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px]">
                <span class="text-stone-500 font-medium truncate max-w-[110px]">
                  Rep: <b class="text-stone-800">{{ lead.assignedEmployee ? lead.assignedEmployee.name : 'Unassigned' }}</b>
                </span>
                
                <div class="flex items-center gap-1" (click)="$event.stopPropagation()">
                  <button (click)="navigateToWorkflow('/communications/inbox')" title="Send Email" class="p-1 hover:bg-stone-100 text-stone-600 rounded">
                    <span class="material-icons text-xs">mail</span>
                  </button>
                  <button (click)="navigateToWorkflow('/operations/calendar')" title="Schedule Meeting" class="p-1 hover:bg-stone-100 text-stone-600 rounded">
                    <span class="material-icons text-xs">calendar_month</span>
                  </button>
                  <button (click)="navigateToWorkflow('/sales/proposals')" title="Create Proposal" class="p-1 hover:bg-stone-100 text-stone-600 rounded">
                    <span class="material-icons text-xs">receipt_long</span>
                  </button>
                  <button (click)="navigateToWorkflow('/operations/tasks')" title="Add Task" class="p-1 hover:bg-stone-100 text-stone-600 rounded">
                    <span class="material-icons text-xs">task_alt</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      <!-- LOST REASON MODAL OVERLAY -->
      <div *ngIf="isLostModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-5 animate-fadeIn">
          <div class="flex justify-between items-center border-b border-stone-200 pb-3">
            <h3 class="text-sm font-extrabold text-[#1c1917] flex items-center gap-1.5 text-rose-700">
              <span class="material-icons text-base">report_problem</span>
              <span>Require Lost Reason</span>
            </h3>
            <button (click)="cancelLostTransition()" class="text-stone-400 hover:text-stone-600"><span class="material-icons">close</span></button>
          </div>
          <p class="text-xs text-stone-600 leading-relaxed font-medium">
            Please specify why lead <b class="text-[#1c1917]">{{ pendingTransitionLead()?.company }}</b> is being marked as Lost:
          </p>

          <div class="space-y-2">
            <label *ngFor="let reason of lostReasons" class="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer text-xs font-semibold text-stone-800">
              <input type="radio" name="lostReason" [value]="reason" [(ngModel)]="selectedLostReason" class="text-amber-600 focus:ring-amber-500">
              <span>{{ reason }}</span>
            </label>
          </div>

          <div class="flex gap-3 pt-3 border-t border-stone-200">
            <button (click)="cancelLostTransition()" class="flex-1 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-700">Cancel</button>
            <button (click)="confirmLostTransition()" [disabled]="!selectedLostReason" class="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl text-xs text-white font-bold">Confirm Lost Stage</button>
          </div>
        </div>
      </div>

      <!-- CREATE LEAD MODAL OVERLAY -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-5 animate-fadeIn">
          <div class="flex justify-between items-center border-b border-stone-200 pb-3">
            <h3 class="text-sm font-bold text-[#1c1917]">Create New Lead Profile</h3>
            <button (click)="closeModal()" class="text-stone-400 hover:text-stone-600"><span class="material-icons">close</span></button>
          </div>
          <form class="space-y-3 text-xs text-stone-700">
            <div>
              <label class="block font-bold uppercase tracking-wider text-[10px] text-stone-500">Company Name</label>
              <input type="text" [(ngModel)]="formModel.company" name="company" class="modal-input">
            </div>
            <div>
              <label class="block font-bold uppercase tracking-wider text-[10px] text-stone-500">Contact Person Name</label>
              <input type="text" [(ngModel)]="formModel.contactName" name="contactName" class="modal-input">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold uppercase tracking-wider text-[10px] text-stone-500">Email</label>
                <input type="email" [(ngModel)]="formModel.email" name="email" class="modal-input">
              </div>
              <div>
                <label class="block font-bold uppercase tracking-wider text-[10px] text-stone-500">Phone</label>
                <input type="text" [(ngModel)]="formModel.phone" name="phone" class="modal-input">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold uppercase tracking-wider text-[10px] text-stone-500">Expected Value ($)</label>
                <input type="number" [(ngModel)]="formModel.expectedRevenue" name="expectedRevenue" class="modal-input">
              </div>
              <div>
                <label class="block font-bold uppercase tracking-wider text-[10px] text-stone-500">Lead Source</label>
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
          <div class="flex gap-3 pt-3 border-t border-stone-200">
            <button (click)="closeModal()" class="flex-1 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-700">Cancel</button>
            <button (click)="submitForm()" class="flex-1 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-white text-xs font-bold">Create Lead</button>
          </div>
        </div>
      </div>

      <!-- STAGE CONFIGURATION MODAL OVERLAY -->
      <div *ngIf="isConfigModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-5 animate-fadeIn max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div class="flex justify-between items-center border-b border-stone-200 pb-3">
            <h3 class="text-sm font-bold text-[#1c1917] flex items-center gap-2">
              <span class="material-icons text-amber-600 text-base">settings</span>
              <span>Workspace Pipeline Stage Configuration</span>
            </h3>
            <button (click)="closeConfigModal()" class="text-stone-400 hover:text-stone-600"><span class="material-icons">close</span></button>
          </div>

          <!-- Add New Stage Form -->
          <div class="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h5 class="text-xs font-bold text-stone-800">Add New Pipeline Stage</h5>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <input type="text" [(ngModel)]="newStageModel.name" placeholder="Stage Name" class="modal-input col-span-2">
              <input type="number" [(ngModel)]="newStageModel.probability" placeholder="Prob %" class="modal-input">
            </div>
            <button (click)="addStage()" class="w-full py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-black">Add Stage</button>
          </div>

          <!-- Existing Stages List -->
          <div class="space-y-2">
            <h5 class="text-xs font-bold text-stone-800">Existing Workspace Stages</h5>
            <div *ngFor="let s of boardColumns()" class="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="h-3 w-3 rounded-full shrink-0" [style.backgroundColor]="s.color"></span>
                <span class="font-bold text-[#1c1917] truncate">{{ s.name }}</span>
                <span class="text-[10px] text-stone-500 font-medium">({{ s.probability }}%)</span>
              </div>
              <button *ngIf="!s.isSystemStage" (click)="deleteStage(s._id)" class="text-rose-600 hover:text-rose-800 p-1">
                <span class="material-icons text-sm">delete</span>
              </button>
            </div>
          </div>

          <div class="pt-3 border-t border-stone-200 text-right">
            <button (click)="closeConfigModal()" class="py-2 px-5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700">Done</button>
          </div>
        </div>
      </div>

      <!-- LEAD OPERATING SYSTEM SLIDEOVER DRAWER -->
      <div *ngIf="activeLead() as lead" class="fixed inset-y-0 right-0 z-40 w-[420px] bg-white shadow-2xl border-l border-stone-200 flex flex-col justify-between overflow-hidden animate-slideLeft">
        
        <!-- Drawer Header -->
        <div class="p-5 border-b border-stone-200 bg-stone-50/50 space-y-3">
          <div class="flex justify-between items-start gap-3">
            <div>
              <span class="text-[10px] text-amber-700 font-extrabold uppercase tracking-widest">Lead Operating System</span>
              <h3 class="text-base font-extrabold text-[#1c1917] mt-0.5 truncate">{{ lead.company }}</h3>
              <p class="text-xs text-stone-500 font-medium">{{ lead.contactName }} &bull; {{ lead.email }}</p>
            </div>
            <button (click)="closeDrawer()" class="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-200/60"><span class="material-icons">close</span></button>
          </div>

          <!-- Drawer Navigation Tabs -->
          <div class="flex border-b border-stone-200 text-xs font-bold gap-4 pt-1">
            <button (click)="activeTab.set('overview')" [class.border-amber-600]="activeTab() === 'overview'" [class.text-amber-700]="activeTab() === 'overview'" class="pb-2 border-b-2 border-transparent text-stone-500 hover:text-stone-800 transition-all">Score & Overview</button>
            <button (click)="activeTab.set('timeline')" [class.border-amber-600]="activeTab() === 'timeline'" [class.text-amber-700]="activeTab() === 'timeline'" class="pb-2 border-b-2 border-transparent text-stone-500 hover:text-stone-800 transition-all flex items-center gap-1">
              <span>Timeline Stream</span>
              <span *ngIf="timelineEvents().length > 0" class="px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded-full text-[9px]">{{ timelineEvents().length }}</span>
            </button>
            <button (click)="activeTab.set('notes')" [class.border-amber-600]="activeTab() === 'notes'" [class.text-amber-700]="activeTab() === 'notes'" class="pb-2 border-b-2 border-transparent text-stone-500 hover:text-stone-800 transition-all">Notes & Actions</button>
          </div>
        </div>

        <!-- Drawer Content Body -->
        <div class="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-5">
          
          <!-- TAB 1: OVERVIEW & EXPLAINABLE AI SCORE -->
          <div *ngIf="activeTab() === 'overview'" class="space-y-4">
            
            <!-- AI Conversion Score Box -->
            <div class="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="material-icons text-amber-600">psychology</span>
                  <span class="text-xs font-extrabold text-amber-900">Explainable AI Conversion Score</span>
                </div>
                <button (click)="refreshAiScore()" [disabled]="isRefreshingScore()" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer">
                  <span class="material-icons text-xs" [class.animate-spin]="isRefreshingScore()">refresh</span>
                  <span>Recalculate</span>
                </button>
              </div>

              <div class="flex items-center gap-4 pt-1">
                <div class="h-16 w-16 rounded-2xl bg-white border border-amber-200 shadow-sm flex flex-col items-center justify-center shrink-0">
                  <span class="text-xl font-black text-amber-800">{{ scoreData()?.currentScore ?? lead.aiScore }}%</span>
                  <span class="text-[8px] font-bold uppercase text-stone-400">Probability</span>
                </div>
                <div class="text-xs text-stone-700 space-y-1">
                  <p class="font-bold text-[#1c1917]">Scoring Model: <span class="uppercase text-amber-700 font-extrabold">{{ scoreData()?.model ?? 'heuristic' }}</span></p>
                  <p class="text-[11px] text-stone-500">Recalculated based on stage position, lead source quality, and team activity velocity.</p>
                </div>
              </div>

              <!-- Transparent Scoring Factors -->
              <div *ngIf="scoreData()?.factors as factors" class="pt-2 border-t border-amber-200/60 space-y-2">
                <h5 class="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">Transparent Scoring Factors</h5>
                <div *ngFor="let factor of factors" class="p-2 bg-white/80 rounded-xl border border-amber-100 text-xs flex justify-between items-start gap-2">
                  <div class="space-y-0.5 min-w-0 flex-1">
                    <span class="font-bold text-stone-800 block text-[11px]">{{ factor.factor }}</span>
                    <span class="text-[10px] text-stone-500 block leading-tight">{{ factor.explanation }}</span>
                  </div>
                  <span [ngClass]="{
                    'bg-emerald-100 text-emerald-800': factor.impact > 0,
                    'bg-rose-100 text-rose-800': factor.impact < 0,
                    'bg-stone-100 text-stone-700': factor.impact === 0
                  }" class="px-1.5 py-0.5 rounded text-[10px] font-black shrink-0">
                    {{ factor.impact >= 0 ? '+' : '' }}{{ factor.impact }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Profile Overview Metadata -->
            <div class="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 text-xs">
              <h4 class="font-extrabold text-[#1c1917] uppercase tracking-wider text-[10px] text-stone-500">Lead Metadata File</h4>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="text-stone-400 block text-[10px] font-bold">Current Stage</span>
                  <span class="font-bold text-stone-800">{{ lead.stage }}</span>
                </div>
                <div>
                  <span class="text-stone-400 block text-[10px] font-bold">Expected Revenue</span>
                  <span class="font-bold text-stone-800">\${{ lead.expectedRevenue.toLocaleString() }}</span>
                </div>
                <div>
                  <span class="text-stone-400 block text-[10px] font-bold">Lead Source</span>
                  <span class="font-bold text-stone-800">{{ lead.leadSource }}</span>
                </div>
                <div>
                  <span class="text-stone-400 block text-[10px] font-bold">Assigned Representative</span>
                  <span class="font-bold text-stone-800">{{ lead.assignedEmployee ? lead.assignedEmployee.name : 'Unassigned' }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- TAB 2: CHRONOLOGICAL ENGAGEMENT TIMELINE STREAM -->
          <div *ngIf="activeTab() === 'timeline'" class="space-y-4">
            <h4 class="font-extrabold text-xs text-[#1c1917] uppercase tracking-wider">Chronological Engagement Timeline</h4>
            
            <div *ngIf="isLoadingTimeline()" class="text-center py-8 text-stone-400 text-xs font-bold">
              Loading engagement timeline stream...
            </div>

            <div *ngIf="!isLoadingTimeline() && timelineEvents().length === 0" class="text-center py-8 text-stone-400 text-xs font-bold">
              No engagement events recorded yet.
            </div>

            <div *ngIf="!isLoadingTimeline() && timelineEvents().length > 0" class="relative pl-6 space-y-4 border-l-2 border-stone-200 ml-2">
              <div *ngFor="let ev of timelineEvents()" class="relative group">
                <!-- Timeline Event Bullet Dot -->
                <div class="absolute -left-[31px] top-0.5 h-6 w-6 rounded-full bg-white border-2 flex items-center justify-center shadow-xs" [style.borderColor]="ev.badgeColor">
                  <span class="material-icons text-[12px]" [style.color]="ev.badgeColor">{{ ev.icon }}</span>
                </div>

                <!-- Event Details Card -->
                <div class="bg-stone-50 border border-stone-200 p-3 rounded-xl space-y-1 text-xs">
                  <div class="flex justify-between items-center">
                    <span class="font-bold text-stone-800 text-[11px]">{{ ev.title }}</span>
                    <span class="text-[9px] font-bold text-stone-400">{{ ev.date | date:'short' }}</span>
                  </div>
                  <p class="text-stone-600 leading-normal text-[11px]">{{ ev.description }}</p>
                  <div class="flex justify-between items-center pt-1 text-[9px] text-stone-400 font-semibold border-t border-stone-200/60 mt-1">
                    <span>Source: <b>{{ ev.source }}</b></span>
                    <span class="uppercase tracking-wider px-1 bg-stone-200/60 rounded text-stone-600">{{ ev.type }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: NOTES & QUICK ACTIONS -->
          <div *ngIf="activeTab() === 'notes'" class="space-y-4">
            
            <!-- Quick Workflow Actions -->
            <div class="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <h4 class="font-extrabold text-[10px] text-stone-500 uppercase tracking-wider">Quick Sales Workflow Actions</h4>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <button (click)="navigateToWorkflow('/communications/inbox')" class="p-2 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg font-bold text-stone-700 flex items-center gap-1.5">
                  <span class="material-icons text-amber-600 text-sm">mail</span>
                  <span>Send Email</span>
                </button>
                <button (click)="navigateToWorkflow('/operations/calendar')" class="p-2 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg font-bold text-stone-700 flex items-center gap-1.5">
                  <span class="material-icons text-amber-600 text-sm">calendar_month</span>
                  <span>Schedule Meeting</span>
                </button>
                <button (click)="navigateToWorkflow('/sales/proposals')" class="p-2 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg font-bold text-stone-700 flex items-center gap-1.5">
                  <span class="material-icons text-amber-600 text-sm">receipt_long</span>
                  <span>Create Proposal</span>
                </button>
                <button (click)="navigateToWorkflow('/operations/tasks')" class="p-2 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg font-bold text-stone-700 flex items-center gap-1.5">
                  <span class="material-icons text-amber-600 text-sm">task_alt</span>
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            <!-- Notes List -->
            <div class="space-y-2">
              <h4 class="font-extrabold text-xs text-[#1c1917] uppercase tracking-wider">Staff Notes ({{ lead.notes.length }})</h4>
              <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                <div *ngFor="let n of lead.notes" class="p-3 bg-stone-50 rounded-xl text-xs space-y-1">
                  <p class="text-stone-800 leading-normal">{{ n.content }}</p>
                  <span class="text-[9px] text-stone-400 block font-semibold">- Staff Note</span>
                </div>
              </div>
              <div class="flex gap-2 mt-2">
                <input type="text" [(ngModel)]="newLeadNote" placeholder="Write staff note..." class="flex-1 p-2 border border-stone-200 bg-stone-50 rounded-lg text-xs">
                <button (click)="addLeadNote()" [disabled]="!newLeadNote.trim()" class="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 rounded-lg text-white text-xs font-bold cursor-pointer">Add Note</button>
              </div>
            </div>

          </div>

        </div>

        <!-- Drawer Footer -->
        <div class="p-4 border-t border-stone-200 bg-stone-50/50">
          <button (click)="deleteLead(lead._id)" class="w-full py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5 cursor-pointer">
            <span class="material-icons text-sm">delete</span>
            <span>Delete Lead Profile</span>
          </button>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .modal-input {
      width: 100%;
      padding: 8px 12px;
      margin-top: 4px;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      font-size: 12px;
      background-color: #fafaf9;
    }
    .cdk-drag-preview {
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
      border-radius: 12px;
      background: white;
    }
    .cdk-drag-placeholder {
      opacity: 0.2;
    }
    .animate-fadeIn {
      animation: fadeIn 0.25s ease-out forwards;
    }
    .animate-slideLeft {
      animation: slideLeft 0.25s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes slideLeft {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `]
})
export class LeadsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  leads = signal<LeadModel[]>([]);
  boardColumns = signal<PipelineStageModel[]>([]);
  activeLead = signal<LeadModel | null>(null);
  errorMessage = signal<string>('');

  activeTab = signal<'overview' | 'timeline' | 'notes'>('overview');
  timelineEvents = signal<TimelineEventModel[]>([]);
  isLoadingTimeline = signal(false);

  scoreData = signal<{ currentScore: number; probability: number; factors: ScoreFactorModel[]; model: string } | null>(null);
  isRefreshingScore = signal(false);

  newLeadNote = '';
  isModalOpen = signal(false);
  isConfigModalOpen = signal(false);

  // Lost Stage Transition Handling
  isLostModalOpen = signal(false);
  pendingTransitionLead = signal<LeadModel | null>(null);
  pendingTargetStage = signal<PipelineStageModel | null>(null);
  selectedLostReason = '';
  lostReasons = ['Price', 'Competitor', 'No Response', 'Feature Gap', 'Not Interested', 'Other'];

  formModel = {
    company: '',
    contactName: '',
    email: '',
    phone: '',
    expectedRevenue: 0,
    leadSource: 'Website'
  };

  newStageModel = {
    name: '',
    probability: 50
  };

  ngOnInit() {
    this.loadPipelineData();
  }

  loadPipelineData() {
    // 1. Fetch Dynamic Pipeline Stages
    this.apiService.getPipelineStages().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.boardColumns.set(res.data);
        }
      },
      error: (err) => {
        console.error('Failed to load pipeline stages:', err);
      }
    });

    // 2. Fetch Leads
    this.loadLeads();
  }

  loadLeads() {
    this.apiService.getLeads().subscribe({
      next: (res) => {
        if (res.success) {
          this.leads.set(res.data);
          if (this.activeLead()) {
            const updated = res.data.find((l: LeadModel) => l._id === this.activeLead()?._id);
            if (updated) this.activeLead.set(updated);
          }
        }
      }
    });
  }

  getLeadsByStage(stageCol: PipelineStageModel): LeadModel[] {
    return this.leads().filter(l => {
      if (l.stageKey && stageCol.key) {
        return l.stageKey.toUpperCase() === stageCol.key.toUpperCase();
      }
      return l.stage === stageCol.name;
    });
  }

  getExpectedRevenueSum(stageCol: PipelineStageModel): number {
    return this.getLeadsByStage(stageCol).reduce((sum, item) => sum + (item.expectedRevenue || 0), 0);
  }

  getWeightedRevenueSum(stageCol: PipelineStageModel): number {
    const total = this.getExpectedRevenueSum(stageCol);
    return Math.round(total * (stageCol.probability / 100));
  }

  onCardDropped(event: CdkDragDrop<LeadModel[]>, targetStageCol: PipelineStageModel) {
    if (event.previousContainer.id === event.container.id) {
      return;
    }

    const draggedLead = event.previousContainer.data[event.previousIndex];

    if (targetStageCol.isLost || (targetStageCol.exitRules && targetStageCol.exitRules.includes('require_lost_reason'))) {
      this.pendingTransitionLead.set(draggedLead);
      this.pendingTargetStage.set(targetStageCol);
      this.selectedLostReason = '';
      this.isLostModalOpen.set(true);
      return;
    }

    this.executeStageTransition(draggedLead, targetStageCol);
  }

  executeStageTransition(lead: LeadModel, stage: PipelineStageModel, lostReason?: string) {
    const originalLeads = [...this.leads()];

    // Optimistically update frontend state
    this.leads.update(current => current.map(item => item._id === lead._id ? { ...item, stage: stage.name, stageKey: stage.key } : item));

    this.apiService.transitionLead(lead._id, {
      targetStageKey: stage.key,
      targetStageName: stage.name,
      lostReason
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadLeads();
          if (this.activeLead() && this.activeLead()?._id === lead._id) {
            this.loadLeadDetails(lead._id);
          }
        } else {
          this.rollbackLeads(originalLeads, res.error || 'Stage transition failed');
        }
      },
      error: (err) => {
        this.rollbackLeads(originalLeads, err.message || 'Failed to update lead stage');
      }
    });
  }

  confirmLostTransition() {
    if (!this.selectedLostReason || !this.pendingTransitionLead() || !this.pendingTargetStage()) return;
    
    const lead = this.pendingTransitionLead()!;
    const stage = this.pendingTargetStage()!;
    const reason = this.selectedLostReason;

    this.isLostModalOpen.set(false);
    this.pendingTransitionLead.set(null);
    this.pendingTargetStage.set(null);

    this.executeStageTransition(lead, stage, reason);
  }

  cancelLostTransition() {
    this.isLostModalOpen.set(false);
    this.pendingTransitionLead.set(null);
    this.pendingTargetStage.set(null);
    this.selectedLostReason = '';
  }

  rollbackLeads(original: LeadModel[], errorMsg: string) {
    this.leads.set(original);
    this.errorMessage.set(errorMsg);
  }

  canConfigureStages(): boolean {
    return this.authService.hasRole(['super_admin', 'workspace_owner', 'manager']);
  }

  openConfigModal() {
    this.isConfigModalOpen.set(true);
  }

  closeConfigModal() {
    this.isConfigModalOpen.set(false);
  }

  addStage() {
    if (!this.newStageModel.name.trim()) return;
    this.apiService.createPipelineStage(this.newStageModel).subscribe({
      next: () => {
        this.newStageModel = { name: '', probability: 50 };
        this.loadPipelineData();
      },
      error: (err) => this.errorMessage.set(err.message || 'Failed to add stage')
    });
  }

  deleteStage(id: string) {
    if (confirm('Delete this custom stage?')) {
      this.apiService.deletePipelineStage(id).subscribe({
        next: () => this.loadPipelineData(),
        error: (err) => this.errorMessage.set(err.message || 'Cannot delete stage')
      });
    }
  }

  navigateToWorkflow(route: string) {
    this.router.navigateByUrl(route);
  }

  openAddModal() {
    this.formModel = { company: '', contactName: '', email: '', phone: '', expectedRevenue: 0, leadSource: 'Website' };
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
    this.activeTab.set('overview');
    this.loadLeadDetails(lead._id);
  }

  closeDrawer() {
    this.activeLead.set(null);
    this.scoreData.set(null);
    this.timelineEvents.set([]);
  }

  loadLeadDetails(leadId: string) {
    // Load Score
    this.apiService.getLeadScore(leadId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.scoreData.set(res.data);
        }
      }
    });

    // Load Timeline
    this.isLoadingTimeline.set(true);
    this.apiService.getLeadTimeline(leadId).subscribe({
      next: (res) => {
        this.isLoadingTimeline.set(false);
        if (res.success && res.data) {
          this.timelineEvents.set(res.data);
        }
      },
      error: () => this.isLoadingTimeline.set(false)
    });
  }

  refreshAiScore() {
    if (!this.activeLead()) return;
    this.isRefreshingScore.set(true);

    this.apiService.refreshLeadScore(this.activeLead()!._id).subscribe({
      next: (res) => {
        this.isRefreshingScore.set(false);
        if (res.success && res.data) {
          this.scoreData.set(res.data);
          this.loadLeads();
          this.loadLeadDetails(this.activeLead()!._id);
        }
      },
      error: () => this.isRefreshingScore.set(false)
    });
  }

  addLeadNote() {
    if (!this.newLeadNote.trim() || !this.activeLead()) return;
    const leadId = this.activeLead()?._id || '';

    this.apiService.addLeadNote(leadId, this.newLeadNote).subscribe({
      next: () => {
        this.newLeadNote = '';
        this.loadLeads();
        this.loadLeadDetails(leadId);
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
