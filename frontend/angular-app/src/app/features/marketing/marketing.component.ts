import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { WorkspaceContextService } from '../../core/services/workspace-context.service';

export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  type: string;
  status: 'Draft' | 'Scheduled' | 'Processing' | 'Completed' | 'Paused' | 'Cancelled' | 'Failed';
  audienceDefinition: {
    targetType: 'Leads' | 'Customers' | 'Both';
    leadFilters?: {
      stages?: string[];
      minAiScore?: number;
      maxAiScore?: number;
      leadSources?: string[];
      minExpectedRevenue?: number;
    };
    customerFilters?: {
      statuses?: string[];
      healthStatuses?: string[];
      minHealthScore?: number;
      minRevenue?: number;
    };
  };
  emailContent: {
    subject: string;
    body: string;
    attachments?: Array<{ name: string; url: string; type: string }>;
  };
  schedule: {
    sendType: 'Now' | 'Scheduled';
    scheduledAt?: string;
    timezone?: string;
    sentAt?: string;
    completedAt?: string;
  };
  metrics?: {
    totalMatched?: number;
    eligibleRecipients?: number;
    sentCount?: number;
    deliveredCount?: number;
    failedCount?: number;
    unsubscribedCount?: number;
    duplicateCount?: number;
  };
  executionState?: {
    status: string;
  };
  createdAt?: string;
}

export interface AudiencePreviewResult {
  totalMatched: number;
  eligibleRecipients: number;
  unsubscribedExcluded: number;
  duplicateExcluded: number;
  invalidEmailExcluded: number;
  sampleRecipients: Array<{
    id: string;
    contactName: string;
    companyName: string;
    email: string;
    recipientType: string;
    personalizedSubjectPreview: string;
    personalizedBodyPreview: string;
  }>;
}

@Component({
  selector: 'app-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold">
              <span class="material-icons">campaign</span>
            </div>
            <div>
              <h1 class="text-2xl font-black text-stone-900 tracking-tight">Marketing Automation & Campaigns</h1>
              <p class="text-xs text-stone-500">Multi-tenant audience segmentation, email campaigns & CRM intelligence integration</p>
            </div>
          </div>
        </div>

        <button 
          (click)="openCreateModal()" 
          class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 text-xs flex items-center gap-2 transition-all">
          <span class="material-icons text-sm">add</span>
          Create New Campaign
        </button>
      </div>

      <!-- Overview Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div class="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <span class="material-icons">campaign</span>
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-stone-400">Total Campaigns</span>
            <h3 class="text-2xl font-black text-stone-900">{{ campaigns().length }}</h3>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div class="h-12 w-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <span class="material-icons">send</span>
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-stone-400">Total Sent Emails</span>
            <h3 class="text-2xl font-black text-stone-900">{{ analytics()?.totalRecipients || 0 }}</h3>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div class="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <span class="material-icons">task_alt</span>
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-stone-400">Completed Campaigns</span>
            <h3 class="text-2xl font-black text-stone-900">{{ analytics()?.completedCampaigns || 0 }}</h3>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div class="h-12 w-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <span class="material-icons">unsubscribe</span>
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-stone-400">Unsubscribe Excluded</span>
            <h3 class="text-2xl font-black text-stone-900">{{ analytics()?.totalUnsubscribedExcluded || 0 }}</h3>
          </div>
        </div>
      </div>

      <!-- Campaigns Table Card -->
      <div class="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <h3 class="font-black text-stone-900 text-sm tracking-tight flex items-center gap-2">
            <span class="material-icons text-amber-600 text-base">list</span>
            All Marketing Campaigns
          </h3>
          <span class="text-xs font-medium text-stone-500">{{ campaigns().length }} Records</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-stone-100/70 text-[10px] uppercase font-black tracking-wider text-stone-500 border-b border-stone-200">
                <th class="p-4">Campaign Name</th>
                <th class="p-4">Type</th>
                <th class="p-4">Status</th>
                <th class="p-4">Target Audience</th>
                <th class="p-4">Eligible / Sent</th>
                <th class="p-4">Schedule</th>
                <th class="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100 text-xs text-stone-700 font-medium">
              <tr *ngFor="let camp of campaigns()" class="hover:bg-amber-50/30 transition-colors">
                <td class="p-4">
                  <div class="font-extrabold text-stone-900">{{ camp.name }}</div>
                  <div class="text-[10px] text-stone-400 truncate max-w-xs">{{ camp.description || 'No description' }}</div>
                </td>
                <td class="p-4">
                  <span class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                    {{ camp.type }}
                  </span>
                </td>
                <td class="p-4">
                  <span 
                    [class.bg-emerald-100]="camp.status === 'Completed'" [class.text-emerald-800]="camp.status === 'Completed'"
                    [class.bg-amber-100]="camp.status === 'Draft'" [class.text-amber-800]="camp.status === 'Draft'"
                    [class.bg-blue-100]="camp.status === 'Processing' || camp.status === 'Scheduled'" [class.text-blue-800]="camp.status === 'Processing' || camp.status === 'Scheduled'"
                    [class.bg-rose-100]="camp.status === 'Failed' || camp.status === 'Cancelled'" [class.text-rose-800]="camp.status === 'Failed' || camp.status === 'Cancelled'"
                    class="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase">
                    {{ camp.status }}
                  </span>
                </td>
                <td class="p-4">
                  <span class="font-bold text-stone-800">{{ camp.audienceDefinition?.targetType || 'Leads' }}</span>
                </td>
                <td class="p-4">
                  <div class="font-bold text-stone-900">
                    {{ camp.metrics?.sentCount || 0 }} / {{ camp.metrics?.eligibleRecipients || 0 }}
                  </div>
                  <span *ngIf="camp.metrics?.failedCount" class="text-[10px] text-rose-600 font-semibold">
                    {{ camp.metrics?.failedCount }} Failed
                  </span>
                </td>
                <td class="p-4 text-stone-500 text-[11px]">
                  <span *ngIf="camp.schedule?.sendType === 'Scheduled' && camp.schedule?.scheduledAt">
                    {{ camp.schedule.scheduledAt | date:'medium' }}
                  </span>
                  <span *ngIf="camp.schedule?.sendType === 'Now'">Immediate</span>
                </td>
                <td class="p-4 text-right space-x-1">
                  <button 
                    *ngIf="camp.status === 'Draft'"
                    (click)="executeSendNow(camp._id)"
                    class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all">
                    Send Now
                  </button>

                  <button 
                    *ngIf="camp.status === 'Scheduled'"
                    (click)="pauseCampaign(camp._id)"
                    class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all">
                    Pause
                  </button>

                  <button 
                    *ngIf="camp.status === 'Paused'"
                    (click)="resumeCampaign(camp._id)"
                    class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-all">
                    Resume
                  </button>

                  <button 
                    *ngIf="camp.status === 'Scheduled' || camp.status === 'Paused'"
                    (click)="cancelCampaign(camp._id)"
                    class="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold transition-all">
                    Cancel
                  </button>

                  <button 
                    (click)="openTestModal(camp)"
                    class="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-[10px] font-bold transition-all">
                    Send Test
                  </button>

                  <button 
                    (click)="deleteCampaign(camp._id)"
                    class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold transition-all">
                    Delete
                  </button>
                </td>
              </tr>
              <tr *ngIf="campaigns().length === 0">
                <td colspan="7" class="p-8 text-center text-stone-400 text-xs">
                  No marketing campaigns created yet. Click "Create New Campaign" to get started.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Campaign Builder Wizard Modal -->
      <div *ngIf="isCreateModalOpen()" class="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
          
          <!-- Stepper Header -->
          <div class="bg-stone-900 text-white p-6 border-b border-stone-800 flex justify-between items-center">
            <div>
              <span class="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest block mb-1">CAMPAIGN BUILDER — STEP {{ wizardStep() }} OF 5</span>
              <h2 class="text-lg font-black tracking-tight">Create Marketing Campaign</h2>
            </div>
            <button (click)="closeCreateModal()" class="text-stone-400 hover:text-white">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

            <!-- STEP 1: Campaign Details -->
            <div *ngIf="wizardStep() === 1" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-stone-700 mb-1">Campaign Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="newCampaign.name" 
                  placeholder="e.g. Q3 Re-Engagement Sequence" 
                  class="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none">
              </div>

              <div>
                <label class="block text-xs font-bold text-stone-700 mb-1">Campaign Type</label>
                <select 
                  [(ngModel)]="newCampaign.type" 
                  class="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                  <option value="Email Campaign">Email Campaign</option>
                  <option value="Automated Campaign">Automated Campaign</option>
                  <option value="Email Sequence">Email Sequence</option>
                  <option value="Re-Engagement Campaign">Re-Engagement Campaign</option>
                  <option value="Customer Nurture Campaign">Customer Nurture Campaign</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-stone-700 mb-1">Description</label>
                <textarea 
                  [(ngModel)]="newCampaign.description" 
                  rows="3" 
                  placeholder="Campaign objective and target segment notes..." 
                  class="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"></textarea>
              </div>
            </div>

            <!-- STEP 2: Audience Segmentation -->
            <div *ngIf="wizardStep() === 2" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-stone-700 mb-2">Target Entity Type</label>
                <div class="grid grid-cols-3 gap-3">
                  <button 
                    type="button" 
                    (click)="newCampaign.audienceDefinition.targetType = 'Leads'" 
                    [class.bg-amber-600]="newCampaign.audienceDefinition.targetType === 'Leads'"
                    [class.text-white]="newCampaign.audienceDefinition.targetType === 'Leads'"
                    class="p-3 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-amber-50">
                    Leads Only
                  </button>
                  <button 
                    type="button" 
                    (click)="newCampaign.audienceDefinition.targetType = 'Customers'" 
                    [class.bg-amber-600]="newCampaign.audienceDefinition.targetType === 'Customers'"
                    [class.text-white]="newCampaign.audienceDefinition.targetType === 'Customers'"
                    class="p-3 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-amber-50">
                    Customers Only
                  </button>
                  <button 
                    type="button" 
                    (click)="newCampaign.audienceDefinition.targetType = 'Both'" 
                    [class.bg-amber-600]="newCampaign.audienceDefinition.targetType === 'Both'"
                    [class.text-white]="newCampaign.audienceDefinition.targetType === 'Both'"
                    class="p-3 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-amber-50">
                    Leads & Customers
                  </button>
                </div>
              </div>

              <!-- Lead Filters -->
              <div *ngIf="newCampaign.audienceDefinition.targetType === 'Leads' || newCampaign.audienceDefinition.targetType === 'Both'" class="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <h4 class="font-extrabold text-xs text-stone-800 uppercase tracking-wider">Lead Segmentation Filters</h4>
                
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-stone-600 mb-1">Minimum AI Score (0-100)</label>
                    <input 
                      type="number" 
                      [(ngModel)]="newCampaign.audienceDefinition.leadFilters.minAiScore" 
                      class="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs outline-none">
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-stone-600 mb-1">Min Expected Revenue (₹)</label>
                    <input 
                      type="number" 
                      [(ngModel)]="newCampaign.audienceDefinition.leadFilters.minExpectedRevenue" 
                      class="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs outline-none">
                  </div>
                </div>
              </div>

              <!-- Customer Filters -->
              <div *ngIf="newCampaign.audienceDefinition.targetType === 'Customers' || newCampaign.audienceDefinition.targetType === 'Both'" class="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <h4 class="font-extrabold text-xs text-stone-800 uppercase tracking-wider">Customer Segmentation Filters</h4>
                
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-stone-600 mb-1">Min Revenue Generated (₹)</label>
                    <input 
                      type="number" 
                      [(ngModel)]="newCampaign.audienceDefinition.customerFilters.minRevenue" 
                      class="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs outline-none">
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-stone-600 mb-1">Min Outstanding Balance (₹)</label>
                    <input 
                      type="number" 
                      [(ngModel)]="newCampaign.audienceDefinition.customerFilters.minOutstandingBalance" 
                      class="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs outline-none">
                  </div>
                </div>
              </div>
            </div>

            <!-- STEP 3: Email Content Composer -->
            <div *ngIf="wizardStep() === 3" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-stone-700 mb-1">Email Subject *</label>
                <input 
                  type="text" 
                  [(ngModel)]="newCampaign.emailContent.subject" 
                  placeholder="e.g. Exclusive Update for recipient" 
                  class="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none">
              </div>

              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="block text-xs font-bold text-stone-700">Email Body Content *</label>
                  <span class="text-[10px] text-stone-500">Available tokens: contactName, firstName, companyName, workspaceName</span>
                </div>
                <textarea 
                  [(ngModel)]="newCampaign.emailContent.body" 
                  rows="7" 
                  placeholder="Hi there, We wanted to share an update..." 
                  class="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none font-sans"></textarea>
              </div>
            </div>

            <!-- STEP 4: Audience Preview -->
            <div *ngIf="wizardStep() === 4" class="space-y-4">
              <div class="bg-amber-50 p-4 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <h4 class="font-extrabold text-amber-900 text-xs">Audience Verification Result</h4>
                  <p class="text-[11px] text-amber-700">Live query executed against tenant database</p>
                </div>
                <button (click)="runAudiencePreview()" class="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold">
                  Refresh Preview
                </button>
              </div>

              <div *ngIf="previewResult()" class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div class="p-3 bg-stone-100 rounded-xl border border-stone-200">
                  <span class="text-[10px] font-bold text-stone-500 uppercase">Total Matched</span>
                  <div class="text-xl font-black text-stone-900">{{ previewResult()?.totalMatched }}</div>
                </div>
                <div class="p-3 bg-emerald-100 rounded-xl border border-emerald-200">
                  <span class="text-[10px] font-bold text-emerald-700 uppercase">Eligible</span>
                  <div class="text-xl font-black text-emerald-900">{{ previewResult()?.eligibleRecipients }}</div>
                </div>
                <div class="p-3 bg-rose-100 rounded-xl border border-rose-200">
                  <span class="text-[10px] font-bold text-rose-700 uppercase">Unsubscribed Excluded</span>
                  <div class="text-xl font-black text-rose-900">{{ previewResult()?.unsubscribedExcluded }}</div>
                </div>
                <div class="p-3 bg-stone-100 rounded-xl border border-stone-200">
                  <span class="text-[10px] font-bold text-stone-500 uppercase">Duplicates Removed</span>
                  <div class="text-xl font-black text-stone-900">{{ previewResult()?.duplicateExcluded }}</div>
                </div>
              </div>

              <div *ngIf="previewResult()?.sampleRecipients?.length" class="space-y-2">
                <h5 class="text-xs font-extrabold text-stone-800">Sample Personalized Render Preview</h5>
                <div class="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div class="font-bold text-stone-900">Subject: {{ previewResult()?.sampleRecipients?.[0]?.personalizedSubjectPreview }}</div>
                  <div class="text-stone-600 whitespace-pre-wrap">{{ previewResult()?.sampleRecipients?.[0]?.personalizedBodyPreview }}</div>
                </div>
              </div>
            </div>

            <!-- STEP 5: Schedule / Confirm -->
            <div *ngIf="wizardStep() === 5" class="space-y-5">
              <div class="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <h4 class="font-extrabold text-xs text-stone-900 uppercase tracking-wider">Final Campaign Confirmation</h4>
                <div class="text-xs space-y-1 text-stone-700">
                  <div><strong>Campaign:</strong> {{ newCampaign.name }}</div>
                  <div><strong>Sender Identity:</strong> {{ workspaceContext.workspaceName() }} (Configured Identity)</div>
                  <div><strong>Target Audience:</strong> {{ newCampaign.audienceDefinition.targetType }} ({{ previewResult()?.eligibleRecipients || 0 }} Recipients)</div>
                  <div><strong>Subject:</strong> {{ newCampaign.emailContent.subject }}</div>
                </div>
              </div>

              <!-- Scheduling Mode Selector -->
              <div class="space-y-3">
                <label class="block text-xs font-extrabold text-stone-800">Choose Execution Strategy</label>
                <div class="grid grid-cols-2 gap-3">
                  <button 
                    type="button" 
                    (click)="executionStrategy = 'Draft'" 
                    [class.bg-amber-600]="executionStrategy === 'Draft'"
                    [class.text-white]="executionStrategy === 'Draft'"
                    class="p-4 border border-stone-200 rounded-xl text-left hover:bg-amber-50/50 transition-all">
                    <div class="font-bold text-xs">Save as Draft</div>
                    <div class="text-[10px] opacity-80 mt-1">Store campaign as draft to review or send manually later.</div>
                  </button>

                  <button 
                    type="button" 
                    (click)="executionStrategy = 'Scheduled'" 
                    [class.bg-amber-600]="executionStrategy === 'Scheduled'"
                    [class.text-white]="executionStrategy === 'Scheduled'"
                    class="p-4 border border-stone-200 rounded-xl text-left hover:bg-amber-50/50 transition-all">
                    <div class="font-bold text-xs">Schedule Campaign</div>
                    <div class="text-[10px] opacity-80 mt-1">Set automatic execution date, time, and timezone.</div>
                  </button>
                </div>
              </div>

              <!-- Date / Time / Timezone Pickers -->
              <div *ngIf="executionStrategy === 'Scheduled'" class="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <h4 class="font-extrabold text-xs text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span class="material-icons text-amber-600 text-sm">schedule</span>
                  Schedule Parameters
                </h4>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-stone-600 mb-1">Execution Date *</label>
                    <input 
                      type="date" 
                      [(ngModel)]="scheduleDate" 
                      class="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                  </div>

                  <div>
                    <label class="block text-[11px] font-bold text-stone-600 mb-1">Execution Time *</label>
                    <input 
                      type="time" 
                      [(ngModel)]="scheduleTime" 
                      class="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                  </div>

                  <div>
                    <label class="block text-[11px] font-bold text-stone-600 mb-1">Workspace Timezone</label>
                    <select 
                      [(ngModel)]="scheduleTimezone" 
                      class="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

          </div>

          <!-- Wizard Footer Controls -->
          <div class="p-6 bg-stone-50 border-t border-stone-200 flex justify-between items-center">
            <button 
              *ngIf="wizardStep() > 1" 
              (click)="wizardStep.set(wizardStep() - 1)" 
              class="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold">
              Back
            </button>
            <div *ngIf="wizardStep() === 1"></div>

            <button 
              *ngIf="wizardStep() < 5" 
              (click)="nextWizardStep()" 
              class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md">
              Next Step
            </button>

            <div *ngIf="wizardStep() === 5" class="flex gap-2">
              <button 
                *ngIf="executionStrategy === 'Draft'"
                (click)="saveCampaign('Draft')" 
                class="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-amber-600/20">
                Save as Draft
              </button>

              <button 
                *ngIf="executionStrategy === 'Scheduled'"
                (click)="saveCampaign('Scheduled')" 
                class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/20">
                Schedule Campaign
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Send Test Email Modal -->
      <div *ngIf="isTestModalOpen()" class="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-md p-6 space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="font-extrabold text-stone-900 text-sm">Send Test Campaign Email</h3>
            <button (click)="isTestModalOpen.set(false)" class="text-stone-400 hover:text-stone-700">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div>
            <label class="block text-xs font-bold text-stone-700 mb-1">Test Recipient Email Address</label>
            <input 
              type="email" 
              [(ngModel)]="testRecipientEmail" 
              placeholder="you@example.com" 
              class="w-full px-4 py-2 border border-stone-300 rounded-xl text-xs outline-none">
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button (click)="isTestModalOpen.set(false)" class="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold">Cancel</button>
            <button (click)="executeSendTest()" class="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md">Send Test Now</button>
          </div>
        </div>
      </div>

    </div>
  `,
})
export class MarketingComponent implements OnInit {
  private api = inject(ApiService);
  public workspaceContext = inject(WorkspaceContextService);

  campaigns = signal<Campaign[]>([]);
  analytics = signal<any>(null);

  isCreateModalOpen = signal(false);
  isTestModalOpen = signal(false);
  selectedTestCampaign = signal<Campaign | null>(null);
  testRecipientEmail = '';

  wizardStep = signal(1);
  previewResult = signal<AudiencePreviewResult | null>(null);

  newCampaign: any = {
    name: '',
    type: 'Email Campaign',
    description: '',
    audienceDefinition: {
      targetType: 'Leads',
      leadFilters: { minAiScore: 0, minExpectedRevenue: 0 },
      customerFilters: { minRevenue: 0, minOutstandingBalance: 0 }
    },
    emailContent: {
      subject: '',
      body: ''
    },
    schedule: { sendType: 'Now' }
  };

  ngOnInit() {
    this.loadCampaigns();
    this.loadAnalytics();
  }

  loadCampaigns() {
    this.api.get('/marketing/campaigns').subscribe({
      next: (res: any) => {
        if (res.success) this.campaigns.set(res.data);
      }
    });
  }

  loadAnalytics() {
    this.api.get('/marketing/analytics').subscribe({
      next: (res: any) => {
        if (res.success) this.analytics.set(res.data);
      }
    });
  }

  openCreateModal() {
    this.wizardStep.set(1);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  nextWizardStep() {
    if (this.wizardStep() === 3) {
      this.runAudiencePreview();
    }
    this.wizardStep.set(this.wizardStep() + 1);
  }

  runAudiencePreview() {
    this.api.post('/marketing/audience/preview', {
      audienceDefinition: this.newCampaign.audienceDefinition,
      emailContent: this.newCampaign.emailContent
    }).subscribe({
      next: (res: any) => {
        if (res.success) this.previewResult.set(res.data);
      }
    });
  }

  executionStrategy: 'Draft' | 'Scheduled' = 'Draft';
  scheduleDate = '';
  scheduleTime = '';
  scheduleTimezone = 'Asia/Kolkata';

  saveCampaign(sendType: 'Draft' | 'Scheduled' = 'Draft') {
    this.newCampaign.schedule.sendType = sendType;
    if (sendType === 'Scheduled' && this.scheduleDate && this.scheduleTime) {
      this.newCampaign.schedule.scheduledAt = new Date(`${this.scheduleDate}T${this.scheduleTime}`).toISOString();
      this.newCampaign.schedule.timezone = this.scheduleTimezone;
      this.newCampaign.status = 'Scheduled';
    } else {
      this.newCampaign.status = 'Draft';
    }

    this.api.post('/marketing/campaigns', this.newCampaign).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.loadCampaigns();
          this.closeCreateModal();
        }
      }
    });
  }

  executeSendNow(campaignId: string) {
    if (!confirm('Are you sure you want to execute mass delivery for this campaign now?')) return;
    this.api.post(`/marketing/campaigns/${campaignId}/send`, {}).subscribe({
      next: (res: any) => {
        alert(res.message || 'Campaign execution triggered.');
        this.loadCampaigns();
        this.loadAnalytics();
      },
      error: (err: any) => {
        alert(err.error?.error || 'Execution failed');
      }
    });
  }

  pauseCampaign(id: string) {
    this.api.post(`/marketing/campaigns/${id}/pause`, {}).subscribe({
      next: () => {
        this.loadCampaigns();
      }
    });
  }

  resumeCampaign(id: string) {
    this.api.post(`/marketing/campaigns/${id}/resume`, {}).subscribe({
      next: () => {
        this.loadCampaigns();
      }
    });
  }

  cancelCampaign(id: string) {
    if (!confirm('Are you sure you want to cancel this campaign?')) return;
    this.api.post(`/marketing/campaigns/${id}/cancel`, {}).subscribe({
      next: () => {
        this.loadCampaigns();
      }
    });
  }

  openTestModal(camp: Campaign) {
    this.selectedTestCampaign.set(camp);
    this.isTestModalOpen.set(true);
  }

  executeSendTest() {
    const camp = this.selectedTestCampaign();
    if (!camp || !this.testRecipientEmail) return;

    this.api.post(`/marketing/campaigns/${camp._id}/test`, { testEmail: this.testRecipientEmail }).subscribe({
      next: (res: any) => {
        alert(res.message || 'Test email sent!');
        this.isTestModalOpen.set(false);
      },
      error: (err: any) => {
        alert(err.error?.error || 'Test email failed');
      }
    });
  }

  deleteCampaign(id: string) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    this.api.delete(`/marketing/campaigns/${id}`).subscribe({
      next: () => {
        this.loadCampaigns();
        this.loadAnalytics();
      }
    });
  }
}
