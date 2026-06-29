import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

export interface TicketModel {
  _id: string;
  ticketCode: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  customer: {
    _id: string;
    companyName: string;
    contactPerson: string;
  };
  assignedEmployee?: {
    _id: string;
    name: string;
  };
  comments: Array<{
    comment: string;
    commentedBy: {
      name: string;
      role: string;
    };
    createdAt: Date;
  }>;
  createdAt: Date;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-[80vh] flex flex-col md:flex-row gap-6 text-slate-800 dark:text-slate-100">
      
      <!-- Left Panel: Ticket List -->
      <div class="w-full md:w-[35%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        
        <!-- Search and log ticket -->
        <div class="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm text-slate-700 dark:text-white uppercase tracking-wider">Support Queue</h3>
            <button (click)="openAddModal()" class="py-1 px-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-600/10 active:scale-95 transition-all flex items-center gap-1">
              <span class="material-icons text-xs">add</span>
              <span>Open Ticket</span>
            </button>
          </div>
          
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (input)="loadTickets()"
            placeholder="Search tickets..." 
            class="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white">
        </div>

        <!-- Ticket Filter Tabs -->
        <div class="flex border-b border-slate-100 dark:border-slate-700/60 text-xs">
          <button 
            *ngFor="let tab of ['All', 'Open', 'In Progress', 'Resolved']"
            (click)="selectedTab = tab; loadTickets()"
            [class.border-sky-500]="selectedTab === tab"
            [class.text-sky-500]="selectedTab === tab"
            [class.font-bold]="selectedTab === tab"
            class="flex-1 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all text-center">
            {{ tab }}
          </button>
        </div>

        <!-- Tickets Scroll Queue -->
        <div class="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 scrollbar-thin">
          <div *ngIf="tickets().length === 0" class="p-8 text-center text-slate-400 text-xs">
            No tickets in this queue.
          </div>

          <div 
            *ngFor="let t of tickets()"
            (click)="selectTicket(t)"
            [class.bg-sky-500/5]="activeTicket()?._id === t._id"
            [class.border-l-4]="activeTicket()?._id === t._id"
            [class.border-sky-500]="activeTicket()?._id === t._id"
            class="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 cursor-pointer transition-all space-y-2.5">
            
            <div class="flex justify-between items-start">
              <span class="font-bold text-xs text-sky-500">{{ t.ticketCode }}</span>
              <span class="text-[9px] text-slate-400 font-semibold">{{ t.createdAt | date:'shortDate' }}</span>
            </div>

            <h4 class="font-bold text-xs text-slate-800 dark:text-white truncate">{{ t.title }}</h4>
            
            <div class="flex justify-between items-center text-[10px]">
              <span class="font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{{ t.customer?.companyName }}</span>
              
              <div class="flex gap-1.5 shrink-0">
                <span [ngClass]="{
                  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400': t.priority === 'Critical',
                  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400': t.priority === 'High',
                  'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400': t.priority === 'Medium',
                  'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400': t.priority === 'Low'
                }" class="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                  {{ t.priority }}
                </span>
                <span [ngClass]="{
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400': t.status === 'Resolved' || t.status === 'Closed',
                  'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400': t.status === 'In Progress',
                  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400': t.status === 'Assigned',
                  'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400': t.status === 'Open'
                }" class="px-1.5 py-0.5 rounded text-[8px] font-semibold">
                  {{ t.status }}
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- Right Panel: Active Ticket Conversation Details -->
      <div class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        
        <!-- Header detail -->
        <div *ngIf="activeTicket() as ticket" class="flex-grow flex flex-col overflow-hidden">
          <div class="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-slate-800 dark:text-white text-sm">{{ ticket.ticketCode }}</span>
                <span class="text-xs text-slate-400 font-semibold px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800 rounded-lg capitalize">{{ ticket.category }}</span>
              </div>
              <h2 class="font-bold text-xs text-slate-50 mt-1">Client: <b class="text-slate-700 dark:text-slate-300 font-semibold">{{ ticket.customer?.companyName }} ({{ ticket.customer?.contactPerson }})</b></h2>
            </div>

            <!-- Assignment & Status select -->
            <div class="flex items-center gap-3">
              <div *ngIf="canModify()" class="flex items-center gap-1.5 text-xs">
                <span class="text-slate-400 font-medium">Status:</span>
                <select 
                  [(ngModel)]="ticket.status" 
                  (change)="updateTicketStatus()"
                  class="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none">
                  <option value="Open">Open</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div *ngIf="canModify()" class="flex items-center gap-1.5 text-xs">
                <span class="text-slate-400 font-medium">Owner:</span>
                <select 
                  [(ngModel)]="assignedStaffId" 
                  (change)="updateTicketAssignment()"
                  class="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none max-w-[120px]">
                  <option value="">Unassigned</option>
                  <option *ngFor="let emp of staffList()" [value]="emp._id">{{ emp.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Thread & Discussion -->
          <div class="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-thin">
            
            <!-- Original Description Box -->
            <div class="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700 rounded-2xl space-y-2">
              <div class="flex justify-between items-center text-[10px] text-slate-400">
                <span class="font-bold uppercase tracking-wider">Description of Issue</span>
                <span>Opened {{ ticket.createdAt | date:'medium' }}</span>
              </div>
              <h3 class="font-bold text-xs text-slate-800 dark:text-white">{{ ticket.title }}</h3>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words whitespace-pre-line">{{ ticket.description }}</p>
            </div>

            <!-- Comments Feed -->
            <div class="space-y-3">
              <h4 class="font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-1 mb-2">Discussion Thread</h4>
              
              <div *ngIf="ticket.comments.length === 0" class="text-center py-6 text-slate-400 text-xs">
                No replies yet. Use editor below to comment.
              </div>

              <!-- Comment bubble -->
              <div 
                *ngFor="let comment of ticket.comments"
                [class.justify-end]="comment.commentedBy.role === 'customer'"
                class="flex gap-3">
                
                <div 
                  [class.bg-sky-50]="comment.commentedBy.role !== 'customer'"
                  [class.dark:bg-sky-950/20]="comment.commentedBy.role !== 'customer'"
                  [class.border-sky-500/10]="comment.commentedBy.role !== 'customer'"
                  [class.bg-slate-50]="comment.commentedBy.role === 'customer'"
                  [class.dark:bg-slate-900/60]="comment.commentedBy.role === 'customer'"
                  class="max-w-[80%] p-3.5 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl text-xs space-y-1">
                  <div class="flex justify-between items-center gap-6 font-semibold text-[10px] text-slate-400">
                    <span class="font-bold text-slate-600 dark:text-slate-300">{{ comment.commentedBy.name }} ({{ comment.commentedBy.role.replace('_', ' ') }})</span>
                    <span>{{ comment.createdAt | date:'shortTime' }}</span>
                  </div>
                  <p class="text-slate-700 dark:text-slate-200 mt-1 leading-normal break-words whitespace-pre-line">{{ comment.comment }}</p>
                </div>

              </div>
            </div>
          </div>

          <!-- AI Assistant & Comment Input Box -->
          <div class="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 space-y-3">
            
            <!-- AI suggestions trigger -->
            <div *ngIf="canModify()" class="space-y-2">
              <button 
                (click)="consultAIAssistant()" 
                [disabled]="isAILoading()"
                class="inline-flex items-center gap-1.5 py-1 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all">
                <span class="material-icons text-sm">{{ isAILoading() ? 'hourglass_bottom' : 'psychology' }}</span>
                <span>{{ isAILoading() ? 'Consulting AI...' : 'Consult AI Copilot Suggestions' }}</span>
              </button>

              <!-- Clickable suggestions cards -->
              <div *ngIf="aiSuggestions().length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                <div 
                  *ngFor="let sug of aiSuggestions(); let idx = index"
                  (click)="applySuggestion(sug)"
                  class="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 rounded-xl cursor-pointer text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 hover:shadow-sm transition-all max-h-24 overflow-y-auto whitespace-pre-line">
                  <div class="font-bold text-sky-500 mb-1">Option {{ idx + 1 }} (Click to apply)</div>
                  {{ sug }}
                </div>
              </div>
            </div>

            <!-- Text Area and Send -->
            <div class="flex gap-3 items-end">
              <textarea 
                [(ngModel)]="newComment" 
                placeholder="Write response comment..." 
                rows="2" 
                class="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"></textarea>
              <button 
                (click)="postComment()" 
                [disabled]="!newComment.trim()"
                class="py-2.5 px-4 bg-slate-900 hover:bg-slate-900 dark:bg-sky-600 dark:hover:bg-sky-500 disabled:bg-slate-300 disabled:text-slate-400 dark:disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center">
                <span class="material-icons text-sm">send</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!activeTicket()" class="flex-grow flex flex-col items-center justify-center text-slate-400 p-8 space-y-4">
          <span class="material-icons text-6xl text-slate-300 dark:text-slate-700">confirmation_number</span>
          <div class="text-center">
            <h4 class="font-bold text-slate-800 dark:text-slate-300 text-sm">No ticket selected</h4>
            <p class="text-xs mt-1">Pick a support ticket from the queue or log a new inquiry.</p>
          </div>
        </div>

      </div>

      <!-- Add Ticket Modal Overlay -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 class="text-base font-bold text-slate-800 dark:text-white">Open Support Ticket</h3>
            <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-icons">close</span></button>
          </div>
          <form class="space-y-4 text-xs text-slate-700 dark:text-slate-200">
            <div>
              <label class="block font-semibold uppercase tracking-wider text-slate-400">Ticket Title</label>
              <input type="text" [(ngModel)]="newTicketForm.title" name="title" placeholder="e.g. Account activation failure" class="modal-input">
            </div>
            <div>
              <label class="block font-semibold uppercase tracking-wider text-slate-400">Description of Issue</label>
              <textarea [(ngModel)]="newTicketForm.description" name="description" placeholder="Provide detailed steps or error codes..." rows="4" class="modal-input"></textarea>
            </div>
            
            <!-- Customer Selector (Admins/staff only, customers bypass this and link automatically) -->
            <div *ngIf="canModify()">
              <label class="block font-semibold uppercase tracking-wider text-slate-400">Client Customer Account</label>
              <select [(ngModel)]="newTicketForm.customerId" name="customerId" class="modal-input">
                <option *ngFor="let cust of clientList()" [value]="cust._id">{{ cust.companyName }}</option>
              </select>
            </div>
          </form>
          <div class="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button (click)="closeModal()" class="flex-1 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-bold">Cancel</button>
            <button (click)="submitTicket()" class="flex-1 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-white font-bold">Submit Ticket</button>
          </div>
        </div>
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
    .bg-sky-600 {
      background-color: #0ea5e9;
    }
  `]
})
export class TicketsComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);

  tickets = signal<TicketModel[]>([]);
  activeTicket = signal<TicketModel | null>(null);
  staffList = signal<any[]>([]);
  clientList = signal<any[]>([]);
  
  searchQuery = '';
  selectedTab = 'All';
  assignedStaffId = '';
  newComment = '';
  newNote = '';

  isModalOpen = signal(false);
  isAILoading = signal(false);
  aiSuggestions = signal<string[]>([]);

  newTicketForm = {
    title: '',
    description: '',
    customerId: ''
  };

  // RxJS Socket Subscriptions
  private socketNotifSub!: Subscription;
  private socketTicketSub!: Subscription;
  private socketCommentSub!: Subscription;

  ngOnInit() {
    this.loadTickets();
    if (this.canModify()) {
      this.loadStaff();
      this.loadClients();
    }

    // Subscribe to Socket.IO real-time support notifications!
    this.socketTicketSub = this.socketService.onTicketCreated.subscribe(() => {
      this.loadTickets(); // reload list
    });

    this.socketService.onTicketUpdated.subscribe(ticket => {
      // If active ticket is updated, sync details
      if (this.activeTicket() && this.activeTicket()?._id === ticket._id) {
        this.activeTicket.set(ticket);
        this.assignedStaffId = ticket.assignedEmployee ? ticket.assignedEmployee._id : '';
      }
      // Reload the listing
      this.loadTickets();
    });

    this.socketCommentSub = this.socketService.onCommentAdded.subscribe((commentData) => {
      const active = this.activeTicket();
      if (active && active._id === commentData.ticketId) {
        // Append the new comment to the active thread locally, immediately!
        active.comments.push(commentData.comment);
        // Trigger scroll update
      }
    });
  }

  ngOnDestroy() {
    if (this.socketTicketSub) this.socketTicketSub.unsubscribe();
    if (this.socketCommentSub) this.socketCommentSub.unsubscribe();
    
    // Clean up ticket room subscription
    if (this.activeTicket()) {
      this.socketService.leaveTicket(this.activeTicket()?._id || '');
    }
  }

  loadTickets() {
    const filters: any = {
      search: this.searchQuery
    };
    if (this.selectedTab !== 'All') {
      filters.status = this.selectedTab;
    }

    this.apiService.getTickets(filters).subscribe({
      next: (res) => {
        if (res.success) {
          this.tickets.set(res.data);
        }
      }
    });
  }

  loadStaff() {
    this.apiService.getEmployees().subscribe({
      next: (res) => {
        if (res.success) {
          this.staffList.set(res.data);
        }
      }
    });
  }

  loadClients() {
    this.apiService.getCustomers().subscribe({
      next: (res) => {
        if (res.success) {
          this.clientList.set(res.data);
        }
      }
    });
  }

  selectTicket(ticket: TicketModel) {
    // Leave previous room if any
    if (this.activeTicket()) {
      this.socketService.leaveTicket(this.activeTicket()?._id || '');
    }

    this.activeTicket.set(ticket);
    this.assignedStaffId = ticket.assignedEmployee ? ticket.assignedEmployee._id : '';
    this.aiSuggestions.set([]); // clear previous AI results

    // Join new ticket room for Socket.IO threads
    this.socketService.joinTicket(ticket._id);
  }

  postComment() {
    if (!this.newComment.trim() || !this.activeTicket()) return;
    const ticketId = this.activeTicket()?._id || '';

    this.apiService.addTicketComment(ticketId, this.newComment).subscribe({
      next: () => {
        this.newComment = '';
        // Note: Socket comment handler takes care of local append, but we reload list too
        this.loadTickets();
      }
    });
  }

  updateTicketStatus() {
    if (!this.activeTicket()) return;
    const ticketId = this.activeTicket()?._id || '';
    
    this.apiService.updateTicket(ticketId, { status: this.activeTicket()?.status }).subscribe({
      next: () => this.loadTickets()
    });
  }

  updateTicketAssignment() {
    if (!this.activeTicket()) return;
    const ticketId = this.activeTicket()?._id || '';

    this.apiService.updateTicket(ticketId, { assignedEmployee: this.assignedStaffId || null }).subscribe({
      next: () => this.loadTickets()
    });
  }

  consultAIAssistant() {
    if (!this.activeTicket()) return;
    this.isAILoading.set(true);
    this.aiSuggestions.set([]);

    this.apiService.getTicketAISuggestions(this.activeTicket()?._id || '').subscribe({
      next: (res) => {
        this.isAILoading.set(false);
        if (res.success) {
          this.aiSuggestions.set(res.data);
        }
      },
      error: () => this.isAILoading.set(false)
    });
  }

  applySuggestion(sug: string) {
    this.newComment = sug;
  }

  openAddModal() {
    this.newTicketForm = {
      title: '',
      description: '',
      customerId: this.clientList().length > 0 ? this.clientList()[0]._id : ''
    };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  submitTicket() {
    this.apiService.createTicket(this.newTicketForm).subscribe({
      next: () => {
        this.loadTickets();
        this.closeModal();
      }
    });
  }

  canModify(): boolean {
    return this.authService.hasRole(['super_admin', 'manager', 'employee']);
  }
}
