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
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="flex items-center gap-4">
          <a routerLink="/sales/customers" class="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 flex items-center justify-center text-[#292524] shadow-sm">
            <span class="material-icons">arrow_back</span>
          </a>
          <div>
            <span class="text-xs text-sky-600 font-bold uppercase tracking-widest">Client Profile 360</span>
            <h1 class="text-2xl font-black text-slate-800 tracking-tight mt-0.5 flex items-center gap-3">
              <span>{{ customer360().customer.companyName }}</span>
              <span [ngClass]="{
                'bg-amber-100 text-amber-700 ring-2 ring-amber-500/25 border border-amber-500/30': customer360().customer.status === 'VIP',
                'bg-emerald-100 text-emerald-700': customer360().customer.status === 'Active',
                'bg-slate-100 text-slate-600': customer360().customer.status === 'Inactive'
              }" class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                {{ customer360().customer.status }}
              </span>
            </h1>
          </div>
        </div>

        <div class="flex gap-2">
          <button (click)="activeTab = 'financials'" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5">
            <span class="material-icons text-sm">receipt_long</span>
            <span>Commercial Hub</span>
          </button>
        </div>
      </div>

      <!-- Commercial Operating System Summary KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div class="flex justify-between items-start">
            <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Revenue</span>
            <span class="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg material-icons text-base">payments</span>
          </div>
          <p class="text-xl font-extrabold text-slate-900 mt-2">\${{ (customer360().commercialSummary?.totalRevenueGenerated || customer360().revenueGenerated || 0).toLocaleString() }}</p>
          <span class="text-[10px] text-emerald-600 font-bold mt-1 block">Lifetime Recorded Collections</span>
        </div>

        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div class="flex justify-between items-start">
            <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Outstanding Balance</span>
            <span class="p-1.5 bg-rose-50 text-rose-600 rounded-lg material-icons text-base">pending_actions</span>
          </div>
          <p class="text-xl font-extrabold text-rose-600 mt-2">\${{ (customer360().commercialSummary?.outstandingAmount || 0).toLocaleString() }}</p>
          <span class="text-[10px] text-slate-400 font-medium mt-1 block">{{ customer360().commercialSummary?.totalInvoices || 0 }} total invoices issued</span>
        </div>

        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div class="flex justify-between items-start">
            <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Proposals Won</span>
            <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg material-icons text-base">assignment_turned_in</span>
          </div>
          <p class="text-xl font-extrabold text-indigo-600 mt-2">{{ customer360().commercialSummary?.acceptedProposalsCount || 0 }} / {{ customer360().commercialSummary?.proposalsCount || 0 }}</p>
          <span class="text-[10px] text-indigo-500 font-medium mt-1 block">Accepted Sales Quotes</span>
        </div>

        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div class="flex justify-between items-start">
            <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Last Activity</span>
            <span class="p-1.5 bg-amber-50 text-amber-600 rounded-lg material-icons text-base">schedule</span>
          </div>
          <p class="text-sm font-bold text-slate-800 mt-3 truncate">{{ customer360().commercialSummary?.lastInteractionDate | date:'mediumDate' }}</p>
          <span class="text-[10px] text-slate-400 font-medium block">Recent interaction date</span>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Panel: Profile Info and Internal Actions -->
        <div class="lg:col-span-1 space-y-6">
          
          <!-- Corporate Card -->
          <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="font-bold text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-3">Corporate Profile</h3>
            
            <div class="space-y-3 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">Client Code:</span>
                <span class="font-bold text-slate-900">{{ customer360().customer.customerCode }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">Contact Person:</span>
                <span class="font-bold text-slate-900">{{ customer360().customer.contactPerson }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">Email:</span>
                <span class="font-medium text-sky-600">{{ customer360().customer.email }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">Phone:</span>
                <span class="font-medium text-slate-800">{{ customer360().customer.phone }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">Industry:</span>
                <span class="font-medium text-slate-800">{{ customer360().customer.industry }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">Representative:</span>
                <span class="font-bold text-slate-900">{{ customer360().customer.assignedEmployee ? customer360().customer.assignedEmployee.name : 'Unassigned' }}</span>
              </div>
            </div>
          </div>

          <!-- Add Note Section -->
          <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Write Internal Memo</h3>
            <textarea 
              [(ngModel)]="newNote" 
              placeholder="Type customer memo notes..." 
              rows="3" 
              class="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"></textarea>
            <button 
              (click)="addNote()" 
              [disabled]="!newNote.trim()"
              class="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold active:scale-95 transition-all">
              Post Note
            </button>
          </div>

          <!-- Log Call/Interaction Section -->
          <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Log Interaction</h3>
            
            <div class="flex gap-2">
              <button 
                *ngFor="let t of ['Call', 'Email', 'Meeting']" 
                (click)="selectedActivityType = t"
                [class.bg-sky-600]="selectedActivityType === t"
                [class.text-white]="selectedActivityType === t"
                [class.bg-slate-100]="selectedActivityType !== t"
                [class.text-slate-700]="selectedActivityType !== t"
                class="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-bold transition-all">
                {{ t }}
              </button>
            </div>

            <input 
              type="text" 
              [(ngModel)]="activityDesc" 
              placeholder="e.g., Discussed Q3 contract extension" 
              class="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900">
            
            <button 
              (click)="logActivity()" 
              [disabled]="!activityDesc.trim()"
              class="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition-all">
              Save Interaction
            </button>
          </div>

        </div>

        <!-- Right Panel: Tabs for Timeline & Commercial Hub -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- View Navigation Tabs -->
          <div class="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-4 gap-6">
            <button 
              (click)="activeTab = 'timeline'" 
              [class.border-sky-600]="activeTab === 'timeline'"
              [class.text-sky-600]="activeTab === 'timeline'"
              [class.border-transparent]="activeTab !== 'timeline'"
              [class.text-slate-500]="activeTab !== 'timeline'"
              class="pb-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2">
              <span class="material-icons text-sm">history</span>
              <span>Unified Timeline</span>
            </button>

            <button 
              (click)="activeTab = 'financials'" 
              [class.border-indigo-600]="activeTab === 'financials'"
              [class.text-indigo-600]="activeTab === 'financials'"
              [class.border-transparent]="activeTab !== 'financials'"
              [class.text-slate-500]="activeTab !== 'financials'"
              class="pb-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2">
              <span class="material-icons text-sm">receipt</span>
              <span>Proposals & Invoices</span>
            </button>
          </div>

          <!-- TAB 1: Unified Timeline Stream -->
          <div *ngIf="activeTab === 'timeline'" class="bg-white border border-slate-200/80 rounded-b-2xl p-6 shadow-sm space-y-6">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h3 class="font-bold text-xs text-slate-500 uppercase tracking-wider">Activity Feed</h3>
              <input type="text" [(ngModel)]="timelineSearch" placeholder="Search timeline..." class="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 w-full sm:w-48">
            </div>
            
            <div class="relative pl-6 border-l border-slate-200 space-y-8">
              <div *ngFor="let event of filteredTimeline()" class="relative">
                
                <span class="absolute -left-[35px] top-0 h-6.5 w-6.5 rounded-full border-2 border-white flex items-center justify-center text-white"
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

                <div class="space-y-1">
                  <div class="flex items-center justify-between gap-4">
                    <span class="font-bold text-xs text-slate-800 uppercase tracking-wide">{{ event.event }}</span>
                    <span class="text-[10px] text-slate-400 font-semibold">{{ event.date | date:'medium' }}</span>
                  </div>
                  <p class="text-xs text-slate-600 leading-normal">{{ event.description }}</p>
                </div>

              </div>
            </div>
          </div>

          <!-- TAB 2: Proposals & Invoices Hub -->
          <div *ngIf="activeTab === 'financials'" class="space-y-6">
            
            <!-- Proposals Table -->
            <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="font-extrabold text-xs text-slate-600 uppercase tracking-wider">Proposals & Quotations</h3>
                <a routerLink="/sales/proposals" class="text-xs text-indigo-600 font-bold hover:underline">+ New Proposal</a>
              </div>

              <div *ngIf="(customer360().proposals || []).length === 0" class="p-6 text-center text-slate-400 text-xs font-medium">
                No proposals generated for this account yet.
              </div>

              <div *ngIf="(customer360().proposals || []).length > 0" class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-100 text-xs">
                  <thead>
                    <tr class="text-left text-slate-400 font-bold uppercase tracking-wider">
                      <th class="pb-2">Name</th>
                      <th class="pb-2">Net Amount</th>
                      <th class="pb-2">Status</th>
                      <th class="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let prop of customer360().proposals">
                      <td class="py-3 font-bold text-slate-800">{{ prop.name }}</td>
                      <td class="py-3 font-bold text-slate-900">\${{ (prop.metadata?.netAmount || 0).toLocaleString() }}</td>
                      <td class="py-3">
                        <span [ngClass]="{
                          'bg-emerald-100 text-emerald-700': prop.status === 'Accepted' || prop.status === 'Approved',
                          'bg-sky-100 text-sky-700': prop.status === 'Sent',
                          'bg-rose-100 text-rose-700': prop.status === 'Rejected',
                          'bg-slate-100 text-slate-600': prop.status === 'Draft'
                        }" class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                          {{ prop.status }}
                        </span>
                      </td>
                      <td class="py-3 text-right space-x-2">
                        <button *ngIf="prop.status === 'Draft'" (click)="openSendProposalModal(prop)" class="text-sky-600 hover:text-sky-500 font-bold text-[11px] bg-sky-50 px-2.5 py-1 rounded-lg">Send via Email</button>
                        <button *ngIf="prop.status !== 'Accepted'" (click)="transitionDoc(prop._id, 'Accepted')" class="text-emerald-600 hover:text-emerald-500 font-bold text-[11px]">Accept & Invoice</button>
                        <button *ngIf="prop.status !== 'Rejected' && prop.status !== 'Accepted'" (click)="transitionDoc(prop._id, 'Rejected')" class="text-rose-500 hover:text-rose-400 font-bold text-[11px]">Reject</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Invoices Table -->
            <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="font-extrabold text-xs text-slate-600 uppercase tracking-wider">Invoices & Payment Records</h3>
              </div>

              <div *ngIf="(customer360().invoices || []).length === 0" class="p-6 text-center text-slate-400 text-xs font-medium">
                No invoices created for this account yet.
              </div>

              <div *ngIf="(customer360().invoices || []).length > 0" class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-100 text-xs">
                  <thead>
                    <tr class="text-left text-slate-400 font-bold uppercase tracking-wider">
                      <th class="pb-2">Invoice</th>
                      <th class="pb-2">Net Total</th>
                      <th class="pb-2">Paid</th>
                      <th class="pb-2">Balance Due</th>
                      <th class="pb-2">Status</th>
                      <th class="pb-2 text-right">Payment Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let inv of customer360().invoices">
                      <td class="py-3 font-bold text-slate-800">
                        {{ inv.name }}
                        <div class="text-[10px] text-slate-400 font-normal">{{ inv.documentNumber || 'INV-SYS' }}</div>
                      </td>
                      <td class="py-3 font-bold text-slate-900">\${{ (inv.metadata?.netAmount || 0).toLocaleString() }}</td>
                      <td class="py-3 font-semibold text-emerald-600">\${{ (inv.metadata?.amountPaid || 0).toLocaleString() }}</td>
                      <td class="py-3 font-bold text-rose-600">\${{ (inv.metadata?.amountDue !== undefined ? inv.metadata.amountDue : inv.metadata?.netAmount || 0).toLocaleString() }}</td>
                      <td class="py-3">
                        <span [ngClass]="{
                          'bg-emerald-100 text-emerald-700': inv.status === 'Paid',
                          'bg-amber-100 text-amber-700': inv.status === 'Partially_Paid',
                          'bg-sky-100 text-sky-700': inv.status === 'Sent',
                          'bg-slate-100 text-slate-600': inv.status === 'Draft'
                        }" class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                          {{ inv.status }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button 
                          *ngIf="inv.status !== 'Paid'" 
                          (click)="openPaymentModal(inv)" 
                          class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] shadow-sm transition-all">
                          Record Payment
                        </button>
                        <span *ngIf="inv.status === 'Paid'" class="text-emerald-600 font-bold text-[10px] flex items-center justify-end gap-1">
                          <span class="material-icons text-xs">check_circle</span> Paid in Full
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>

      <!-- Record Payment Modal -->
      <div *ngIf="paymentModalInvoice()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md space-y-5 animate-fadeIn text-slate-800">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <h3 class="text-sm font-extrabold text-slate-900">Record Customer Payment</h3>
              <p class="text-[11px] text-slate-500">Invoice: {{ paymentModalInvoice()?.name }}</p>
            </div>
            <button (click)="paymentModalInvoice.set(null)" class="text-slate-400 hover:text-slate-600"><span class="material-icons">close</span></button>
          </div>

          <div class="space-y-4 text-xs">
            <div class="bg-slate-50 p-3 rounded-xl flex justify-between items-center border border-slate-200">
              <span class="text-slate-500 font-medium">Outstanding Balance:</span>
              <span class="font-extrabold text-rose-600 text-sm">\${{ (paymentModalInvoice()?.metadata?.amountDue !== undefined ? paymentModalInvoice()?.metadata?.amountDue : paymentModalInvoice()?.metadata?.netAmount || 0).toLocaleString() }}</span>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Amount ($)</label>
              <input type="number" [(ngModel)]="paymentAmount" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900">
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
              <select [(ngModel)]="paymentMethod" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900">
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Stripe">Stripe</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transaction Ref / Cheque #</label>
              <input type="text" [(ngModel)]="paymentRef" placeholder="TXN-998823" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900">
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes</label>
              <input type="text" [(ngModel)]="paymentNotes" placeholder="Payment received via portal" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900">
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="paymentModalInvoice.set(null)" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-xs">Cancel</button>
            <button (click)="submitPayment()" [disabled]="!paymentAmount || paymentAmount <= 0" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-white rounded-xl font-bold text-xs shadow-md">Confirm Payment</button>
          </div>
        </div>
      </div>

      <!-- Modal: Send Proposal via Outbound Email with PDF Attachment -->
      <div *ngIf="sendProposalModalDoc()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div class="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
          <div class="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 class="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span class="material-icons text-sky-600">send</span>
              <span>Send Proposal PDF via Email</span>
            </h3>
            <button (click)="sendProposalModalDoc.set(null)" class="text-slate-400 hover:text-slate-600">
              <span class="material-icons text-sm">close</span>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Recipient Email Address</label>
              <input type="email" [(ngModel)]="sendProposalEmailAddr" placeholder="client@company.com" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-sky-500">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Recipient Name</label>
              <input type="text" [(ngModel)]="sendProposalRecipientName" placeholder="Client Contact Name" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subject</label>
              <input type="text" [(ngModel)]="sendProposalSubject" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Message Body</label>
              <textarea [(ngModel)]="sendProposalMessage" rows="3" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-900"></textarea>
            </div>
            <div class="bg-sky-50 p-3 rounded-xl border border-sky-100 text-[11px] text-sky-800 font-semibold flex items-center gap-2">
              <span class="material-icons text-sm text-sky-600">picture_as_pdf</span>
              <span>Official PDF Document will be generated and attached automatically.</span>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="sendProposalModalDoc.set(null)" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-xs">Cancel</button>
            <button (click)="submitSendProposal()" [disabled]="!sendProposalEmailAddr || sendProposalLoading" class="flex-1 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 text-white rounded-xl font-bold text-xs shadow-md">
              {{ sendProposalLoading ? 'Delivering...' : 'Send Proposal Email' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class Customer360Component implements OnInit {
  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);

  customer360 = signal<any | null>(null);
  newNote = '';
  selectedActivityType = 'Call';
  activityDesc = '';
  activeTab = 'timeline';

  // Payment modal state
  paymentModalInvoice = signal<any | null>(null);
  paymentAmount = 0;
  paymentMethod = 'Bank Transfer';
  paymentRef = '';
  paymentNotes = '';

  // Send proposal modal state
  sendProposalModalDoc = signal<any | null>(null);
  sendProposalEmailAddr = '';
  sendProposalRecipientName = '';
  sendProposalSubject = '';
  sendProposalMessage = '';
  sendProposalLoading = false;

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

  transitionDoc(docId: string, targetStatus: string) {
    this.apiService.transitionDocument(docId, targetStatus).subscribe({
      next: () => {
        const customerId = this.customer360().customer._id;
        this.load360(customerId);
      }
    });
  }

  openPaymentModal(invoice: any) {
    this.paymentModalInvoice.set(invoice);
    const due = invoice.metadata?.amountDue !== undefined ? invoice.metadata.amountDue : invoice.metadata?.netAmount || 0;
    this.paymentAmount = due;
    this.paymentMethod = 'Bank Transfer';
    this.paymentRef = '';
    this.paymentNotes = '';
  }

  submitPayment() {
    const inv = this.paymentModalInvoice();
    if (!inv || !this.paymentAmount) return;

    const payload = {
      amount: this.paymentAmount,
      paymentMethod: this.paymentMethod,
      transactionRef: this.paymentRef,
      notes: this.paymentNotes
    };

    this.apiService.recordInvoicePayment(inv._id, payload).subscribe({
      next: () => {
        this.paymentModalInvoice.set(null);
        const customerId = this.customer360().customer._id;
        this.load360(customerId);
      }
    });
  }

  openSendProposalModal(prop: any) {
    this.sendProposalModalDoc.set(prop);
    const cust = this.customer360()?.customer || {};
    this.sendProposalEmailAddr = cust.email || '';
    this.sendProposalRecipientName = cust.contactPerson || cust.companyName || '';
    this.sendProposalSubject = `Proposal: ${prop.name}`;
    this.sendProposalMessage = `Please find attached our official sales proposal (${prop.name}) for your review.`;
    this.sendProposalLoading = false;
  }

  submitSendProposal() {
    const prop = this.sendProposalModalDoc();
    if (!prop || !this.sendProposalEmailAddr) return;

    this.sendProposalLoading = true;
    const payload = {
      recipientEmail: this.sendProposalEmailAddr,
      recipientName: this.sendProposalRecipientName,
      subject: this.sendProposalSubject,
      message: this.sendProposalMessage
    };

    this.apiService.sendProposalEmail(prop._id, payload).subscribe({
      next: (res) => {
        this.sendProposalLoading = false;
        this.sendProposalModalDoc.set(null);
        const customerId = this.customer360().customer._id;
        this.load360(customerId);
      },
      error: (err) => {
        this.sendProposalLoading = false;
        alert(`Proposal email delivery failed: ${err.error?.error || err.message}`);
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
