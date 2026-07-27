import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fadeIn">
      
      <!-- Top Workspace Navigation Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-stone-200 shadow-sm gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-extrabold text-stone-900 tracking-tight">Support Operating System</h1>
            <span class="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full uppercase tracking-wider">Email-First Support Care</span>
          </div>
          <p class="text-xs text-stone-500 mt-1">
            Dedicated Customer Care Mailbox: <strong class="text-stone-800">{{ mailboxIdentity()?.supportMailboxEmail || 'support@company.com' }}</strong> |
            <span [class.text-emerald-700]="mailboxIdentity()?.isConnected" [class.text-amber-700]="!mailboxIdentity()?.isConnected" class="font-bold">
              {{ mailboxIdentity()?.connectionStatus || 'Email Inbound: Not Connected' }}
            </span>
          </p>
        </div>

        <!-- 4 Distinct Operational Surface Tabs -->
        <div class="flex flex-wrap gap-2">
          <button (click)="setView('inbox')" [class.bg-amber-600]="activeView() === 'inbox'" [class.text-white]="activeView() === 'inbox'" class="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
            <span class="material-icons text-sm">forum</span> Unified Inbox
          </button>
          <button (click)="setView('tickets')" [class.bg-amber-600]="activeView() === 'tickets'" [class.text-white]="activeView() === 'tickets'" class="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
            <span class="material-icons text-sm">confirmation_number</span> Support Desk
          </button>
          <button (click)="setView('sla')" [class.bg-amber-600]="activeView() === 'sla'" [class.text-white]="activeView() === 'sla'" class="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
            <span class="material-icons text-sm">timer</span> SLA & Risk Board
          </button>
          <button (click)="setView('analytics')" [class.bg-amber-600]="activeView() === 'analytics'" [class.text-white]="activeView() === 'analytics'" class="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
            <span class="material-icons text-sm">insights</span> Support Analytics
          </button>
        </div>
      </div>

      <!-- VIEW 1: UNIFIED INBOX (Communication-First Entry Point) -->
      <div *ngIf="activeView() === 'inbox'" class="h-[75vh] flex flex-col md:flex-row gap-6">
        
        <!-- Left Conversations List -->
        <div class="w-full md:w-[35%] bg-white border border-stone-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div class="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
            <h3 class="font-extrabold text-xs uppercase tracking-wider text-stone-700">Communication Streams</h3>
            <span class="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">{{ conversations().length }} Threads</span>
          </div>

          <!-- Channel Filter -->
          <div class="flex border-b border-stone-100 text-[11px] font-bold bg-stone-50/30">
            <button *ngFor="let ch of ['all', 'email', 'web_form', 'live_chat', 'phone']" 
                    (click)="selectedChannelFilter = ch; loadConversations()"
                    [class.border-b-2]="selectedChannelFilter === ch"
                    [class.border-amber-600]="selectedChannelFilter === ch"
                    [class.text-amber-700]="selectedChannelFilter === ch"
                    class="flex-1 py-2 text-center uppercase tracking-wider text-stone-500 hover:text-stone-800">
              {{ ch === 'email' ? 'Mailbox' : ch.replace('_', ' ') }}
            </button>
          </div>

          <div class="flex-1 overflow-y-auto divide-y divide-stone-100">
            <div *ngFor="let conv of conversations()" 
                 (click)="selectConversation(conv)"
                 [class.bg-amber-50/50]="activeConversation()?._id === conv._id"
                 class="p-4 hover:bg-stone-50 cursor-pointer transition-all space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-700 flex items-center gap-1">
                  <span class="material-icons text-[12px]">{{ getChannelIcon(conv.channel) }}</span>
                  {{ conv.channel === 'email' ? 'Support Mailbox' : conv.channel.replace('_', ' ') }}
                </span>
                <span class="text-[10px] font-medium text-stone-400">{{ conv.lastMessageAt | date:'shortTime' }}</span>
              </div>
              <h4 class="font-bold text-xs text-stone-900 truncate">{{ conv.subject }}</h4>
              <p class="text-[11px] text-stone-500 truncate">{{ conv.lastMessagePreview || 'No preview available' }}</p>
              <div class="flex justify-between items-center text-[10px] text-stone-400 pt-1">
                <span>Contact: {{ conv.customer?.companyName || conv.lead?.company || 'Visitor' }}</span>
                <span *ngIf="conv.ticket" class="font-bold text-amber-700">TKT Ref: {{ conv.ticket?.ticketCode || 'Linked' }}</span>
              </div>
            </div>
            <div *ngIf="conversations().length === 0" class="p-8 text-center text-xs text-stone-400">
              No support conversation threads found.
            </div>
          </div>
        </div>

        <!-- Right Conversation Stream & Reply Composer -->
        <div class="flex-1 bg-white border border-stone-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div *ngIf="activeConversation()" class="flex-1 flex flex-col h-full">
            
            <div class="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
              <div>
                <span class="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">{{ activeConversation().conversationKey }}</span>
                <h3 class="font-bold text-sm text-stone-900">{{ activeConversation().subject }}</h3>
              </div>
              <div class="flex gap-2">
                <button *ngIf="!activeConversation().ticket" (click)="convertToTicket(activeConversation()._id)" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1">
                  <span class="material-icons text-sm">confirmation_number</span> Convert to Ticket
                </button>
                <span *ngIf="activeConversation().ticket" class="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1">
                  <span class="material-icons text-sm">check_circle</span> Linked Ticket Active
                </span>
              </div>
            </div>

            <!-- Messages Stream -->
            <div class="flex-1 p-6 overflow-y-auto space-y-4 bg-stone-50/30">
              <div *ngFor="let msg of activeMessages()" 
                   [class.items-end]="msg.direction === 'outbound'"
                   [class.items-start]="msg.direction === 'inbound'"
                   class="flex flex-col">
                <div [class.bg-stone-900]="msg.direction === 'outbound' && !msg.isInternal"
                     [class.text-white]="msg.direction === 'outbound' && !msg.isInternal"
                     [class.bg-white]="msg.direction === 'inbound'"
                     [class.text-stone-900]="msg.direction === 'inbound'"
                     [class.bg-amber-50]="msg.isInternal"
                     [class.border-amber-200]="msg.isInternal"
                     class="max-w-[75%] p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1">
                  <div class="flex justify-between items-center gap-4 text-[10px] opacity-75 border-b border-stone-200/40 pb-1 mb-1">
                    <span class="font-bold">{{ msg.senderName }} ({{ msg.senderType }})</span>
                    <span *ngIf="msg.isInternal" class="font-black text-amber-700 uppercase bg-amber-100 px-1.5 py-0.5 rounded">INTERNAL NOTE</span>
                    <span>{{ msg.createdAt | date:'short' }}</span>
                  </div>
                  <p class="text-xs font-medium whitespace-pre-wrap">{{ msg.body }}</p>

                  <!-- Attachments Display -->
                  <div *ngIf="msg.attachments && msg.attachments.length > 0" class="pt-2 flex flex-wrap gap-2">
                    <a *ngFor="let att of msg.attachments" [href]="att.fileUrl" target="_blank" class="px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-[10px] font-bold text-stone-700 flex items-center gap-1 hover:bg-stone-200">
                      <span class="material-icons text-xs">attach_file</span> {{ att.fileName }}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Composer & Attachment Uploader -->
            <div class="p-4 border-t border-stone-200 bg-white space-y-3">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-1.5 text-xs font-bold text-stone-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="replyIsInternal" class="rounded text-amber-600 focus:ring-amber-500">
                  <span>Add as Internal Note (hidden from customer)</span>
                </label>
                <div class="flex items-center gap-2">
                  <label class="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1">
                    <span class="material-icons text-xs">upload_file</span> Attach File/Screenshot
                    <input type="file" (change)="handleFileSelect($event)" class="hidden">
                  </label>
                </div>
              </div>

              <!-- Selected Attachment Preview -->
              <div *ngIf="selectedAttachment" class="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs flex justify-between items-center text-amber-800">
                <span class="font-bold flex items-center gap-1">
                  <span class="material-icons text-xs">description</span> {{ selectedAttachment.name }} ({{ (selectedAttachment.size / 1024).toFixed(1) }} KB)
                </span>
                <button (click)="selectedAttachment = null" class="text-rose-600 hover:text-rose-800 font-extrabold text-xs">Remove</button>
              </div>

              <div class="flex gap-2">
                <textarea [(ngModel)]="replyText" rows="2" placeholder="Type customer reply or internal note..." class="flex-1 p-3 border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-sans"></textarea>
                <button (click)="sendConversationMessage()" [disabled]="!replyText && !selectedAttachment" class="px-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all">
                  Send
                </button>
              </div>
            </div>

          </div>

          <div *ngIf="!activeConversation()" class="flex-1 flex flex-col items-center justify-center text-stone-400 text-xs space-y-2">
            <span class="material-icons text-4xl">forum</span>
            <p>Select a communication thread from the Unified Inbox.</p>
          </div>
        </div>

      </div>

      <!-- VIEW 2: SUPPORT DESK (Ticket Operating Record & Manual Agent Assignment Workspace) -->
      <div *ngIf="activeView() === 'tickets'" class="h-[75vh] flex flex-col md:flex-row gap-6">
        
        <!-- Left Ticket Queue -->
        <div class="w-full md:w-[35%] bg-white border border-stone-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div class="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
            <h3 class="font-extrabold text-xs uppercase tracking-wider text-stone-700">Ticket Operating Queue</h3>
            <button (click)="openAddTicketModal = true" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1">
              <span class="material-icons text-sm">add</span> New Ticket
            </button>
          </div>

          <div class="flex border-b border-stone-100 text-[10px] font-bold bg-stone-50/30 overflow-x-auto">
            <button *ngFor="let tab of ['All', 'Open', 'Assigned', 'In Progress', 'Waiting for Agent', 'Resolved', 'Closed', 'Reopened']"
                    (click)="selectedTicketTab = tab; loadTickets()"
                    [class.border-b-2]="selectedTicketTab === tab"
                    [class.border-amber-600]="selectedTicketTab === tab"
                    [class.text-amber-700]="selectedTicketTab === tab"
                    class="px-3 py-2 text-center uppercase tracking-wider text-stone-500 hover:text-stone-800 whitespace-nowrap">
              {{ tab }}
            </button>
          </div>

          <div class="flex-1 overflow-y-auto divide-y divide-stone-100">
            <div *ngFor="let t of tickets()"
                 (click)="selectTicket(t)"
                 [class.bg-amber-50/50]="activeTicket()?._id === t._id"
                 class="p-4 hover:bg-stone-50 cursor-pointer transition-all space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-[10px] font-extrabold text-amber-700">{{ t.ticketCode }}</span>
                <span [class.bg-rose-100]="t.priority === 'Urgent'" [class.text-rose-800]="t.priority === 'Urgent'"
                      [class.bg-amber-100]="t.priority === 'High'" [class.text-amber-800]="t.priority === 'High'"
                      class="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  {{ t.priority }}
                </span>
              </div>
              <h4 class="font-bold text-xs text-stone-900 truncate">{{ t.title }}</h4>
              <div class="flex justify-between items-center text-[10px] text-stone-500">
                <span>{{ t.customer?.companyName || t.lead?.company || 'Support Visitor' }}</span>
                <span class="font-bold text-stone-700 px-2 py-0.5 rounded bg-stone-100">{{ t.status }}</span>
              </div>
              <div class="text-[10px] text-stone-400 flex justify-between pt-0.5">
                <span>Agent: {{ t.assignedEmployee?.name || 'Unassigned' }}</span>
                <span>SLA: {{ t.slaStatus }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Ticket Agent Workspace -->
        <div class="flex-1 bg-white border border-stone-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div *ngIf="activeTicket()" class="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
            
            <!-- Header & Manual Agent Assignment Picker -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-200 pb-4 gap-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-black text-amber-700">{{ activeTicket().ticketCode }}</span>
                  <span class="px-2 py-0.5 bg-stone-100 text-stone-700 text-[10px] font-extrabold rounded uppercase">{{ activeTicket().channel || 'email' }}</span>
                  <span [class.bg-emerald-100]="activeTicket().status === 'Resolved'" [class.text-emerald-800]="activeTicket().status === 'Resolved'"
                        [class.bg-stone-200]="activeTicket().status === 'Closed'" [class.text-stone-800]="activeTicket().status === 'Closed'"
                        class="px-2 py-0.5 text-[10px] font-black rounded uppercase">
                    {{ activeTicket().status }}
                  </span>
                </div>
                <h2 class="text-lg font-extrabold text-stone-900">{{ activeTicket().title }}</h2>
              </div>

              <!-- Manual Agent Picker & Action Buttons -->
              <div class="flex flex-wrap gap-2 items-center">
                <div class="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-xl px-3 py-1 text-xs">
                  <span class="font-bold text-stone-500">Agent:</span>
                  <select (change)="onAssignAgentChange($event)" class="bg-transparent font-bold text-stone-800 outline-none cursor-pointer">
                    <option value="" [selected]="!activeTicket().assignedEmployee">Unassigned</option>
                    <option *ngFor="let emp of employees()" [value]="emp._id" [selected]="activeTicket().assignedEmployee?._id === emp._id">
                      {{ emp.name }} ({{ emp.department || 'Agent' }})
                    </option>
                  </select>
                </div>

                <button *ngIf="['Open', 'Assigned', 'In Progress', 'In_Progress', 'Waiting for Customer', 'Waiting for Agent', 'Reopened'].includes(activeTicket().status)"
                        (click)="openResolveModal = true"
                        class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1">
                  <span class="material-icons text-sm">check_circle</span> Resolve Ticket
                </button>

                <button *ngIf="['Resolved', 'Closed'].includes(activeTicket().status)"
                        (click)="reopenActiveTicket()"
                        class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1">
                  <span class="material-icons text-sm">replay</span> Reopen Ticket
                </button>
              </div>
            </div>

            <!-- AI Support Clarification Flow Assistant Box -->
            <div class="p-4 bg-gradient-to-r from-amber-50 to-stone-50 border border-amber-200/80 rounded-2xl space-y-3">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2 text-xs font-extrabold text-amber-900">
                  <span class="material-icons text-sm text-amber-600">psychology</span>
                  AI Support Clarification Assistant
                </div>
                <button (click)="triggerAiClarificationStep()" class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all">
                  Run AI Evidence Clarification
                </button>
              </div>
              <p *ngIf="activeTicket().aiClarification?.issueSummary" class="text-xs text-stone-800 font-medium whitespace-pre-wrap bg-white p-3 rounded-xl border border-stone-200">
                {{ activeTicket().aiClarification?.issueSummary }}
              </p>
              <p *ngIf="!activeTicket().aiClarification?.issueSummary" class="text-xs text-stone-600">
                If the assigned agent is unavailable or offline, trigger AI clarification to automatically ask structured evidence questions (problem details, recent changes, screenshot upload request, urgency scope).
              </p>
            </div>

            <!-- Priority & SLA Summary Bar -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs">
              <div>
                <span class="text-[10px] font-bold text-stone-400 uppercase block">Priority Engine</span>
                <span class="font-extrabold uppercase text-amber-700">{{ activeTicket().priority }}</span>
              </div>
              <div>
                <span class="text-[10px] font-bold text-stone-400 uppercase block">SLA Target</span>
                <span class="font-bold text-stone-800">{{ activeTicket().slaStatus }}</span>
              </div>
              <div>
                <span class="text-[10px] font-bold text-stone-400 uppercase block">Resolution Due</span>
                <span class="font-bold text-stone-800">{{ activeTicket().resolutionDueAt | date:'short' }}</span>
              </div>
              <div>
                <span class="text-[10px] font-bold text-stone-400 uppercase block">Resolution Duration</span>
                <span class="font-extrabold text-emerald-700">
                  {{ activeTicket().resolutionDurationMinutes ? (activeTicket().resolutionDurationMinutes + ' mins') : 'Pending Resolution' }}
                </span>
              </div>
            </div>

            <!-- Ticket Description -->
            <div class="space-y-1">
              <h4 class="text-xs font-extrabold uppercase text-stone-500">Issue Description & Evidence</h4>
              <div class="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-800 leading-relaxed font-medium">
                {{ activeTicket().description }}
              </div>
            </div>

            <!-- Resolution Summary Box (if resolved) -->
            <div *ngIf="activeTicket().resolutionSummary" class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <span class="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Official Resolution Summary</span>
              <p class="text-xs text-emerald-900 font-medium">{{ activeTicket().resolutionSummary }}</p>
            </div>

            <!-- Activity & Comment History -->
            <div class="space-y-3 pt-2">
              <h4 class="text-xs font-extrabold uppercase text-stone-500">Activity Thread & Notes</h4>
              <div *ngFor="let c of activeTicket().comments" 
                   [class.bg-amber-50]="c.isInternal"
                   [class.border-amber-200]="c.isInternal"
                   [class.bg-stone-50]="!c.isInternal"
                   class="p-4 rounded-xl border border-stone-200 space-y-1 text-xs">
                <div class="flex justify-between items-center text-[10px] text-stone-500">
                  <span class="font-bold text-stone-900">{{ c.commentedBy?.name || 'Customer Care User' }}</span>
                  <span *ngIf="c.isInternal" class="px-2 py-0.5 bg-amber-200 text-amber-900 font-extrabold rounded uppercase">INTERNAL NOTE</span>
                  <span>{{ c.createdAt | date:'short' }}</span>
                </div>
                <p class="text-stone-800 font-medium whitespace-pre-wrap">{{ c.comment }}</p>
              </div>
            </div>

          </div>

          <div *ngIf="!activeTicket()" class="flex-1 flex items-center justify-center text-stone-400 text-xs">
            Select a ticket from the queue to manage assignment and resolution.
          </div>
        </div>

      </div>

      <!-- VIEW 3: SLA & OPERATIONAL RISK BOARD -->
      <div *ngIf="activeView() === 'sla'" class="space-y-6">
        <div class="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 class="text-lg font-extrabold text-stone-900">SLA Operational Risk Board</h3>
            <p class="text-xs text-stone-500 mt-1">Real-time SLA targets, priority matrix, and operational risk board for tickets at risk or breached.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div *ngFor="let priority of ['Low', 'Medium', 'High', 'Urgent']" class="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
              <span [class.bg-rose-100]="priority === 'Urgent'" [class.text-rose-800]="priority === 'Urgent'"
                    [class.bg-amber-100]="priority === 'High'" [class.text-amber-800]="priority === 'High'"
                    class="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase">
                {{ priority }} Priority Target
              </span>
              <div class="space-y-1 text-xs text-stone-700">
                <div class="flex justify-between">
                  <span>First Response SLA:</span>
                  <strong *ngIf="priority === 'Urgent'">1 hour</strong>
                  <strong *ngIf="priority === 'High'">4 hours</strong>
                  <strong *ngIf="priority === 'Medium'">24 hours</strong>
                  <strong *ngIf="priority === 'Low'">48 hours</strong>
                </div>
                <div class="flex justify-between">
                  <span>Resolution SLA Target:</span>
                  <strong *ngIf="priority === 'Urgent'">8 hours</strong>
                  <strong *ngIf="priority === 'High'">24 hours</strong>
                  <strong *ngIf="priority === 'Medium'">3 days</strong>
                  <strong *ngIf="priority === 'Low'">7 days</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 4: SUPPORT ANALYTICS DASHBOARD -->
      <div *ngIf="activeView() === 'analytics'" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="bg-white p-6 border border-stone-200 rounded-2xl shadow-sm">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-stone-500">Total Support Tickets</span>
            <h2 class="text-3xl font-black text-stone-900 mt-2">{{ supportAnalytics()?.totalTickets || 0 }}</h2>
          </div>
          <div class="bg-white p-6 border border-stone-200 rounded-2xl shadow-sm">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">SLA Compliance Rate</span>
            <h2 class="text-3xl font-black text-emerald-600 mt-2">{{ supportAnalytics()?.slaComplianceRate || 100 }}%</h2>
          </div>
          <div class="bg-white p-6 border border-stone-200 rounded-2xl shadow-sm">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-rose-600">Urgent Tickets</span>
            <h2 class="text-3xl font-black text-rose-600 mt-2">{{ supportAnalytics()?.urgentTickets || 0 }}</h2>
          </div>
          <div class="bg-white p-6 border border-stone-200 rounded-2xl shadow-sm">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-amber-600">SLA Breaches</span>
            <h2 class="text-3xl font-black text-amber-600 mt-2">{{ supportAnalytics()?.slaBreaches || 0 }}</h2>
          </div>
        </div>
      </div>

      <!-- RESOLUTION SUMMARY MODAL -->
      <div *ngIf="openResolveModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-2xl">
          <h3 class="text-base font-extrabold text-stone-900">Resolve Ticket - Required Summary</h3>
          <p class="text-xs text-stone-500">Provide an official resolution summary describing how the issue was fixed before resolving this ticket.</p>
          <textarea [(ngModel)]="resolveSummaryText" rows="3" placeholder="Enter fix details and resolution summary..." class="w-full p-3 border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
          <div class="flex justify-end gap-2">
            <button (click)="openResolveModal = false" class="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold">Cancel</button>
            <button (click)="submitResolveTicket()" [disabled]="!resolveSummaryText" class="px-4 py-2 bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm">Confirm Resolution</button>
          </div>
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
export class TicketsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  activeView = signal<'inbox' | 'tickets' | 'sla' | 'analytics'>('inbox');
  
  mailboxIdentity = signal<any | null>(null);
  conversations = signal<any[]>([]);
  activeConversation = signal<any | null>(null);
  activeMessages = signal<any[]>([]);
  selectedChannelFilter = 'all';

  tickets = signal<any[]>([]);
  activeTicket = signal<any | null>(null);
  employees = signal<any[]>([]);
  selectedTicketTab = 'All';

  supportAnalytics = signal<any | null>(null);

  replyText = '';
  replyIsInternal = false;
  selectedAttachment: File | null = null;

  openAddTicketModal = false;
  openResolveModal = false;
  resolveSummaryText = '';
  aiClarificationStep = 1;

  ngOnInit() {
    this.loadMailboxIdentity();
    this.loadConversations();
    this.loadTickets();
    this.loadEmployees();
    this.loadSupportAnalytics();
  }

  setView(v: 'inbox' | 'tickets' | 'sla' | 'analytics') {
    this.activeView.set(v);
  }

  loadMailboxIdentity() {
    this.apiService.getSupportMailboxIdentity().subscribe({
      next: (res: any) => {
        if (res.success) this.mailboxIdentity.set(res.data);
      }
    });
  }

  loadEmployees() {
    this.apiService.getEmployees().subscribe({
      next: (res: any) => {
        if (res.success) this.employees.set(res.data || []);
      }
    });
  }

  getChannelIcon(ch: string): string {
    switch (ch) {
      case 'email': return 'mail';
      case 'web_form': return 'assignment';
      case 'live_chat': return 'chat';
      case 'phone': return 'phone';
      default: return 'forum';
    }
  }

  loadConversations() {
    const params = this.selectedChannelFilter !== 'all' ? { channel: this.selectedChannelFilter } : {};
    this.apiService.getConversations(params).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.conversations.set(res.data);
          if (res.data.length > 0 && !this.activeConversation()) {
            this.selectConversation(res.data[0]);
          }
        }
      }
    });
  }

  selectConversation(conv: any) {
    this.activeConversation.set(conv);
    this.apiService.getConversationById(conv._id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.activeMessages.set(res.data.messages || []);
        }
      }
    });
  }

  handleFileSelect(evt: any) {
    const file = evt.target.files?.[0];
    if (file) {
      const forbiddenExts = ['.exe', '.bat', '.sh', '.dll', '.cmd', '.ps1'];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (forbiddenExts.includes(ext)) {
        alert('Forbidden executable file type selected.');
        return;
      }
      this.selectedAttachment = file;
    }
  }

  sendConversationMessage() {
    if ((!this.replyText && !this.selectedAttachment) || !this.activeConversation()) return;
    
    const attachmentsPayload = this.selectedAttachment ? [
      { fileName: this.selectedAttachment.name, fileUrl: `/uploads/${this.selectedAttachment.name}`, fileSize: this.selectedAttachment.size }
    ] : [];

    const payload = { body: this.replyText, isInternal: this.replyIsInternal, attachments: attachmentsPayload };
    this.apiService.postConversationMessage(this.activeConversation()._id, payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.replyText = '';
          this.selectedAttachment = null;
          this.selectConversation(this.activeConversation());
        }
      }
    });
  }

  convertToTicket(convId: string) {
    this.apiService.convertConversationToTicket(convId).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.loadConversations();
          this.loadTickets();
        }
      }
    });
  }

  loadTickets() {
    const params = this.selectedTicketTab !== 'All' ? { status: this.selectedTicketTab } : {};
    this.apiService.getTickets(params).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.tickets.set(res.data);
          if (res.data.length > 0 && !this.activeTicket()) {
            this.selectTicket(res.data[0]);
          }
        }
      }
    });
  }

  selectTicket(t: any) {
    this.apiService.getTicketById(t._id).subscribe({
      next: (res: any) => {
        if (res.success) this.activeTicket.set(res.data);
      }
    });
  }

  onAssignAgentChange(evt: any) {
    if (!this.activeTicket()) return;
    const employeeId = evt.target.value;
    this.apiService.assignTicket(this.activeTicket()._id, employeeId).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.selectTicket(res.data);
          this.loadTickets();
        }
      }
    });
  }

  submitResolveTicket() {
    if (!this.activeTicket() || !this.resolveSummaryText) return;
    this.apiService.resolveTicket(this.activeTicket()._id, this.resolveSummaryText).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.openResolveModal = false;
          this.resolveSummaryText = '';
          this.selectTicket(res.data);
          this.loadTickets();
          this.loadSupportAnalytics();
        }
      }
    });
  }

  reopenActiveTicket() {
    if (!this.activeTicket()) return;
    this.apiService.reopenTicket(this.activeTicket()._id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.selectTicket(res.data);
          this.loadTickets();
        }
      }
    });
  }

  triggerAiClarificationStep() {
    if (!this.activeTicket()) return;
    this.apiService.aiClarifyTicket(this.activeTicket()._id, { step: this.aiClarificationStep }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.aiClarificationStep = (this.aiClarificationStep % 5) + 1;
          this.selectTicket(this.activeTicket());
        }
      }
    });
  }

  loadSupportAnalytics() {
    this.apiService.getSupportAnalytics().subscribe({
      next: (res: any) => {
        if (res.success) this.supportAnalytics.set(res.data);
      }
    });
  }
}
