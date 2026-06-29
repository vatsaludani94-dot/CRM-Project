import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-funnel-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Sales Funnels</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Design checkout paths, schedule webinar funnels, and monitor conversion metrics.</p>
        </div>
        
        <div class="flex gap-2">
          <button (click)="openCreateModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5">
            <span class="material-icons text-sm">add</span> Create Funnel
          </button>
        </div>
      </div>

      <!-- Main Layout: Grid -->
      <div *ngIf="activeView() === 'list'" class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
        <div *ngFor="let fn of funnels()" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
          
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-[9px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-500 dark:text-violet-400 px-2.5 py-1 rounded-md">{{ fn.template }}</span>
              <span class="text-[10px] font-bold text-slate-400">Steps: {{ fn.steps?.length || 0 }}</span>
            </div>
            
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ fn.name }}</h3>

            <!-- Metrics grid -->
            <div class="grid grid-cols-5 gap-2 text-center pt-2">
              <div class="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                <p class="text-[9px] text-slate-400 font-bold uppercase">Visits</p>
                <p class="text-xs font-black text-slate-800 dark:text-white mt-0.5">{{ fn.stats?.visitors }}</p>
              </div>
              <div class="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                <p class="text-[9px] text-slate-400 font-bold uppercase">Leads</p>
                <p class="text-xs font-black text-slate-900 dark:text-white mt-0.5">{{ fn.stats?.leads }}</p>
              </div>
              <div class="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                <p class="text-[9px] text-slate-400 font-bold uppercase">Appts</p>
                <p class="text-xs font-black text-slate-800 dark:text-white mt-0.5">{{ fn.stats?.appointments }}</p>
              </div>
              <div class="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                <p class="text-[9px] text-slate-400 font-bold uppercase">Rate</p>
                <p class="text-xs font-black text-indigo-500 dark:text-indigo-400 mt-0.5">{{ fn.stats?.conversionRate }}%</p>
              </div>
              <div class="bg-indigo-50 dark:bg-indigo-950/35 p-2 rounded-lg">
                <p class="text-[9px] text-indigo-400 font-bold uppercase">Value</p>
                <p class="text-xs font-black text-emerald-500 mt-0.5">\${{ fn.stats?.revenue }}</p>
              </div>
            </div>
          </div>

          <div class="flex gap-2 border-t border-slate-100 dark:border-slate-700 pt-4">
            <button (click)="openStepsEditor(fn)" class="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2 rounded-xl transition-all">
              Manage Steps
            </button>
            <button (click)="cloneFunnel(fn._id)" class="bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1">
              <span class="material-icons text-sm">content_copy</span> Clone
            </button>
            <button (click)="deleteFunnel(fn._id)" class="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-xl transition-colors">
              <span class="material-icons text-sm">delete</span>
            </button>
          </div>

        </div>

        <div *ngIf="funnels().length === 0" class="col-span-2 text-center py-16 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-3">
          <span class="material-icons text-4xl text-slate-300">filter_alt</span>
          <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">No funnels created yet. Click Create Funnel to build your checkout map.</p>
        </div>
      </div>

      <!-- Funnel Steps Visualizer / Editor -->
      <div *ngIf="activeView() === 'editor' && currentFunnel()" class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
        
        <!-- Left Panel: Steps Progression Diagram -->
        <div class="lg:col-span-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center min-h-[500px]">
          
          <div class="flex justify-between w-full border-b border-slate-800 pb-4 mb-6">
            <div class="flex items-center gap-3">
              <button (click)="closeStepsEditor()" class="text-slate-400 hover:text-white">
                <span class="material-icons">arrow_back</span>
              </button>
              <h3 class="text-md font-extrabold text-white">{{ currentFunnel().name }}</h3>
            </div>
            <span class="text-[9px] font-black uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md">{{ currentFunnel().template }}</span>
          </div>

          <!-- Vertical Funnel Pipeline -->
          <div class="flex flex-col items-center w-full space-y-0">
            <div *ngFor="let step of currentFunnelSteps(); let idx = index" class="flex flex-col items-center">
              
              <!-- Step card -->
              <div class="w-64 bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-md flex items-center gap-3 relative group">
                <div class="h-6 w-6 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-black text-xs">
                  {{ idx + 1 }}
                </div>
                <div class="overflow-hidden">
                  <h5 class="text-xs font-bold text-white truncate">{{ step.name }}</h5>
                  <p class="text-[9px] text-slate-400 font-bold">{{ step.path }}</p>
                </div>
                <button (click)="removeStep(idx)" class="absolute top-1/2 -translate-y-1/2 -right-8 text-rose-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span class="material-icons text-sm">remove_circle</span>
                </button>
              </div>

              <!-- Flow Connection line -->
              <div *ngIf="idx < currentFunnelSteps().length - 1" class="h-8 w-0.5 bg-slate-700 flex justify-center items-center">
                <span class="material-icons text-slate-700 text-[10px] translate-y-1">arrow_downward</span>
              </div>

            </div>
          </div>

          <!-- Add step buttons -->
          <div class="flex gap-2.5 pt-8">
            <button (click)="addStep('Opt-in Page', '/opt-in')" class="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold text-[10px] px-3.5 py-2 rounded-xl uppercase">Add Opt-in</button>
            <button (click)="addStep('Checkout Page', '/checkout')" class="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold text-[10px] px-3.5 py-2 rounded-xl uppercase">Add Checkout</button>
            <button (click)="addStep('Thank You Page', '/thank-you')" class="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold text-[10px] px-3.5 py-2 rounded-xl uppercase">Add Thanks</button>
          </div>

          <!-- Action triggers -->
          <div class="flex justify-end w-full border-t border-slate-800 pt-6 mt-8">
            <button (click)="saveFunnelLayout()" class="bg-indigo-600 hover:bg-indigo-600 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20">
              Save Funnel Mapping
            </button>
          </div>

        </div>

        <!-- Right Panel: Conversion Rate simulator -->
        <div class="lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-6">
          <h4 class="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider">Conversion Simulator</h4>
          
          <div class="space-y-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <p>Mock traffic generation to test funnel tracking metrics locally.</p>
            
            <div class="grid grid-cols-2 gap-3 pt-2">
              <button (click)="simulateMetric('visitors')" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 text-slate-800 dark:text-white py-2.5 rounded-xl transition-colors font-bold text-[10px] uppercase">Record Visit</button>
              <button (click)="simulateMetric('leads')" class="bg-slate-105 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 text-slate-800 dark:text-white py-2.5 rounded-xl transition-colors font-bold text-[10px] uppercase">Record Lead</button>
              <button (click)="simulateMetric('appointments')" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-xl transition-colors font-bold text-[10px] uppercase">Book Call</button>
              <button (click)="simulateMetric('revenue')" class="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-2.5 rounded-xl border border-emerald-500/20 transition-colors font-bold text-[10px] uppercase">Record Sale ($)</button>
            </div>
            
            <div class="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
              <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Funnel Analytics</p>
              <div class="space-y-2 text-slate-600 dark:text-slate-300">
                <div class="flex justify-between">
                  <span>Total Revenue Generated:</span>
                  <strong class="text-slate-900 dark:text-white">\${{ currentFunnel().stats?.revenue || 0 }}</strong>
                </div>
                <div class="flex justify-between">
                  <span>Current Conversion Rate:</span>
                  <strong class="text-indigo-500 dark:text-indigo-400">{{ currentFunnel().stats?.conversionRate || 0 }}%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Modal: Create Funnel -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 border dark:border-slate-700 p-6 rounded-2xl w-full max-w-lg space-y-4 text-xs animate-fadeIn">
          <h3 class="text-sm font-extrabold text-slate-800 dark:text-white">Create Sales Funnel</h3>
          
          <div class="space-y-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Funnel Name</label>
              <input type="text" [(ngModel)]="newFunnelName" placeholder="Black Friday Promo" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white">
            </div>
            
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Select Pipeline Template (54 Available)</label>
              
              <!-- Category Selector Pills -->
              <div class="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">
                <button *ngFor="let cat of funnelCategories" (click)="selectedFunnelCategoryFilter.set(cat)" [class.bg-indigo-600]="selectedFunnelCategoryFilter() === cat" [class.text-white]="selectedFunnelCategoryFilter() === cat" class="px-2.5 py-1.5 rounded-lg text-[9px] font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                  {{ cat }}
                </button>
              </div>
              
              <!-- Templates Grid (9 per category) -->
              <div class="grid grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1">
                <div *ngFor="let t of getFilteredFunnels()" (click)="selectFunnelTemplate(t)" [class.border-indigo-500]="selectedTemplateId() === t.id" [class.ring-2]="selectedTemplateId() === t.id" class="border border-slate-200 dark:border-slate-700 p-2 rounded-xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex flex-col justify-between text-left space-y-1">
                  <h4 class="font-bold text-slate-800 dark:text-white text-[9px] leading-tight">{{ t.name }}</h4>
                  <span class="text-[7px] text-indigo-500 font-black uppercase">Select</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <button (click)="closeCreateModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 py-2.5 rounded-xl font-bold transition-colors">Cancel</button>
            <button (click)="createFunnel()" [disabled]="!newFunnelName || !selectedTemplateId()" class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold transition-all">Create Funnel</button>
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
  `]
})
export class FunnelBuilderComponent implements OnInit {
  private apiService = inject(ApiService);

  funnels = signal<any[]>([]);
  activeView = signal<string>('list'); // 'list' or 'editor'
  
  // Editor state
  currentFunnel = signal<any | null>(null);
  currentFunnelSteps = signal<any[]>([]);

  // Modal inputs
  showCreateModal = signal<boolean>(false);
  newFunnelName = '';
  newFunnelTemplate = 'Lead Generation Funnel';
  selectedTemplateId = signal<string>('');

  // 54 Funnel Templates Registry
  funnelCategories = [
    'Lead Generation', 'Webinar Registration', 'Product Sales', 'Coaching & Consultation', 'SaaS Free Trial', 'Event Ticket Sales'
  ];
  selectedFunnelCategoryFilter = signal<string>('Lead Generation');
  funnelTemplates = signal<any[]>([]);

  ngOnInit() {
    this.generateFunnelTemplates();
    this.loadFunnels();
  }

  generateFunnelTemplates() {
    const list: any[] = [];
    const keywords = {
      'Lead Generation': ['Ebook Download', 'Free Audit Report', 'Newsletter Signup', 'Whitepaper Access', 'VIP Waitlist', 'Survey Qualification', 'SaaS Lead Magnet', 'Discount Code Capture', 'Contest Entry Page'],
      'Webinar Registration': ['Live Training Session', 'On-Demand Workshop', 'Masterclass Invitation', 'Product Launch Reveal', 'Coaches Panel Discussion', 'Q&A Clinic registration', 'Guest Speaker Event', 'Weekly Demo Call', 'Replay Library Access'],
      'Product Sales': ['Direct Checkout Page', 'Upsell-Downsell Funnel', 'Flash Sale Pipeline', 'Bundle Offer Store', 'Subscription Box Box', 'B2B Wholesale Portal', 'E-commerce Cart Saver', 'VIP Early Access Shop', 'Pre-order Milestone Page'],
      'Coaching & Consultation': ['1-on-1 Discovery Call', 'Strategy Call Application', 'Group Coaching Pitch', 'Agency Consultation Audit', 'Diagnostic Assessment Quiz', 'Retainer Program Quote', 'VIP Day Booking page', 'Resume Review scheduler', 'Fitness Consultation'],
      'SaaS Free Trial': ['SaaS Standard Trial Page', 'Credit Card Free Access', 'Developer Sandbox Access', 'Enterprise Demo Request', 'Beta Program Invites', 'Self-Serve Sign-up Flow', 'Startup Accelerate Trial', 'Collaborator Seat Invite', 'Premium Add-on Upgrade'],
      'Event Ticket Sales': ['Concert VIP Entry', 'Tech Conference Pass', 'Local Meetup RSVP', 'Non-profit Charity Gala', 'Summit Attendee Registry', 'Workshop Seat Booking', 'Webinar Paid Ticket', 'Networking Event Pass', 'Festival General Admission']
    };

    this.funnelCategories.forEach((cat) => {
      const names = keywords[cat as keyof typeof keywords] || [];
      for (let i = 1; i <= 9; i++) {
        const name = names[i - 1] || `${cat} Standard ${i}`;
        list.push({
          id: `${cat.toLowerCase().replace(/ /g, '_')}_${i}`,
          name: `${name} Funnel`,
          category: cat,
          desc: `A high-converting 3-step ${cat.toLowerCase()} funnel containing opt-in forms, checkout layouts, and tracking metrics.`,
          steps: [
            { name: `${name} Landing`, path: '/opt-in' },
            { name: `${name} Application / Checkout`, path: '/checkout' },
            { name: `${name} Thank You`, path: '/thank-you' }
          ]
        });
      }
    });

    this.funnelTemplates.set(list);
  }

  getFilteredFunnels() {
    return this.funnelTemplates().filter(f => f.category === this.selectedFunnelCategoryFilter());
  }

  selectFunnelTemplate(t: any) {
    this.selectedTemplateId.set(t.id);
    this.newFunnelTemplate = t.name;
  }

  loadFunnels() {
    this.apiService.getFunnels().subscribe({
      next: (res) => {
        if (res.success) this.funnels.set(res.data);
      }
    });
  }

  setView(view: string) {
    this.activeView.set(view);
  }

  openCreateModal() {
    this.newFunnelName = '';
    this.newFunnelTemplate = 'Lead Generation Funnel';
    this.selectedTemplateId.set('');
    this.selectedFunnelCategoryFilter.set('Lead Generation');
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  createFunnel() {
    const selectedTemplate = this.funnelTemplates().find(t => t.id === this.selectedTemplateId());
    const initialSteps = selectedTemplate ? selectedTemplate.steps : undefined;

    const payload = {
      name: this.newFunnelName,
      template: this.newFunnelTemplate,
      steps: initialSteps
    };

    this.apiService.createFunnel(payload).subscribe({
      next: (res) => {
        this.closeCreateModal();
        this.loadFunnels();
      }
    });
  }

  openStepsEditor(funnel: any) {
    this.currentFunnel.set(funnel);
    this.currentFunnelSteps.set(funnel.steps || []);
    this.setView('editor');
  }

  closeStepsEditor() {
    this.currentFunnel.set(null);
    this.setView('list');
  }

  addStep(name: string, path: string) {
    this.currentFunnelSteps.set([...this.currentFunnelSteps(), { name, path }]);
  }

  removeStep(idx: number) {
    const cur = this.currentFunnelSteps();
    cur.splice(idx, 1);
    this.currentFunnelSteps.set([...cur]);
  }

  saveFunnelLayout() {
    const fn = this.currentFunnel();
    if (!fn) return;

    this.apiService.updateFunnel(fn._id, { steps: this.currentFunnelSteps() }).subscribe({
      next: (res) => {
        this.loadFunnels();
        this.closeStepsEditor();
      }
    });
  }

  cloneFunnel(id: string) {
    this.apiService.cloneFunnel(id).subscribe({
      next: (res) => {
        this.loadFunnels();
      }
    });
  }

  simulateMetric(metric: string) {
    const fn = this.currentFunnel();
    if (!fn) return;

    const amount = metric === 'revenue' ? 99 : undefined;
    this.apiService.trackFunnelMetric(fn._id, { metric, amount }).subscribe({
      next: (res) => {
        if (res.success) {
          // Update local stats view
          this.currentFunnel.set({
            ...fn,
            stats: res.data
          });
          this.loadFunnels();
        }
      }
    });
  }

  deleteFunnel(id: string) {
    if (confirm('Delete this funnel path?')) {
      this.apiService.deleteFunnel(id).subscribe({
        next: () => this.loadFunnels()
      });
    }
  }
}
