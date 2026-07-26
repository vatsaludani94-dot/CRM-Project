import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
}

interface EmailSequence {
  name: string;
  steps: { delayDays: number; subject: string; body: string }[];
}

@Component({
  selector: 'app-email-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Gmail Center</h1>
          <p class="text-sm text-slate-500 mt-1">Authenticate inbox, track opens, send templates, and manage marketing sequences.</p>
        </div>
        
        <!-- Integration Connection Status Badge & Action -->
        <div>
          <div *ngIf="!gmailConnected()" class="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm">
            <span class="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            <span class="text-slate-600 font-medium">Email account not connected</span>
            <button (click)="connectGoogleOAuth()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ml-2">
              <span class="material-icons text-xs">link</span> Connect Email
            </button>
          </div>

          <div *ngIf="gmailConnected()" class="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-slate-400">Connected:</span>
            <strong class="text-white">{{ connectedEmail() }}</strong>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button (click)="setTab('inbox')" [class.border-indigo-600]="activeTab() === 'inbox'" [class.text-indigo-600]="activeTab() === 'inbox'" class="pb-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition-all">
          Mail Inbox
        </button>
        <button (click)="setTab('compose')" [class.border-indigo-600]="activeTab() === 'compose'" [class.text-indigo-600]="activeTab() === 'compose'" class="pb-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition-all">
          Compose Message
        </button>
        <button (click)="setTab('templates')" [class.border-indigo-600]="activeTab() === 'templates'" [class.text-indigo-600]="activeTab() === 'templates'" class="pb-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition-all">
          Email Templates
        </button>
        <button (click)="setTab('sequences')" [class.border-indigo-600]="activeTab() === 'sequences'" [class.text-indigo-600]="activeTab() === 'sequences'" class="pb-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition-all">
          Sequences
        </button>
        <button (click)="setTab('simulator')" [class.border-indigo-600]="activeTab() === 'simulator'" [class.text-indigo-600]="activeTab() === 'simulator'" class="pb-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition-all">
          Simulation Tools
        </button>
      </div>

      <!-- Tab Content: Inbox -->
      <div *ngIf="activeTab() === 'inbox'" class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
        <div class="p-4 border-b border-slate-100 flex justify-between items-center mb-4">
          <h4 class="font-extrabold text-xs text-slate-600 uppercase tracking-wider">Outbound & Inbound Message Log</h4>
          <button (click)="loadHistory()" class="text-xs text-indigo-600 hover:text-indigo-500 font-bold flex items-center gap-1">
            <span class="material-icons text-sm">sync</span> Sync History
          </button>
        </div>

        <div class="divide-y divide-slate-100">
          <div *ngFor="let mail of emails()" class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
            
            <div class="flex items-start gap-4 flex-1">
              <span class="material-icons p-2.5 rounded-xl" [ngClass]="{
                'bg-emerald-50 text-emerald-600': mail.direction === 'incoming',
                'bg-indigo-50 text-indigo-600': mail.direction === 'outgoing'
              }">
                {{ mail.direction === 'incoming' ? 'inbox' : 'send' }}
              </span>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">
                    {{ mail.direction === 'incoming' ? 'From:' : 'To:' }}
                  </span>
                  <strong class="text-xs text-slate-900">
                    {{ mail.direction === 'incoming' ? mail.from : mail.to }}
                  </strong>
                </div>
                <h4 class="text-sm font-bold text-slate-900">{{ mail.subject }}</h4>
                <p class="text-xs text-slate-600 max-w-2xl">{{ mail.body }}</p>
              </div>
            </div>

            <!-- Email Actions / Tracking status -->
            <div class="flex items-center gap-3 shrink-0 self-end md:self-center">
              <div *ngIf="mail.direction === 'outgoing'" class="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg">
                <span class="material-icons text-[12px]" [class.text-emerald-500]="mail.tracking?.opened">
                  {{ mail.tracking?.opened ? 'visibility' : 'visibility_off' }}
                </span>
                <span *ngIf="mail.tracking?.opened">Opened ({{ mail.tracking.openedAt | date:'shortTime' }})</span>
                <span *ngIf="!mail.tracking?.opened">Unopened</span>
                <button *ngIf="!mail.tracking?.opened" (click)="simulateEmailOpen(mail._id)" class="text-indigo-600 hover:text-indigo-500 font-extrabold ml-2">Simulate Open</button>
              </div>

              <span class="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                {{ mail.createdAt | date:'shortTime' }}
              </span>
            </div>

          </div>

          <div *ngIf="emails().length === 0" class="text-center py-12 text-slate-400 font-semibold">
            No message logs found. Compose an outbound email or test incoming email triggers.
          </div>
        </div>
      </div>

      <!-- Tab Content: Compose -->
      <div *ngIf="activeTab() === 'compose'" class="max-w-2xl bg-white border border-slate-200 p-6 rounded-2xl shadow-sm animate-fadeIn space-y-4">
        <h4 class="font-extrabold text-xs text-slate-600 uppercase tracking-wider mb-2">Send Outbound CRM Message</h4>
        
        <div class="grid grid-cols-1 gap-4 text-xs">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To Email Address</label>
            <input type="email" [(ngModel)]="composeTo" placeholder="recipient@client.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold">
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Subject</label>
            <input type="text" [(ngModel)]="composeSubject" placeholder="Regarding partnership proposal" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold">
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Select Template (Optional)</label>
            <select (change)="applyTemplate($event)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold">
              <option value="">-- No Template Selected --</option>
              <option *ngFor="let temp of templates(); let idx = index" [value]="idx">{{ temp.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Email Body</label>
            <textarea [(ngModel)]="composeBody" rows="6" placeholder="Write message..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold"></textarea>
          <!-- Attachments Section (Computer & Proposals/Invoices & Google Drive) -->
          <div class="space-y-3 border-t border-slate-100 pt-3">
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">File Attachments</label>
            
            <div class="flex flex-wrap gap-2">
              <input type="file" #computerFileInput (change)="onComputerFileSelected($event)" class="hidden" multiple>
              <button type="button" (click)="computerFileInput.click()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer">
                <span class="material-icons text-sm text-indigo-600">computer</span> Attach from Computer
              </button>

              <button type="button" (click)="openCrmDocPicker()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer">
                <span class="material-icons text-sm text-sky-600">description</span> Attach Proposal / Invoice PDF
              </button>

              <button type="button" (click)="openDrivePicker()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer">
                <span class="material-icons text-sm text-amber-600">cloud</span> Attach from Google Drive
              </button>
            </div>

            <!-- Attached Files Pill List -->
            <div *ngIf="attachedFiles().length > 0" class="flex flex-wrap gap-2 pt-1">
              <div *ngFor="let file of attachedFiles(); let idx = index" class="bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span class="material-icons text-xs text-indigo-600">{{ file.source === 'drive' ? 'cloud' : (file.source === 'crm' ? 'description' : 'attach_file') }}</span>
                <span class="max-w-[180px] truncate">{{ file.filename }}</span>
                <span class="text-[10px] text-indigo-500 font-bold">({{ file.size || 'PDF' }})</span>
                <button type="button" (click)="removeAttachment(idx)" class="text-indigo-400 hover:text-rose-600 font-bold ml-1">
                  <span class="material-icons text-xs">close</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        <div class="flex justify-end pt-2">
          <button (click)="sendMessage()" [disabled]="!composeTo || !composeBody" class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer">
            Send Outbound Email
          </button>
        </div>
      </div>

      <!-- Tab Content: Templates -->
      <div *ngIf="activeTab() === 'templates'" class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
        <div *ngFor="let temp of templates()" class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <span class="material-icons text-indigo-600 bg-indigo-50 p-2 rounded-xl">article</span>
            <h4 class="text-md font-bold text-slate-900 pt-2">{{ temp.name }}</h4>
            <p class="text-[10px] font-semibold text-slate-500">Subject: {{ temp.subject }}</p>
            <p class="text-xs text-slate-600 leading-relaxed truncate-3-lines">{{ temp.body }}</p>
          </div>
          <button (click)="selectTemplateToCompose(temp)" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-all">
            Use in Composer
          </button>
        </div>
      </div>

      <!-- Tab Content: Sequences -->
      <div *ngIf="activeTab() === 'sequences'" class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
        <div *ngFor="let seq of sequences()" class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="flex justify-between items-start">
            <h4 class="text-md font-bold text-slate-900 flex items-center gap-1.5">
              <span class="material-icons text-violet-600">stacked_line_chart</span> {{ seq.name }}
            </h4>
            <span class="text-[9px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Automated</span>
          </div>

          <div class="space-y-3 pl-4 border-l-2 border-slate-200">
            <div *ngFor="let step of seq.steps; let idx = index" class="relative text-xs">
              <div class="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full bg-slate-400 border border-white"></div>
              <strong class="text-slate-800">Step {{ idx+1 }} (After {{ step.delayDays }} Days)</strong>
              <p class="text-[10px] text-slate-500 mt-0.5">Subject: {{ step.subject }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Simulator -->
      <div *ngIf="activeTab() === 'simulator'" class="max-w-xl bg-white border border-slate-200 p-6 rounded-2xl shadow-sm animate-fadeIn space-y-5">
        <div>
          <h4 class="font-extrabold text-xs text-slate-600 uppercase tracking-wider mb-1">Simulate Incoming Customer Email</h4>
          <p class="text-xs text-slate-500">Test how incoming emails are logged into timelines and trigger auto lead creation.</p>
        </div>

        <div class="grid grid-cols-1 gap-4 text-xs">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sender Email address</label>
            <input type="email" [(ngModel)]="simFrom" placeholder="client@outlook.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold">
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Subject</label>
            <input type="text" [(ngModel)]="simSubject" placeholder="Need quotation for 50 licenses" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold">
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Email Content</label>
            <textarea [(ngModel)]="simBody" rows="4" placeholder="Hello, I would like to request a demo..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold"></textarea>
          </div>
          <div class="flex items-center gap-2.5 pt-2">
            <input type="checkbox" [(ngModel)]="simAutoCreateLead" id="simAutoCreateLead" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4">
            <label for="simAutoCreateLead" class="font-semibold text-slate-700 cursor-pointer">
              Auto-create Lead on matching email address
            </label>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button (click)="simulateIncomingMail()" [disabled]="!simFrom || !simBody" class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all">
            Trigger Incoming Mail Sync
          </button>
        </div>
      </div>

      <!-- CRM Proposal / Invoice Picker Modal -->
      <div *ngIf="showCrmDocModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div class="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
          <div class="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 class="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span class="material-icons text-sky-600">description</span> Attach CRM Proposal / Invoice
            </h4>
            <button (click)="showCrmDocModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <span class="material-icons text-sm">close</span>
            </button>
          </div>

          <div *ngIf="crmDocsList().length === 0" class="p-4 text-center text-xs text-slate-400 font-medium">
            No proposals or invoices found in workspace.
          </div>

          <div *ngIf="crmDocsList().length > 0" class="max-h-60 overflow-y-auto space-y-2">
            <div *ngFor="let doc of crmDocsList()" (click)="attachCrmDoc(doc)" class="p-3 border border-slate-200 rounded-xl hover:bg-sky-50 hover:border-sky-300 transition-all cursor-pointer flex justify-between items-center">
              <div>
                <p class="text-xs font-bold text-slate-900">{{ doc.name }}</p>
                <p class="text-[10px] text-slate-500">{{ doc.type }} • Net: \${{ (doc.metadata?.netAmount || 0).toLocaleString() }}</p>
              </div>
              <span class="material-icons text-sm text-sky-600">add_circle_outline</span>
            </div>
          </div>

          <div class="flex justify-end">
            <button (click)="showCrmDocModal.set(false)" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Google Drive Picker Modal -->
      <div *ngIf="showDriveModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div class="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
          <div class="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 class="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span class="material-icons text-amber-600">cloud</span> Attach from Workspace Google Drive
            </h4>
            <button (click)="showDriveModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <span class="material-icons text-sm">close</span>
            </button>
          </div>

          <div *ngIf="driveFilesList().length === 0" class="p-4 text-center text-xs text-slate-400 font-medium">
            No Google Drive files found or Drive not linked.
          </div>

          <div *ngIf="driveFilesList().length > 0" class="max-h-60 overflow-y-auto space-y-2">
            <div *ngFor="let file of driveFilesList()" (click)="attachDriveFile(file)" class="p-3 border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer flex justify-between items-center">
              <div>
                <p class="text-xs font-bold text-slate-900">{{ file.name }}</p>
                <p class="text-[10px] text-slate-500">{{ file.mimeType || 'Drive File' }}</p>
              </div>
              <span class="material-icons text-sm text-amber-600">add_circle_outline</span>
            </div>
          </div>

          <div class="flex justify-end">
            <button (click)="showDriveModal.set(false)" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .truncate-3-lines {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class EmailCenterComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  gmailConnected = signal<boolean>(false);
  connectedEmail = signal<string>('');
  activeTab = signal<string>('inbox');
  emails = signal<any[]>([]);

  // Composer fields
  composeTo = '';
  composeSubject = '';
  composeBody = '';

  // Simulator fields
  simFrom = '';
  simSubject = '';
  simBody = '';
  simAutoCreateLead = true;

  templates = signal<EmailTemplate[]>([
    {
      name: 'SaaS Welcome Email',
      subject: 'Welcome to GrownX CRM Technologies! ⚡',
      body: 'Hi there,\n\nThanks for signing up to GrownX CRM! We are thrilled to support your sales operations.'
    },
    {
      name: 'Quotations Proposal Follow-up',
      subject: 'Reviewing your Service Agreement Proposal',
      body: 'Dear client,\n\nI have generated the service proposal agreement PDF for your review. Please inspect attached PDF and let us know.'
    }
  ]);

  sequences = signal<EmailSequence[]>([
    {
      name: 'Enterprise Cold Outreach Sequence',
      steps: [
        { delayDays: 1, subject: 'Scale your team operations visually', body: 'Introducing GrownX command centers...' },
        { delayDays: 3, subject: 'Quick question regarding Gmail/Drive syncs', body: 'Wondering if your team needs auto customer folders...' }
      ]
    }
  ]);

  ngOnInit() {
    this.checkOAuthConnection();
    this.loadHistory();
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  checkOAuthConnection() {
    this.apiService.getMe().subscribe({
      next: (res: any) => {
        if (res.success && res.data?.gmailOAuth?.emailSyncActive && res.data?.gmailOAuth?.connectedEmail) {
          this.gmailConnected.set(true);
          this.connectedEmail.set(res.data.gmailOAuth.connectedEmail);
        } else {
          this.gmailConnected.set(false);
          this.connectedEmail.set('');
        }
      },
      error: () => {
        this.gmailConnected.set(false);
      }
    });
  }

  connectGoogleOAuth() {
    const currentUser = this.authService.currentUserValue;
    const connectEmail = currentUser?.email || 'user.connected@domain.com';
    this.apiService.getOAuthUrl().subscribe({
      next: (res) => {
        if (res.success && res.url) {
          this.apiService.connectGmail(connectEmail, 'oauth_code_live').subscribe({
            next: (authRes) => {
              if (authRes.success) {
                this.gmailConnected.set(true);
                this.connectedEmail.set(connectEmail);
                this.loadHistory();
              }
            }
          });
        }
      }
    });
  }

  loadHistory() {
    this.apiService.getEmailHistory().subscribe({
      next: (res) => {
        if (res.success) this.emails.set(res.data);
      }
    });
  }

  applyTemplate(event: any) {
    const idx = event.target.value;
    if (idx === '') {
      this.composeSubject = '';
      this.composeBody = '';
    } else {
      const temp = this.templates()[idx];
      this.composeSubject = temp.subject;
      this.composeBody = temp.body;
    }
  }

  selectTemplateToCompose(temp: EmailTemplate) {
    this.composeSubject = temp.subject;
    this.composeBody = temp.body;
    this.setTab('compose');
  }

  attachedFiles = signal<any[]>([]);
  showCrmDocModal = signal<boolean>(false);
  crmDocsList = signal<any[]>([]);
  showDriveModal = signal<boolean>(false);
  driveFilesList = signal<any[]>([]);

  onComputerFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Content = e.target.result.split(',')[1];
        this.attachedFiles.update(cur => [
          ...cur,
          {
            filename: file.name,
            content: base64Content,
            contentType: file.type || 'application/octet-stream',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            source: 'computer'
          }
        ]);
      };
      reader.readAsDataURL(file);
    }
  }

  openCrmDocPicker() {
    this.apiService.getDocuments().subscribe({
      next: (res) => {
        this.crmDocsList.set(res.data || []);
        this.showCrmDocModal.set(true);
      }
    });
  }

  attachCrmDoc(doc: any) {
    this.apiService.viewDocumentPdfBlob(doc._id).subscribe({
      next: (blob: Blob) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const base64Content = e.target.result.split(',')[1];
          this.attachedFiles.update(cur => [
            ...cur,
            {
              filename: `${doc.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
              content: base64Content,
              contentType: 'application/pdf',
              size: `${(blob.size / 1024).toFixed(1)} KB`,
              source: 'crm'
            }
          ]);
          this.showCrmDocModal.set(false);
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        alert('Could not generate proposal PDF for attachment.');
      }
    });
  }

  openDrivePicker() {
    this.apiService.getDriveFolders().subscribe({
      next: () => {
        const mockDriveFiles = [
          { name: 'Service_Level_Agreement_2026.pdf', mimeType: 'application/pdf' },
          { name: 'Company_Product_Catalog.pdf', mimeType: 'application/pdf' },
          { name: 'Technical_Architecture_Overview.docx', mimeType: 'application/msword' }
        ];
        this.driveFilesList.set(mockDriveFiles);
        this.showDriveModal.set(true);
      },
      error: () => {
        this.driveFilesList.set([
          { name: 'Company_Product_Catalog.pdf', mimeType: 'application/pdf' },
          { name: 'Standard_Terms_and_Conditions.pdf', mimeType: 'application/pdf' }
        ]);
        this.showDriveModal.set(true);
      }
    });
  }

  attachDriveFile(file: any) {
    this.attachedFiles.update(cur => [
      ...cur,
      {
        filename: file.name,
        content: 'dGVzdCBkcml2ZSBmaWxlIGNvbnRlbnQ=',
        contentType: file.mimeType || 'application/pdf',
        size: '14.2 KB',
        source: 'drive'
      }
    ]);
    this.showDriveModal.set(false);
  }

  removeAttachment(index: number) {
    this.attachedFiles.update(cur => cur.filter((_, i) => i !== index));
  }

  sendMessage() {
    const payload = {
      subject: this.composeSubject,
      body: this.composeBody,
      to: this.composeTo,
      attachments: this.attachedFiles().map(f => ({
        filename: f.filename,
        content: f.content,
        contentType: f.contentType
      }))
    };

    this.apiService.sendGmail(payload).subscribe({
      next: () => {
        this.composeTo = '';
        this.composeSubject = '';
        this.composeBody = '';
        this.attachedFiles.set([]);
        this.loadHistory();
        this.setTab('inbox');
      },
      error: (err) => {
        alert(`Email delivery failed: ${err.error?.error || err.message}`);
      }
    });
  }

  simulateIncomingMail() {
    const payload = {
      from: this.simFrom,
      subject: this.simSubject,
      body: this.simBody,
      autoCreateLead: this.simAutoCreateLead
    };

    this.apiService.receiveMockEmail(payload).subscribe({
      next: () => {
        this.simFrom = '';
        this.simSubject = '';
        this.simBody = '';
        this.loadHistory();
        this.setTab('inbox');
      }
    });
  }

  simulateEmailOpen(id: string) {
    this.apiService.trackEmailOpen(id).subscribe({
      next: () => this.loadHistory()
    });
  }
}
