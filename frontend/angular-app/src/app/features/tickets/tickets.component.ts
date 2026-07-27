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
      
      <!-- Top Workspace Sub-Header Navigation -->
      <div class="flex justify-between items-center bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h1 class="text-2xl font-extrabold text-stone-900 tracking-tight">Omnichannel Support & Communication System</h1>
          <p class="text-xs text-stone-500 mt-0.5">Centralized Support Tickets, Priority Signals, SLA Engine & Unified Inbox.</p>
        </div>

        <div class="flex gap-2">
          <button (click)="setView('inbox')" [class.bg-amber-600]="activeView() === 'inbox'" [class.text-white]="activeView() === 'inbox'" class="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
            <span class="material-icons text-sm">forum</span> Unified Inbox
          </button>
          <button (click)="setView('tickets')" [class.bg-amber-600]="activeView() === 'tickets'" [class.text-white]="activeView() === 'tickets'" class="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
            <span class="material-icons text-sm">confirmation_number</span> Support Desk
          </button>
          <button (click)="setView('sla')" [class.bg-amber-600]="activeView() === 'sla'" [class.text-white]="activeView() === 'sla'" class="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
            <span class="material-icons text-sm">timer</span> SLA & Priority
          </button>
          <button (click)="setView('analytics')" [class.bg-amber-600]="activeView() === 'analytics'" [class.text-white]="activeView() === 'analytics'" class="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
            <span class="material-icons text-sm">insights</span> Analytics
          </button>
        </div>
      </div>

      <!-- VIEW 1: UNIFIED INBOX -->
      <div *ngIf="activeView() === 'inbox'" class="h-[75vh] flex flex-col md:flex-row gap-6">
        
        <!-- Left Panel: Conversations List -->
        <div class="w-full md:w-[35%] bg-white border border-stone-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div class="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
            <h3 class="font-extrabold text-xs uppercase tracking-wider text-stone-700">Unified Conversations</h3>
            <span class="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">{{ conversations().length }} Active</span>
          </div>

          <!-- Channel Filter Bar -->
          <div class="flex border-b border-stone-100 text-[11px] font-bold bg-stone-50/30">
            <button *ngFor="let ch of ['all', 'email', 'web_form', 'live_chat', 'phone']" 
                    (click)="selectedChannelFilter = ch; loadConversations()"
                    [class.border-b-2]="selectedChannelFilter === ch"
                    [class.border-amber-600]="selectedChannelFilter === ch"
                    [class.text-amber-700]="selectedChannelFilter === ch"
                    class="flex-1 py-2 text-center uppercase tracking-wider text-stone-500 hover:text-stone-800">
              {{ ch.replace('_', ' ') }}
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
                  {{ conv.channel.replace('_', ' ') }}
                </span>
                <span class="text-[10px] font-medium text-stone-400">{{ conv.lastMessageAt | date:'shortTime' }}</span>
              </div>
              <h4 class="font-bold text-xs text-stone-900 truncate">{{ conv.subject }}</h4>
              <p class="text-[11px] text-stone-500 truncate">{{ conv.lastMessagePreview || 'No preview available' }}</p>
            </div>
            <div *ngIf="conversations().length === 0" class="p-8 text-center text-xs text-stone-400">
              No conversations found for this channel filter.
            </div>
          </div>
        </div>

        <!-- Right Panel: Conversation Stream & Message Composer -->
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
                  <span class="material-icons text-sm">check_circle</span> Ticket Linked
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
                </div>
              </div>
            </div>

            <!-- Reply Box -->
            <div class="p-4 border-t border-stone-200 bg-white space-y-3">
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-1.5 text-xs font-bold text-stone-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="replyIsInternal" class="rounded text-amber-600 focus:ring-amber-500">
                  <span>Add as Internal Note (hidden from customer)</span>
                </label>
              </div>
              <div class="flex gap-2">
                <textarea [(ngModel)]="replyText" rows="2" placeholder="Type reply or internal note..." class="flex-1 p-3 border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-sans"></textarea>
                <button (click)="sendConversationMessage()" [disabled]="!replyText" class="px-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all">
                  Send
                </button>
              </div>
            </div>

          </div>

          <div *ngIf="!activeConversation()" class="flex-1 flex flex-col items-center justify-center text-stone-400 text-xs space-y-2">
            <span class="material-icons text-4xl">forum</span>
            <p>Select a conversation from the Unified Inbox to view message history.</p>
          </div>
        </div>

      </div>

      <!-- VIEW 2: SUPPORT DESK TICKETS -->
      <div *ngIf="activeView() === 'tickets'" class="h-[75vh] flex flex-col md:flex-row gap-6">
        
        <!-- Left Ticket List -->
        <div class="w-full md:w-[35%] bg-white border border-stone-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div class="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
            <h3 class="font-extrabold text-xs uppercase tracking-wider text-stone-700">Support Ticket Queue</h3>
            <button (click)="openAddTicketModal = true" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1">
              <span class="material-icons text-sm">add</span> Open Ticket
            </button>
          </div>

          <div class="flex border-b border-stone-100 text-[11px] font-bold bg-stone-50/30">
            <button *ngFor="let tab of ['All', 'Open', 'In Progress', 'Resolved']"
                    (click)="selectedTicketTab = tab; loadTickets()"
                    [class.border-b-2]="selectedTicketTab === tab"
                    [class.border-amber-600]="selectedTicketTab === tab"
                    [class.text-amber-700]="selectedTicketTab === tab"
                    class="flex-1 py-2 text-center uppercase tracking-wider text-stone-500 hover:text-stone-800">
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
                <span>{{ t.customer?.companyName || t.lead?.company || 'Web Visitor' }}</span>
                <span class="font-bold text-stone-700">{{ t.status }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Ticket Detail -->
        <div class="flex-1 bg-white border border-stone-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div *ngIf="activeTicket()" class="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-5">
            
            <!-- Header -->
            <div class="flex justify-between items-start border-b border-stone-200 pb-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-black text-amber-700">{{ activeTicket().ticketCode }}</span>
                  <span class="px-2 py-0.5 bg-stone-100 text-stone-700 text-[10px] font-extrabold rounded uppercase">{{ activeTicket().channel || 'email' }}</span>
                </div>
                <h2 class="text-lg font-extrabold text-stone-900">{{ activeTicket().title }}</h2>
              </div>
              <div class="flex gap-2">
                <button (click)="openCallLogModal = true" class="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1">
                  <span class="material-icons text-sm">phone</span> Log Phone Call
                </button>
              </div>
            </div>

            <!-- Priority Engine Explanation Badge -->
            <div class="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1.5">
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                <span class="material-icons text-sm text-amber-600">psychology</span>
                Priority Engine Assessment: {{ activeTicket().priority }} Priority
              </div>
              <p class="text-xs text-amber-800 font-medium">{{ activeTicket().priorityExplanation }}</p>
            </div>

            <!-- SLA Engine Card -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs">
              <div>
                <span class="text-[10px] font-bold text-stone-400 uppercase block">SLA Status</span>
                <span class="font-extrabold uppercase text-amber-700">{{ activeTicket().slaStatus || 'On Track' }}</span>
              </div>
              <div>
                <span class="text-[10px] font-bold text-stone-400 uppercase block">First Response Due</span>
                <span class="font-bold text-stone-800">{{ activeTicket().firstResponseDueAt | date:'short' }}</span>
              </div>
              <div>
                <span class="text-[10px] font-bold text-stone-400 uppercase block">Resolution Due</span>
                <span class="font-bold text-stone-800">{{ activeTicket().resolutionDueAt | date:'short' }}</span>
              </div>
              <div>
                <span class="text-[10px] font-bold text-stone-400 uppercase block">Assigned Agent</span>
                <span class="font-bold text-stone-800">{{ activeTicket().assignedEmployee?.name || 'Unassigned' }}</span>
              </div>
            </div>

            <!-- Status Transition Control Bar -->
            <div class="flex gap-2 pt-2 border-t border-stone-100">
              <span class="text-xs font-bold text-stone-500 self-center">Change Status:</span>
              <button *ngFor="let st of ['In Progress', 'Waiting for Customer', 'Resolved', 'Closed']"
                      (click)="updateTicketStatus(st)"
                      [disabled]="activeTicket().status === st"
                      class="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-800 rounded-xl text-xs font-bold transition-all">
                {{ st }}
              </button>
            </div>

            <!-- Description -->
            <div class="space-y-1">
              <h4 class="text-xs font-extrabold uppercase text-stone-500">Ticket Description</h4>
              <div class="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-800 leading-relaxed font-medium">
                {{ activeTicket().description }}
              </div>
            </div>

            <!-- Comments Stream (Visual distinction: Internal vs Customer) -->
            <div class="space-y-3 pt-2">
              <h4 class="text-xs font-extrabold uppercase text-stone-500">Activity & Comments</h4>
              <div *ngFor="let c of activeTicket().comments" 
                   [class.bg-amber-50]="c.isInternal"
                   [class.border-amber-200]="c.isInternal"
                   [class.bg-stone-50]="!c.isInternal"
                   class="p-4 rounded-xl border border-stone-200 space-y-1 text-xs">
                <div class="flex justify-between items-center text-[10px] text-stone-500">
                  <span class="font-bold text-stone-900">{{ c.commentedBy?.name || 'User' }}</span>
                  <span *ngIf="c.isInternal" class="px-2 py-0.5 bg-amber-200 text-amber-900 font-extrabold rounded uppercase">INTERNAL NOTE</span>
                  <span>{{ c.createdAt | date:'short' }}</span>
                </div>
                <p class="text-stone-800 font-medium whitespace-pre-wrap">{{ c.comment }}</p>
              </div>
            </div>

            <!-- Add Comment Form -->
            <div class="pt-4 border-t border-stone-200 space-y-3">
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1.5 text-xs font-bold text-stone-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="ticketCommentIsInternal" class="rounded text-amber-600 focus:ring-amber-500">
                  <span>Add as Internal Note</span>
                </label>
              </div>
              <div class="flex gap-2">
                <textarea [(ngModel)]="ticketCommentText" rows="2" placeholder="Write comment or reply..." class="flex-1 p-3 border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-sans"></textarea>
                <button (click)="submitTicketComment()" [disabled]="!ticketCommentText" class="px-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all">
                  Post
                </button>
              </div>
            </div>

          </div>

          <div *ngIf="!activeTicket()" class="flex-1 flex items-center justify-center text-stone-400 text-xs">
            Select a ticket from the queue to view details.
          </div>
        </div>

      </div>

      <!-- VIEW 3: SLA & PRIORITY CONFIGURATION -->
      <div *ngIf="activeView() === 'sla'" class="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-6">
        <div>
          <h3 class="text-lg font-extrabold text-stone-900">SLA Targets & Priority Engine Configuration</h3>
          <p class="text-xs text-stone-500 mt-1">Configured response and resolution target times per ticket priority tier.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div *ngFor="let priority of ['Low', 'Medium', 'High', 'Urgent']" class="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
            <span [class.bg-rose-100]="priority === 'Urgent'" [class.text-rose-800]="priority === 'Urgent'"
                  [class.bg-amber-100]="priority === 'High'" [class.text-amber-800]="priority === 'High'"
                  class="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase">
              {{ priority }} Priority
            </span>
            <div class="space-y-1 text-xs text-stone-700">
              <div class="flex justify-between">
                <span>First Response:</span>
                <strong *ngIf="priority === 'Urgent'">1 hour</strong>
                <strong *ngIf="priority === 'High'">4 hours</strong>
                <strong *ngIf="priority === 'Medium'">24 hours</strong>
                <strong *ngIf="priority === 'Low'">48 hours</strong>
              </div>
              <div class="flex justify-between">
                <span>Resolution Target:</span>
                <strong *ngIf="priority === 'Urgent'">8 hours</strong>
                <strong *ngIf="priority === 'High'">24 hours</strong>
                <strong *ngIf="priority === 'Medium'">3 days</strong>
                <strong *ngIf="priority === 'Low'">7 days</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 4: SUPPORT ANALYTICS DASHBOARD -->
      <div *ngIf="activeView() === 'analytics'" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="bg-white p-6 border border-stone-200 rounded-2xl shadow-sm">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-stone-500">Open Tickets</span>
            <h2 class="text-3xl font-black text-stone-900 mt-2">{{ supportAnalytics()?.openTickets || 0 }}</h2>
          </div>
          <div class="bg-white p-6 border border-stone-200 rounded-2xl shadow-sm">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-rose-600">Urgent Tickets</span>
            <h2 class="text-3xl font-black text-rose-600 mt-2">{{ supportAnalytics()?.urgentTickets || 0 }}</h2>
          </div>
          <div class="bg-white p-6 border border-stone-200 rounded-2xl shadow-sm">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-amber-600">Tickets At Risk</span>
            <h2 class="text-3xl font-black text-amber-600 mt-2">{{ supportAnalytics()?.ticketsAtRisk || 0 }}</h2>
          </div>
          <div class="bg-white p-6 border border-stone-200 rounded-2xl shadow-sm">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-red-700">SLA Breaches</span>
            <h2 class="text-3xl font-black text-red-700 mt-2">{{ supportAnalytics()?.slaBreaches || 0 }}</h2>
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
  
  conversations = signal<any[]>([]);
  activeConversation = signal<any | null>(null);
  activeMessages = signal<any[]>([]);
  selectedChannelFilter = 'all';

  tickets = signal<any[]>([]);
  activeTicket = signal<any | null>(null);
  selectedTicketTab = 'All';

  supportAnalytics = signal<any | null>(null);

  replyText = '';
  replyIsInternal = false;

  ticketCommentText = '';
  ticketCommentIsInternal = false;

  openAddTicketModal = false;
  openCallLogModal = false;

  ngOnInit() {
    this.loadConversations();
    this.loadTickets();
    this.loadSupportAnalytics();
  }

  setView(v: 'inbox' | 'tickets' | 'sla' | 'analytics') {
    this.activeView.set(v);
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

  sendConversationMessage() {
    if (!this.replyText || !this.activeConversation()) return;
    const payload = { body: this.replyText, isInternal: this.replyIsInternal };
    this.apiService.postConversationMessage(this.activeConversation()._id, payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.replyText = '';
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

  updateTicketStatus(status: string) {
    if (!this.activeTicket()) return;
    this.apiService.updateTicket(this.activeTicket()._id, { status }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.selectTicket(res.data);
          this.loadTickets();
        }
      }
    });
  }

  submitTicketComment() {
    if (!this.ticketCommentText || !this.activeTicket()) return;
    const payload = { comment: this.ticketCommentText, isInternal: this.ticketCommentIsInternal };
    this.apiService.addTicketComment(this.activeTicket()._id, payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.ticketCommentText = '';
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
