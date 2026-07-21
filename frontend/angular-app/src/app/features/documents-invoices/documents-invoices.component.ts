import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

@Component({
  selector: 'app-documents-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 text-[#1c1917] tracking-tight">Quotations & Invoicing</h1>
          <p class="text-sm text-[#574c43] mt-1">Generate service agreements, calculate line item tax rates, and export PDF proposals.</p>
        </div>
        
        <div class="flex gap-2">
          <button (click)="openCreateModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5">
            <span class="material-icons text-sm">post_add</span> Create Document
          </button>
        </div>
      </div>

      <!-- Main Directory list -->
      <div *ngIf="activeView() === 'list'" class="bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 rounded-2xl shadow-sm p-6 overflow-hidden animate-fadeIn">
        <h4 class="font-extrabold text-xs text-[#44403c] uppercase tracking-widest mb-4">Contracts & Agreements</h4>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            <thead>
              <tr class="text-left text-slate-455 font-bold uppercase tracking-wider">
                <th class="pb-3">Document Name</th>
                <th class="pb-3">Type</th>
                <th class="pb-3">Linked Customer</th>
                <th class="pb-3">Net Amount</th>
                <th class="pb-3">Version</th>
                <th class="pb-3">Status</th>
                <th class="pb-3">Drive Sync</th>
                <th class="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
              <tr *ngFor="let doc of documents()" class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td class="py-4">
                  <span class="font-bold text-slate-800 text-[#1c1917] text-sm cursor-pointer hover:text-indigo-500" (click)="openDocumentDetails(doc)">
                    {{ doc.name }}
                  </span>
                </td>
                <td class="py-4 uppercase text-[10px] text-[#292524]">{{ doc.type }}</td>
                <td class="py-4 text-[#44403c]">{{ doc.customer?.companyName || 'Lead Account' }}</td>
                <td class="py-4 font-bold text-slate-800 text-[#1c1917]">\${{ doc.metadata?.netAmount?.toLocaleString() }}</td>
                <td class="py-4 text-[#44403c]">v{{ doc.version }}</td>
                <td class="py-4">
                  <span [ngClass]="{
                    'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400': doc.status === 'Paid' || doc.status === 'Approved',
                    'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400': doc.status === 'Sent',
                    'bg-slate-100 text-[#292524]': doc.status === 'Draft'
                  }" class="px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase">
                    {{ doc.status }}
                  </span>
                </td>
                <td class="py-4">
                  <span *ngIf="doc.googleDriveLinked" class="text-emerald-400 font-bold flex items-center gap-1">
                    <span class="material-icons text-xs">cloud_done</span> Synced
                  </span>
                  <span *ngIf="!doc.googleDriveLinked" class="text-[#44403c] flex items-center gap-1">
                    <span class="material-icons text-xs">cloud_off</span> Offline
                  </span>
                </td>
                <td class="py-4">
                  <a [href]="getPdfDownloadUrl(doc._id)" download class="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors uppercase">
                    PDF Slips
                  </a>
                </td>
              </tr>
              <tr *ngIf="documents().length === 0">
                <td colspan="8" class="text-center py-12 text-[#44403c] font-semibold">No agreements designed yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- View: Document builder / editor -->
      <div *ngIf="activeView() === 'builder'" class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
        
        <!-- Left Panel: Line Items Form -->
        <div class="lg:col-span-8 bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm space-y-6 text-xs">
          <div class="flex justify-between items-center border-b pb-4">
            <h3 class="text-sm font-extrabold text-slate-800 text-[#1c1917]">New Agreement Proposals</h3>
            <button (click)="setView('list')" class="text-[#44403c] hover:text-slate-600"><span class="material-icons text-sm">close</span></button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Document Title</label>
              <input type="text" [(ngModel)]="newDocName" placeholder="GrownX Service SLA" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Document Type</label>
              <select [(ngModel)]="newDocType" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
                <option value="Proposal">Sales Proposal</option>
                <option value="Invoice">Invoice slip</option>
                <option value="Contract">SLA Contract</option>
                <option value="Agreement">Service Agreement</option>
              </select>
            </div>
          </div>

          <!-- Customer selector -->
          <div>
            <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Select Customer Account</label>
            <select [(ngModel)]="selectedCustomerId" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
              <option value="">-- Choose Account Link --</option>
              <option *ngFor="let cust of customers()" [value]="cust._id">{{ cust.companyName }} ({{ cust.contactPerson }})</option>
            </select>
          </div>

          <!-- Dynamic Line Items list -->
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <p class="font-extrabold text-[10px] uppercase tracking-wider text-[#44403c]">Line Items</p>
              <button (click)="addLineItem()" class="text-indigo-500 hover:text-indigo-400 font-bold flex items-center gap-1">
                <span class="material-icons text-xs">add</span> Add Item
              </button>
            </div>

            <div *ngFor="let item of lineItems(); let idx = index" class="grid grid-cols-12 gap-3 items-center">
              <div class="col-span-6">
                <input type="text" [(ngModel)]="item.description" placeholder="Consulting Services" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
              </div>
              <div class="col-span-2">
                <input type="number" [(ngModel)]="item.quantity" (change)="calculateFinancials()" placeholder="1" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
              </div>
              <div class="col-span-3">
                <input type="number" [(ngModel)]="item.unitPrice" (change)="calculateFinancials()" placeholder="150" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
              </div>
              <div class="col-span-1 text-center">
                <button (click)="removeLineItem(idx)" class="text-rose-500"><span class="material-icons text-sm">delete</span></button>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-4">
            <button (click)="saveDocument()" [disabled]="!newDocName || lineItems().length === 0" class="bg-indigo-600 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg transition-all">
              Generate PDF Proposal
            </button>
          </div>

        </div>

        <!-- Right Panel: Tax and Discounts math preview -->
        <div class="lg:col-span-4 bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm space-y-6 text-xs font-semibold text-[#574c43]">
          <h4 class="font-extrabold text-sm text-slate-755 text-[#1c1917] uppercase tracking-wider">Financial Calculations</h4>
          
          <div class="space-y-4">
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Tax Rate (%)</label>
              <input type="number" [(ngModel)]="taxRate" (change)="calculateFinancials()" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
            </div>
            
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Discount Rate (%)</label>
              <input type="number" [(ngModel)]="discountRate" (change)="calculateFinancials()" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
            </div>

            <div class="border-t border-slate-100 border-[#e7e5e4] pt-4 space-y-2.5">
              <div class="flex justify-between">
                <span>Subtotal:</span>
                <span class="text-slate-900 text-[#1c1917]">\${{ subtotal }}</span>
              </div>
              <div class="flex justify-between text-rose-500">
                <span>Discount Amount:</span>
                <span>-\${{ discountAmount }}</span>
              </div>
              <div class="flex justify-between">
                <span>Tax Amount:</span>
                <span>\${{ taxAmount }}</span>
              </div>
              <div class="flex justify-between pt-2 border-t border-[#e7e5e4] font-bold text-slate-800 text-[#1c1917] text-sm">
                <span>Net Amount:</span>
                <span class="text-emerald-500">\${{ netAmount }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Modal: Document Details View (Version, signature, AI summaries) -->
      <div *ngIf="selectedDoc()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white bg-white border border-[#e7e5e4] p-6 rounded-2xl w-full max-w-lg space-y-6 text-xs animate-fadeIn text-[#44403c] flex flex-col h-[500px]">
          
          <div class="flex justify-between items-center border-b pb-3 shrink-0">
            <div>
              <h3 class="text-sm font-extrabold text-slate-800 text-[#1c1917]">{{ selectedDoc().name }}</h3>
              <p class="text-[10px] text-[#44403c] mt-0.5">Version: v{{ selectedDoc().version }} • Status: {{ selectedDoc().status }}</p>
            </div>
            <button (click)="selectedDoc.set(null)" class="text-[#44403c] hover:text-slate-655">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto space-y-6 pr-2">
            
            <!-- AI Summary (Module P proposal generation helper) -->
            <div class="space-y-2 bg-gradient-to-r from-indigo-950 to-slate-900 p-4 rounded-xl border border-indigo-500/25">
              <div class="flex justify-between items-center">
                <span class="text-[10px] font-black uppercase text-indigo-400 tracking-wider">AI Document Digest</span>
                <button (click)="runAiSummary()" class="text-[9px] font-black uppercase bg-indigo-500 text-white px-2.5 py-1 rounded-md">Ask AI Digest</button>
              </div>
              <p class="text-xs text-[#1c1917] leading-relaxed font-semibold">
                {{ selectedDoc().metadata?.aiSummary || 'Click Ask AI Digest to generate automatic executive summaries of line items and contracts.' }}
              </p>
            </div>

            <!-- Line Items Table -->
            <div class="space-y-3">
              <p class="text-[10px] font-black uppercase text-[#44403c]">Line items details</p>
              <div class="space-y-2">
                <div *ngFor="let item of selectedDoc().metadata?.lineItems" class="flex justify-between bg-slate-50 bg-white p-3 rounded-lg">
                  <span>{{ item.description }} (Qty {{ item.quantity }})</span>
                  <strong class="text-slate-800 text-[#1c1917]">\${{ item.total }}</strong>
                </div>
              </div>
            </div>

            <!-- Signatures -->
            <div class="space-y-3">
              <p class="text-[10px] font-black uppercase text-[#44403c]">E-Signature Capture</p>
              
              <div *ngIf="selectedDoc().metadata?.signaturePng" class="border border-[#e7e5e4]/60 p-4 rounded-xl flex justify-center bg-slate-50 bg-white">
                <span class="material-icons text-emerald-400 text-4xl">verified</span>
                <span class="text-xs font-bold text-[#574c43] mt-2 ml-2">Signed Digitally via GrownX Portal</span>
              </div>
              
              <div *ngIf="!selectedDoc().metadata?.signaturePng" class="space-y-2">
                <p class="text-[10px] text-[#44403c]">Simulate signing this proposal agreement digitally.</p>
                <button (click)="applySignature()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-md">
                  Stamp Signature
                </button>
              </div>
            </div>

          </div>

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
export class DocumentsInvoicesComponent implements OnInit {
  private apiService = inject(ApiService);

  documents = signal<any[]>([]);
  customers = signal<any[]>([]);
  activeView = signal<string>('list'); // 'list' or 'builder'

  // Document builder state
  newDocName = '';
  newDocType = 'Proposal';
  selectedCustomerId = '';
  lineItems = signal<LineItem[]>([]);
  taxRate = 5;
  discountRate = 0;

  // Math totals
  subtotal = 0;
  discountAmount = 0;
  taxAmount = 0;
  netAmount = 0;

  // Modal details
  selectedDoc = signal<any | null>(null);

  ngOnInit() {
    this.loadDocuments();
    this.loadCustomers();
  }

  setView(view: string) {
    this.activeView.set(view);
  }

  loadDocuments() {
    this.apiService.getDocuments().subscribe({
      next: (res) => {
        if (res.success) this.documents.set(res.data);
      }
    });
  }

  loadCustomers() {
    this.apiService.getCustomers().subscribe({
      next: (res) => {
        if (res.success) this.customers.set(res.data);
      }
    });
  }

  openCreateModal() {
    this.newDocName = '';
    this.newDocType = 'Proposal';
    this.selectedCustomerId = '';
    this.lineItems.set([
      { description: 'GrownX Enterprise Licensing (Annual)', quantity: 12, unitPrice: 49, total: 588 }
    ]);
    this.taxRate = 5;
    this.discountRate = 0;
    this.calculateFinancials();
    this.setView('builder');
  }

  addLineItem() {
    this.lineItems.set([
      ...this.lineItems(),
      { description: 'Consulting Support Hours', quantity: 10, unitPrice: 150, total: 1500 }
    ]);
    this.calculateFinancials();
  }

  removeLineItem(idx: number) {
    const cur = this.lineItems();
    cur.splice(idx, 1);
    this.lineItems.set([...cur]);
    this.calculateFinancials();
  }

  calculateFinancials() {
    let sub = 0;
    this.lineItems().forEach(item => {
      item.total = item.quantity * item.unitPrice;
      sub += item.total;
    });

    this.subtotal = sub;
    this.discountAmount = parseFloat(((sub * this.discountRate) / 100).toFixed(2));
    const subAfterDisc = sub - this.discountAmount;
    this.taxAmount = parseFloat(((subAfterDisc * this.taxRate) / 100).toFixed(2));
    this.netAmount = parseFloat((subAfterDisc + this.taxAmount).toFixed(2));
  }

  saveDocument() {
    const payload = {
      name: this.newDocName,
      type: this.newDocType,
      customerId: this.selectedCustomerId || undefined,
      metadata: {
        lineItems: this.lineItems(),
        taxRate: this.taxRate,
        discountRate: this.discountRate,
      }
    };

    this.apiService.createDocument(payload).subscribe({
      next: (res) => {
        this.loadDocuments();
        this.setView('list');
      }
    });
  }

  getPdfDownloadUrl(id: string): string {
    return this.apiService.getDocumentPdfDownloadUrl(id);
  }

  openDocumentDetails(doc: any) {
    this.selectedDoc.set(doc);
  }

  runAiSummary() {
    const doc = this.selectedDoc();
    if (!doc) return;

    const transcript = `Review this document titled ${doc.name}. Line items amount to a total net revenue value of $${doc.metadata.netAmount}. Budget and taxes are configured.`;
    this.apiService.analyzeMeetingTranscript(transcript).subscribe({
      next: (res) => {
        if (res.success) {
          const updatedDoc = {
            ...doc,
            metadata: {
              ...doc.metadata,
              aiSummary: `AI Summary: ${res.data.summary}. Key Decision: ${res.data.keyDecisions[0]}`
            }
          };
          this.apiService.updateDocument(doc._id, updatedDoc).subscribe({
            next: (saveRes) => {
              if (saveRes.success) {
                this.selectedDoc.set(saveRes.data);
                this.loadDocuments();
              }
            }
          });
        }
      }
    });
  }

  applySignature() {
    const doc = this.selectedDoc();
    if (!doc) return;

    const updatedDoc = {
      ...doc,
      status: 'Approved',
      metadata: {
        ...doc.metadata,
        signaturePng: 'signed_base64_hash_string'
      }
    };

    this.apiService.updateDocument(doc._id, updatedDoc).subscribe({
      next: (res) => {
        if (res.success) {
          this.selectedDoc.set(res.data);
          this.loadDocuments();
        }
      }
    });
  }
}
