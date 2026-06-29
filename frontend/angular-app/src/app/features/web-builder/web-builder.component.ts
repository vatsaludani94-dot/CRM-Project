import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface WebsiteSection {
  type: 'Hero' | 'Features' | 'Pricing' | 'Testimonials' | 'FAQ' | 'Contact' | 'Footer' | 'Blog';
  title: string;
  subtitle?: string;
  content: any;
  style?: {
    backgroundColor: string;
    textColor: string;
  };
  action?: {
    type: string;
    target: string;
  };
}

@Component({
  selector: 'app-web-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Website Builder</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Design responsive landing pages, update SEO parameters, and bind domains.</p>
        </div>
        
        <div class="flex gap-2">
          <button (click)="openCreateSiteModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5">
            <span class="material-icons text-sm">add</span> Create Website
          </button>
        </div>
      </div>

      <!-- Layout: Switch between List and Editor -->
      <div *ngIf="activeView() === 'list'" class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
        <div *ngFor="let site of websites()" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2.5 py-1 rounded-md">{{ site.template }} Template</span>
              <span [ngClass]="{
                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': site.published,
                'bg-slate-100 text-slate-500 border-slate-200': !site.published
              }" class="border px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                {{ site.published ? 'Published' : 'Draft' }}
              </span>
            </div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white pt-2">{{ site.name }}</h3>
            <p class="text-xs text-slate-400 font-medium">Domain: {{ site.domain || (site.subdomain + '.grownx.site') }}</p>
          </div>
          
          <div class="flex gap-2 pt-2">
            <button (click)="openEditor(site)" class="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 rounded-xl transition-colors">
              Edit Layout
            </button>
            <button (click)="deleteSite(site._id)" class="bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-xl transition-colors">
              <span class="material-icons text-sm">delete</span>
            </button>
          </div>
        </div>

        <div *ngIf="websites().length === 0" class="col-span-3 text-center py-16 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-3">
          <span class="material-icons text-4xl text-slate-300">web</span>
          <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">No websites created yet. Start by choosing a template.</p>
        </div>
      </div>

      <!-- Editor View -->
      <div *ngIf="activeView() === 'editor' && currentSite()" class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
        
        <!-- Left Panel: Page Section Tree (Visual Editor Layout) -->
        <div class="lg:col-span-8 space-y-6">
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col space-y-6 min-h-[500px]">
            
            <div class="flex justify-between items-center border-b border-slate-800 pb-4">
              <div class="flex items-center gap-3">
                <button (click)="closeEditor()" class="text-slate-400 hover:text-white">
                  <span class="material-icons">arrow_back</span>
                </button>
                <h3 class="text-md font-extrabold text-white">{{ currentSite().name }}</h3>
              </div>

              <!-- Device View Toggles -->
              <div class="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl">
                <button (click)="setDevice('desktop')" [class.bg-slate-700]="deviceMode() === 'desktop'" class="p-1.5 rounded-lg text-slate-300 hover:text-white"><span class="material-icons text-sm">desktop_windows</span></button>
                <button (click)="setDevice('tablet')" [class.bg-slate-700]="deviceMode() === 'tablet'" class="p-1.5 rounded-lg text-slate-300 hover:text-white"><span class="material-icons text-sm">tablet_mac</span></button>
                <button (click)="setDevice('mobile')" [class.bg-slate-700]="deviceMode() === 'mobile'" class="p-1.5 rounded-lg text-slate-300 hover:text-white"><span class="material-icons text-sm">phone_iphone</span></button>
              </div>
            </div>

            <!-- Page Container (responsive sizing) -->
            <div class="flex justify-center transition-all">
              <div [ngClass]="{
                'w-full': deviceMode() === 'desktop',
                'w-[640px] border-x border-slate-800': deviceMode() === 'tablet',
                'w-[375px] border-x border-slate-800': deviceMode() === 'mobile'
              }" class="bg-white text-slate-900 p-6 rounded-xl space-y-8 min-h-[400px] shadow-lg">
                
                <!-- Loop through page sections -->
                <div *ngFor="let sec of currentSiteSections(); let idx = index" (click)="selectSection(idx)" [class.ring-2]="selectedSectionIdx() === idx" class="ring-indigo-500 ring-offset-2 p-4 border border-dashed border-slate-200 hover:border-indigo-400 rounded-xl relative cursor-pointer group transition-all">
                  
                  <!-- Section Type Label -->
                  <div class="absolute -top-2.5 left-3 bg-indigo-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded">
                    {{ sec.type }} Block
                  </div>

                  <!-- Reordering controls -->
                  <div class="absolute right-3 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button (click)="moveSectionUp(idx); $event.stopPropagation()" [disabled]="idx === 0" class="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded disabled:opacity-30">
                      <span class="material-icons text-xs">arrow_upward</span>
                    </button>
                    <button (click)="moveSectionDown(idx); $event.stopPropagation()" [disabled]="idx === currentSiteSections().length - 1" class="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded disabled:opacity-30">
                      <span class="material-icons text-xs">arrow_downward</span>
                    </button>
                  </div>

                  <!-- Content Preview based on Type -->
                  <div class="space-y-1.5 text-slate-800 dark:text-slate-800">
                    <h2 class="text-sm font-extrabold">{{ sec.title || 'Untitled Section' }}</h2>
                    <p class="text-[10px] text-slate-400 font-semibold" *ngIf="sec.subtitle">{{ sec.subtitle }}</p>
                  </div>
                  
                </div>

                <!-- Empty Section State -->
                <div *ngIf="currentSiteSections().length === 0" class="text-center py-12 text-slate-400 text-xs">
                  This page has no sections. Click "Add Section" below or insert a component preset.
                </div>

              </div>
            </div>

            <!-- Editor Action Buttons -->
            <div class="flex justify-between pt-4">
              <div class="flex gap-2">
                <button (click)="addSection('Hero')" class="bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 font-extrabold text-[10px] px-3 py-1.5 rounded-xl uppercase">Add Hero</button>
                <button (click)="addSection('Features')" class="bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 font-extrabold text-[10px] px-3 py-1.5 rounded-xl uppercase">Add Features</button>
                <button (click)="addSection('Pricing')" class="bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 font-extrabold text-[10px] px-3 py-1.5 rounded-xl uppercase">Add Pricing</button>
                <button (click)="addSection('Contact')" class="bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 font-extrabold text-[10px] px-3 py-1.5 rounded-xl uppercase">Add Contact</button>
              </div>
              <button (click)="saveWebsiteLayout()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20">
                Save Layout
              </button>
            </div>

          </div>
        </div>

        <!-- Right Panel: Section Configurator & SEO/Domain settings -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- Tab selector for config panels -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-4 rounded-2xl flex gap-2 text-xs font-bold">
            <button (click)="setEditorTab('section')" [class.bg-indigo-500]="activeEditorTab() === 'section'" [class.text-white]="activeEditorTab() === 'section'" class="flex-1 py-1.5 rounded-xl text-slate-500 dark:text-slate-300">Section Editor</button>
            <button (click)="setEditorTab('presets')" [class.bg-indigo-500]="activeEditorTab() === 'presets'" [class.text-white]="activeEditorTab() === 'presets'" class="flex-1 py-1.5 rounded-xl text-slate-500 dark:text-slate-300">Add Preset</button>
            <button (click)="setEditorTab('settings')" [class.bg-indigo-500]="activeEditorTab() === 'settings'" [class.text-white]="activeEditorTab() === 'settings'" class="flex-1 py-1.5 rounded-xl text-slate-500 dark:text-slate-300">SEO & Domain</button>
          </div>

          <!-- Editor Panel: Section Content Form -->
          <div *ngIf="activeEditorTab() === 'section'" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-4">
            <h4 class="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span class="material-icons text-indigo-500">edit</span> Block Settings
            </h4>

            <div *ngIf="selectedSectionIdx() === null" class="text-center py-16 text-slate-400 text-xs">
              Select any block inside the responsive preview frame to update its copy fields.
            </div>

            <div *ngIf="selectedSectionIdx() !== null" class="space-y-4 text-xs animate-fadeIn">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Header Title</label>
                <input type="text" [(ngModel)]="getSelectedSection()!.title" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
              </div>
              <div *ngIf="getSelectedSection()!.subtitle !== undefined">
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subtitle / Body</label>
                <textarea [(ngModel)]="getSelectedSection()!.subtitle" rows="3" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"></textarea>
              </div>

              <!-- Universal Clickable Actions Configurator -->
              <div class="border-t border-slate-105 dark:border-slate-700 pt-4 mt-2 space-y-3" *ngIf="getSelectedSection()!.action">
                <h5 class="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">Component Action Binding</h5>
                <p class="text-[9px] text-slate-400 leading-normal">Bind a click trigger action to this section's buttons or cards.</p>
                
                <div>
                  <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">Trigger Action Type</label>
                  <select [(ngModel)]="getSelectedSection()!.action!.type" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white">
                    <option value="none">None (No trigger)</option>
                    <option value="url">Open External URL</option>
                    <option value="internal_page">Open Internal Page</option>
                    <option value="form">Open Modal Form</option>
                    <option value="survey">Open Modal Survey</option>
                    <option value="funnel">Open Conversion Funnel</option>
                    <option value="customer_record">Open Customer 360 Record</option>
                    <option value="calendar">Open Calendar Event Scheduler</option>
                    <option value="proposal">Open Proposal Document</option>
                    <option value="ticket">Open Support Ticket</option>
                  </select>
                </div>

                <div *ngIf="getSelectedSection()!.action!.type !== 'none'">
                  <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">Action Target (URL/Path/ID)</label>
                  <input type="text" [(ngModel)]="getSelectedSection()!.action!.target" placeholder="e.g. /workflows, https://google.com, form_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white">
                </div>
              </div>

              <div class="flex gap-2 pt-4">
                <button (click)="removeSelectedSection()" class="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 py-2 rounded-xl font-bold transition-all text-[11px]">
                  Delete Block
                </button>
              </div>
            </div>
          </div>

          <!-- Editor Panel: Add Preset Component Library -->
          <div *ngIf="activeEditorTab() === 'presets'" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-4 text-xs animate-fadeIn">
            <h4 class="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider mb-2">Component Presets Library</h4>
            <p class="text-slate-400 text-[10px]">Select any preset component to append it directly to your page canvas.</p>
            
            <!-- Category Selector -->
            <div class="flex flex-wrap gap-1 border-b border-slate-105 dark:border-slate-700 pb-3">
              <button *ngFor="let cat of componentCategories" (click)="selectedComponentCategory.set(cat)" [class.bg-indigo-600]="selectedComponentCategory() === cat" [class.text-white]="selectedComponentCategory() === cat" class="px-2 py-1 rounded text-[9px] font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                {{ cat }}
              </button>
            </div>

            <!-- Components List -->
            <div class="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              <div *ngFor="let comp of getFilteredComponents()" (click)="appendPresetComponent(comp)" class="border border-slate-100 dark:border-slate-700/60 p-2.5 rounded-xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors flex items-center justify-between group">
                <div>
                  <h5 class="font-bold text-slate-800 dark:text-white text-[10px] group-hover:text-indigo-500 transition-colors">{{ comp.name }}</h5>
                  <span class="text-[8px] bg-slate-100 dark:bg-slate-900 text-slate-400 px-1 py-0.5 rounded font-black uppercase inline-block mt-1">{{ comp.category }} Preset</span>
                </div>
                <span class="material-icons text-slate-300 group-hover:text-indigo-500 transition-colors text-sm">add_circle_outline</span>
              </div>
            </div>
          </div>

          <!-- Editor Panel: SEO & Domains Form -->
          <div *ngIf="activeEditorTab() === 'settings'" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-5 text-xs">
            <h4 class="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider mb-2">Publish Settings</h4>
            
            <div class="space-y-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">SEO Title</label>
                <input type="text" [(ngModel)]="currentSite().seo.title" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">SEO Meta Description</label>
                <textarea [(ngModel)]="currentSite().seo.description" rows="3" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"></textarea>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Custom Domain Name</label>
                <input type="text" [(ngModel)]="customDomainInput" placeholder="www.mybusiness.com" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
              </div>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
              <span class="font-bold text-slate-600 dark:text-slate-300">Status: {{ currentSite().published ? 'Published' : 'Draft' }}</span>
              <button (click)="togglePublish()" [class.bg-emerald-600]="!currentSite().published" class="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md">
                {{ currentSite().published ? 'Unpublish' : 'Publish Site' }}
              </button>
            </div>
          </div>

        </div>

      </div>

      <!-- Modal: Create Site -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 border dark:border-slate-700 p-6 rounded-2xl w-full max-w-lg space-y-4 text-xs animate-fadeIn">
          <h3 class="text-sm font-extrabold text-slate-800 dark:text-white">Create New Website Template</h3>
          
          <div class="space-y-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Website Name</label>
              <input type="text" [(ngModel)]="newSiteName" placeholder="My Startup Portal" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white">
            </div>
            
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Select Template Layout (108 Available)</label>
              
              <!-- Category Selector Pills -->
              <div class="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">
                <button *ngFor="let cat of templateCategories" (click)="selectedCategoryFilter.set(cat)" [class.bg-indigo-600]="selectedCategoryFilter() === cat" [class.text-white]="selectedCategoryFilter() === cat" class="px-2 py-1 rounded-lg text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-105 dark:hover:bg-slate-700/50 transition-colors">
                  {{ cat }}
                </button>
              </div>
              
              <!-- Templates Grid (12 per category) -->
              <div class="grid grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1">
                <div *ngFor="let t of filteredTemplates()" (click)="selectTemplateForCreation(t)" [class.border-indigo-500]="selectedTemplateId() === t.id" [class.ring-2]="selectedTemplateId() === t.id" class="border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex flex-col justify-between text-left space-y-1">
                  <h4 class="font-bold text-slate-800 dark:text-white text-[9px] leading-tight">{{ t.name }}</h4>
                  <span class="text-[7px] text-indigo-500 font-black uppercase">Select</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <button (click)="closeCreateSiteModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 py-2.5 rounded-xl font-bold transition-colors">Cancel</button>
            <button (click)="createWebsite()" [disabled]="!newSiteName || !selectedTemplateId()" class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold transition-all">Create Site</button>
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
export class WebBuilderComponent implements OnInit {
  private apiService = inject(ApiService);

  websites = signal<any[]>([]);
  activeView = signal<string>('list'); // 'list' or 'editor'
  deviceMode = signal<string>('desktop'); // 'desktop' | 'tablet' | 'mobile'
  activeEditorTab = signal<string>('section'); // 'section' | 'settings'

  // Current editor state
  currentSite = signal<any | null>(null);
  currentSiteSections = signal<any[]>([]);
  selectedSectionIdx = signal<number | null>(null);
  customDomainInput = '';

  // Modal State
  showCreateModal = signal<boolean>(false);
  newSiteName = '';
  newSiteTemplate = 'SaaS';
  selectedTemplateId = signal<string>('');

  // 108 Website Templates Registry
  templateCategories = [
    'SaaS', 'Agency', 'Corporate', 'Education', 'Healthcare', 'Real Estate', 'Ecommerce', 'Portfolio', 'Professional Services'
  ];
  selectedCategoryFilter = signal<string>('SaaS');
  websiteTemplates = signal<any[]>([]);

  // 100+ Drag-and-drop Component Library
  componentCategories = [
    'Heros', 'Features', 'Pricing', 'FAQs', 'Contacts', 'Testimonials', 'Footers', 'Widgets'
  ];
  selectedComponentCategory = signal<string>('Heros');
  builderComponents = signal<any[]>([]);

  ngOnInit() {
    this.generateTemplates();
    this.generateBuilderComponents();
    this.loadWebsites();
  }

  generateTemplates() {
    const temps: any[] = [];
    const keywords = {
      SaaS: ['Analytics', 'CRM', 'Copilot', 'Automations', 'Billing', 'Database', 'API Dev', 'CyberSec', 'Marketing', 'Notifications', 'Admin Panel', 'Collaborator'],
      Agency: ['Creative Studio', 'SEO Growth', 'Adwords Hub', 'PR Agency', 'Web Design', 'Branding Co.', 'Media Lab', 'Video Production', 'Copywriting', 'Influencer Spark', 'Event Pro', 'Content Factory'],
      Corporate: ['Global Finance', 'Legal Trust', 'Enterprise Holdings', 'Energy Solutions', 'Logistics Pro', 'HR Alliance', 'Insurance Hub', 'Venture Capital', 'Retail Group', 'Consulting Partners', 'Construction Corp', 'Aero Space'],
      Education: ['UniPortal', 'Academy Cloud', 'SkillUp Course', 'Kids Play', 'Tutor Finder', 'Coding Bootcamp', 'Language Academy', 'Science Center', 'Music School', 'Design Institute', 'EduTech Hub', 'Prep Class'],
      Healthcare: ['Clinic Care', 'Dental Clinic', 'Therapy Center', 'Pharmaco', 'Eye Doc', 'Physio Care', 'Wellness Center', 'Cardio Lab', 'Pediatrics Hub', 'Med Lab', 'Skin Care', 'Orthopedic'],
      'Real Estate': ['Luxury Estates', 'Urban Rentals', 'Commercial Spaces', 'Home Finder', 'Property Hub', 'Appraiser Group', 'Office Share', 'Beachside Properties', 'Land Agency', 'Loft Living', 'Suburban Homes', 'Villa Group'],
      Ecommerce: ['Fashion Shop', 'Tech Store', 'Home Decor', 'Organic Foods', 'Sporting Goods', 'Toy Box', 'Book Nook', 'Beauty Hub', 'Pet Mart', 'Jewelry Store', 'Gift Shop', 'Watch Co.'],
      Portfolio: ['Photo Gallery', 'UX Portfolio', 'Art Studio', 'Dev CV', 'Writer Portfolio', 'Actor Page', 'Music Artist', 'Architect Studio', '3D Generalist', 'Fashion Lookbook', 'Product Designer', 'Director Reel'],
      'Professional Services': ['Accountant Pro', 'Architect Trust', 'Cleaner Service', 'Catering Hub', 'Fitness Trainer', 'Law Firm Partner', 'Auto Repair', 'Plumber Quick', 'Electric Pro', 'Interior Decor', 'Travel Agent', 'Consulting Group']
    };

    this.templateCategories.forEach((cat) => {
      const names = keywords[cat as keyof typeof keywords] || [];
      for (let i = 1; i <= 12; i++) {
        const name = names[i - 1] || `${cat} Standard ${i}`;
        temps.push({
          id: `${cat.toLowerCase().replace(/ /g, '_')}_${i}`,
          name: `${name} Layout Template`,
          category: cat,
          desc: `A premium, conversion-ready ${cat.toLowerCase()} template configured for visual optimization, fully responsive styling, and custom actions.`,
          layout: [
            { type: 'Hero', title: `Welcome to ${name}`, subtitle: `Empowering your business with state-of-the-art ${cat.toLowerCase()} features.`, action: { type: 'none', target: '' } },
            { type: 'Features', title: 'Top Tier Capabilities', subtitle: 'Why organizations choose GrownX solutions.', action: { type: 'none', target: '' } },
            { type: 'Pricing', title: 'Harmonious Subscription Pricing', subtitle: 'No hidden fees, cancel anytime.', action: { type: 'none', target: '' } },
            { type: 'Contact', title: 'Get In Touch With Our Team', subtitle: 'We respond to all tickets within 15 minutes.', action: { type: 'none', target: '' } }
          ]
        });
      }
    });
    this.websiteTemplates.set(temps);
  }

  generateBuilderComponents() {
    const list: any[] = [];
    const presets = {
      Heros: [
        'Minimalist Landing Hero', 'Glassmorphic Dark Hero', 'Stripe Gradient Hero', 'Split Screen Video Hero', 'Product Preview Hero',
        'Center Aligned CTA Hero', 'Left Sidebar Text Hero', 'Wave Background Hero', 'Three Column Stats Hero', 'Phone App Mockup Hero',
        'Corporate Trust Banner', 'SaaS Interactive Graph Hero', 'Agency Creative Pitch', 'E-commerce Bold Hero', 'Newsletter SignUp Hero'
      ],
      Features: [
        'Three Grid Features Grid', 'Four Column Feature Cards', 'Alternating Left-Right Features', 'Tabbed Slider Features', 'Hover Icon Matrix Features',
        'Expandable Accordion Features', 'Product Walkthrough Steps', 'Feature Comparisons List', 'Stats Counter Grid Block', 'Interactive Dashboard Mockup',
        'Floating Card Features', 'Isometric Mockup Display', 'Tech Stack Registry Grid', 'Client Testimonial Side-by-Side', 'Dark Mode Vercel Block'
      ],
      Pricing: [
        'Standard Three Card Pricing', 'Solo Creator Plan Table', 'Annual vs Monthly Comparison', 'Detailed Feature Matrix Table', 'Single CTA Launch Card',
        'Enterprise White-label Inquiry', 'Tiered SaaS Subscription Grid', 'Accordion-backed Pricing Details', 'Pay-as-you-go Slider Calculator', 'Lifetime Deal Banner',
        'Add-on Purchase Checklist', 'Corporate Partnership Form', 'Agency Service Packages', 'Consulting Retainer Options', 'Non-profit Tier Table'
      ],
      FAQs: [
        'Standard Accordion Q&A', 'Two Column Side FAQ List', 'Searchable Category FAQ Grid', 'Inline Expansion FAQ Board', 'Help Center Shortcut Cards',
        'Troubleshooting Guideline Steps', 'Pricing & Refund Policy Q&A', 'Privacy and Terms Quick FAQ', 'AI Assistant Widget FAQ', 'API Developer Documentation FAQ',
        'Email Support Form Shortcut', 'Live Chat CTA Section', 'Community Discord Invite', 'Enterprise SLA Guidelines', 'Billing Management FAQ'
      ],
      Contacts: [
        'Centered Simple Form', 'Split Map & Form Layout', 'Multiple Office Location List', 'Lead Inbound Capture Form', 'Ticket Creator Form Block',
        'Calendar Event Booker Form', 'Electronic Signature Agreement', 'Multi-step Qualification Quiz', 'Newsletter Inline Form', 'Call Back Request Form'
      ],
      Testimonials: [
        'Grid Carousel Reviews', 'Corporate Logo Showcase Bar', 'Single VIP Review Card', 'Alternating Speech Bubbles', 'Trustpilot Badge Display',
        'Video Testimonial Grid', 'Metrics Centered Client Review', 'Left Aligned Text Block Quotes', 'CEO Signature Profile Banner', 'Starred Customer Comments List'
      ],
      Footers: [
        'Minimal Copyright Bar', 'Four Column Directory Footer', 'Brand Profile & Social Icons', 'Newsletter Footer Grid', 'Detailed Legal Disclaimer footer',
        'App Store Banner Links Footer', 'White-label SaaS Footer', 'Language Selector Footer', 'Corporate Headquarters Address Bar', 'Status Indicator Footer'
      ],
      Widgets: [
        'Interactive Video Player', 'Live Stats Count Timer', 'Logo Carousel Scrolling Bar', 'Comparison Table Comparison', 'Process Flow Timeline',
        'Image Accordion Banner', 'Newsletter Modal Trigger Button', 'Interactive Code Sandbox', 'Submenu Navigation Bar', 'Featured Blog Post Carousel',
        'Customer Portal Login Box', 'WhatsApp Chat Floating Button'
      ]
    };

    this.componentCategories.forEach((cat) => {
      const names = presets[cat as keyof typeof presets] || [];
      names.forEach((name, i) => {
        list.push({
          id: `${cat.toLowerCase()}_preset_${i}`,
          name: name,
          category: cat,
          type: this.mapCategoryToSectionType(cat),
          defaultContent: {
            title: name,
            subtitle: `This is a pre-configured ${name} design block. Click to customize its actions and text fields.`
          }
        });
      });
    });

    this.builderComponents.set(list);
  }

  mapCategoryToSectionType(cat: string): 'Hero' | 'Features' | 'Pricing' | 'FAQ' | 'Contact' | 'Footer' | 'Blog' {
    if (cat === 'Heros') return 'Hero';
    if (cat === 'Features') return 'Features';
    if (cat === 'Pricing') return 'Pricing';
    if (cat === 'FAQs') return 'FAQ';
    if (cat === 'Contacts') return 'Contact';
    if (cat === 'Footers') return 'Footer';
    return 'Features'; // fallback
  }

  filteredTemplates() {
    return this.websiteTemplates().filter(t => t.category === this.selectedCategoryFilter());
  }

  getFilteredComponents() {
    return this.builderComponents().filter(c => c.category === this.selectedComponentCategory());
  }

  selectTemplateForCreation(t: any) {
    this.selectedTemplateId.set(t.id);
    this.newSiteTemplate = t.category;
  }

  appendPresetComponent(comp: any) {
    const newSec: WebsiteSection = {
      type: comp.type,
      title: comp.name,
      subtitle: comp.defaultContent.subtitle,
      content: {},
      action: { type: 'none', target: '' }
    };
    this.currentSiteSections.set([...this.currentSiteSections(), newSec]);
    this.selectedSectionIdx.set(this.currentSiteSections().length - 1);
    this.setEditorTab('section');
  }

  moveSectionUp(idx: number) {
    if (idx <= 0) return;
    const list = [...this.currentSiteSections()];
    const temp = list[idx];
    list[idx] = list[idx - 1];
    list[idx - 1] = temp;
    this.currentSiteSections.set(list);
    this.selectedSectionIdx.set(idx - 1);
  }

  moveSectionDown(idx: number) {
    if (idx >= this.currentSiteSections().length - 1) return;
    const list = [...this.currentSiteSections()];
    const temp = list[idx];
    list[idx] = list[idx + 1];
    list[idx + 1] = temp;
    this.currentSiteSections.set(list);
    this.selectedSectionIdx.set(idx + 1);
  }

  loadWebsites() {
    this.apiService.getWebsites().subscribe({
      next: (res) => {
        if (res.success) this.websites.set(res.data);
      }
    });
  }

  setView(view: string) {
    this.activeView.set(view);
  }

  setDevice(device: string) {
    this.deviceMode.set(device);
  }

  setEditorTab(tab: string) {
    this.activeEditorTab.set(tab);
  }

  openCreateSiteModal() {
    this.newSiteName = '';
    this.newSiteTemplate = 'SaaS';
    this.selectedTemplateId.set('');
    this.selectedCategoryFilter.set('SaaS');
    this.showCreateModal.set(true);
  }

  closeCreateSiteModal() {
    this.showCreateModal.set(false);
  }

  createWebsite() {
    const selectedTemplate = this.websiteTemplates().find(t => t.id === this.selectedTemplateId());
    const initialSections = selectedTemplate ? selectedTemplate.layout : undefined;

    const payload = {
      name: this.newSiteName,
      template: this.newSiteTemplate,
      sections: initialSections
    };

    this.apiService.createWebsite(payload).subscribe({
      next: (res) => {
        this.closeCreateSiteModal();
        this.loadWebsites();
      }
    });
  }

  openEditor(site: any) {
    this.currentSite.set(site);
    const sections = (site.sections || []).map((sec: any) => ({
      ...sec,
      action: sec.action || { type: 'none', target: '' }
    }));
    this.currentSiteSections.set(sections);
    this.customDomainInput = site.domain || '';
    this.selectedSectionIdx.set(null);
    this.setView('editor');
  }

  closeEditor() {
    this.currentSite.set(null);
    this.setView('list');
  }

  selectSection(idx: number) {
    this.selectedSectionIdx.set(idx);
    this.setEditorTab('section');
  }

  getSelectedSection(): WebsiteSection | null {
    const idx = this.selectedSectionIdx();
    if (idx === null) return null;
    return this.currentSiteSections()[idx];
  }

  addSection(type: 'Hero' | 'Features' | 'Pricing' | 'Contact') {
    const newSec: WebsiteSection = {
      type,
      title: `New ${type} Section`,
      subtitle: type === 'Hero' ? 'Welcome to our platform' : undefined,
      content: {},
      action: { type: 'none', target: '' }
    };

    this.currentSiteSections.set([...this.currentSiteSections(), newSec]);
    this.selectedSectionIdx.set(this.currentSiteSections().length - 1);
  }

  removeSelectedSection() {
    const idx = this.selectedSectionIdx();
    if (idx !== null) {
      const cur = this.currentSiteSections();
      cur.splice(idx, 1);
      this.currentSiteSections.set([...cur]);
      this.selectedSectionIdx.set(null);
    }
  }

  saveWebsiteLayout() {
    const site = this.currentSite();
    if (!site) return;

    const payload = {
      sections: this.currentSiteSections(),
      domain: this.customDomainInput,
    };

    this.apiService.updateWebsite(site._id, payload).subscribe({
      next: (res) => {
        this.loadWebsites();
        this.closeEditor();
      }
    });
  }

  togglePublish() {
    const site = this.currentSite();
    if (!site) return;

    const nextState = !site.published;

    this.apiService.publishWebsite(site._id, { published: nextState, customDomain: this.customDomainInput }).subscribe({
      next: (res) => {
        if (res.success) {
          this.currentSite.set(res.data);
          this.loadWebsites();
        }
      }
    });
  }

  deleteSite(id: string) {
    if (confirm('Delete this website permanently?')) {
      this.apiService.deleteWebsite(id).subscribe({
        next: () => this.loadWebsites()
      });
    }
  }
}
