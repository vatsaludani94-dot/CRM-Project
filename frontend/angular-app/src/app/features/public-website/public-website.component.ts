import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  sender: 'visitor' | 'assistant';
  text: string;
  time: Date;
}

@Component({
  selector: 'app-public-website',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#fafaf9] text-[#1c1917] font-sans selection:bg-[#1c1917] selection:text-white relative overflow-hidden transition-all">
      
      <!-- Top Promotion Alert Banner Link (Universal Action System) -->
      <div (click)="triggerAction('banner', { type: 'internal_route', target: 'register' })" class="bg-gradient-to-r from-[#1c1917] via-[#292524] to-[#1c1917] text-white text-xs font-bold text-center py-3 px-4 flex justify-center items-center gap-2 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all relative z-50">
        <span class="bg-amber-700 text-white text-[10px] uppercase px-2 py-0.5 rounded">Update</span>
        <span>GrownX SaaS Enterprise Suite now active! Click here to spin up a free 14-day trial workspace →</span>
        <span class="material-icons text-sm">arrow_forward</span>
      </div>

      <!-- Ambient decorative mesh gradient backgrounds -->
      <div class="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 animate-floating-orb rounded-full blur-[160px] pointer-events-none"></div>
      <div class="absolute bottom-20 right-1/4 w-[700px] h-[700px] bg-stone-400/10 animate-floating-orb rounded-full blur-[180px] pointer-events-none"></div>

      <!-- Premium Navigation Header -->
      <header class="border-b border-[#e7e5e4] glass-porcelain-header backdrop-blur-md sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div class="flex items-center gap-10">
            <a href="#" (click)="setTab('home')" class="flex items-center gap-2.5 group">
              <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1c1917] to-[#292524] flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-all duration-300">
                <span class="material-icons text-white font-black">bolt</span>
              </div>
              <span class="text-xl font-black tracking-tight text-[#1c1917] group-hover:text-amber-600 transition-colors">GrownX<span class="text-amber-600 font-medium">CRM</span></span>
            </a>
            
            <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-[#44403c]">
              <a href="javascript:void(0)" (click)="setTab('home')" [class.text-[#1c1917]]="activeTab() === 'home'" [class.font-extrabold] class="hover:text-[#1c1917] transition-colors">Platform</a>
              <a href="javascript:void(0)" (click)="setTab('features')" [class.text-[#1c1917]]="activeTab() === 'features'" [class.font-extrabold] class="hover:text-[#1c1917] transition-colors">Features Matrix</a>
              <a href="javascript:void(0)" (click)="setTab('templates')" [class.text-[#1c1917]]="activeTab() === 'templates'" [class.font-extrabold] class="hover:text-[#1c1917] transition-colors">Marketplace</a>
              <a href="javascript:void(0)" (click)="setTab('pricing')" [class.text-[#1c1917]]="activeTab() === 'pricing'" [class.font-extrabold] class="hover:text-[#1c1917] transition-colors">Tiers Pricing</a>
              <a href="javascript:void(0)" (click)="setTab('about')" [class.text-[#1c1917]]="activeTab() === 'about'" [class.font-extrabold] class="hover:text-[#1c1917] transition-colors">About Us</a>
            </nav>
          </div>

          <div class="flex items-center gap-4">
            <a routerLink="/login" class="text-sm font-bold text-[#44403c] hover:text-[#1c1917] transition-colors px-4 py-2">Sign In</a>
            <a (click)="setTab('register')" class="text-sm font-bold bg-[#1c1917] hover:bg-[#292524] text-white px-5 py-2.5 rounded-xl shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 cursor-pointer">
              Get Started
            </a>
          </div>
        </div>
      </header>

      <!-- Main Contents (Dynamic Tabs) -->
      <main class="relative z-10 max-w-7xl mx-auto px-6 py-12">
        
        <!-- Tab: Home / Product -->
        <div *ngIf="activeTab() === 'home'" class="space-y-24 animate-fadeIn">
          
          <!-- Hero Section -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
            <div class="lg:col-span-7 space-y-6">
              <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-[#1c1917] border border-slate-200/90 shadow-sm">
                <span class="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                GrownX technologies Enterprise SaaS Suite
              </span>
              <h1 class="text-5xl lg:text-7xl font-extrabold tracking-tight text-[#1c1917] leading-[1.05]">
                A Single Platform for <br/>
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#1c1917] via-[#44403c] to-[#b45309]">
                  Visual CRM Operations
                </span>
              </h1>
              <p class="text-lg text-[#44403c] leading-relaxed max-w-2xl">
                Close pipelines faster. Orchestrate visual automation workflows, synchronize Gmail templates, organize Google Drive folders, and manage company builders without code.
              </p>
              <div class="flex flex-wrap gap-4 pt-2">
                <a (click)="setTab('register')" class="bg-gradient-to-r from-[#1c1917] to-[#292524] hover:from-indigo-400 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-0.5 cursor-pointer">
                  Start Free 14-Day Trial
                </a>
                <a (click)="scrollToDemo()" class="bg-white hover:bg-slate-50 border border-slate-200/90 text-[#1c1917] shadow-sm font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer">
                  Experience Live Demo
                </a>
              </div>
            </div>
            
            <div class="lg:col-span-5 relative flex justify-center">
              <div class="w-full max-w-md bg-white border border-[#e7e5e4] shadow-sm border border-[#e7e5e4] p-8 rounded-3xl backdrop-blur-xl relative shadow-2xl space-y-4">
                <div class="absolute -top-3 -right-3 h-12 w-12 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center animate-bounce">
                  <span class="material-icons text-slate-800 text-sm">auto_awesome</span>
                </div>
                <h3 class="text-lg font-extrabold text-[#1c1917]">Visual Campaign Setup</h3>
                <p class="text-xs text-[#44403c] leading-relaxed">Simulate automated responses immediately. New leads automatically trigger configured workflows.</p>
                
                <div class="space-y-3 bg-white text-[#1c1917] border border-slate-200 p-4 rounded-2xl border border-[#e7e5e4] text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-[#44403c]">Active Contacts:</span>
                    <strong class="text-[#1c1917]">{{ statsContacts() }}+</strong>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[#44403c]">Conversion Rate:</span>
                    <strong class="text-[#1c1917]">{{ statsRate() }}%</strong>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[#44403c]">Monthly Revenue:</span>
                    <strong class="text-emerald-400">\${{ statsRevenue() }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Clickable Box, Card and Promotion Tile CTA (Universal Actions System) -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            
            <!-- Clickable Banner Box -->
            <div (click)="triggerAction('box', { type: 'internal_route', target: 'features' })" class="bg-white border border-[#e7e5e4] shadow-sm hover:bg-white hover:border-amber-600/50 hover:shadow-xl border border-[#e7e5e4] hover:border-slate-800 p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group flex flex-col justify-between h-48">
              <div class="space-y-2">
                <div class="flex items-center gap-2 text-[#1c1917]">
                  <span class="material-icons text-md">grid_view</span>
                  <span class="text-[10px] uppercase font-bold tracking-wider">Modular Box</span>
                </div>
                <h4 class="text-md font-bold text-[#1c1917] group-hover:text-amber-600 transition-colors">18 Feature Modules Matrix</h4>
                <p class="text-xs text-[#44403c] leading-relaxed">Browse the comprehensive directory of pipelines, support desks, and payroll tools.</p>
              </div>
              <span class="text-[10px] text-[#1c1917] font-bold uppercase flex items-center gap-1">Inspect Modules <span class="material-icons text-xs">arrow_forward</span></span>
            </div>

            <!-- Clickable CTA Card -->
            <div (click)="triggerAction('card', { type: 'internal_route', target: 'templates' })" class="bg-white border border-[#e7e5e4] shadow-sm hover:bg-white hover:border-amber-600/50 hover:shadow-xl border border-[#e7e5e4] hover:border-slate-800 p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group flex flex-col justify-between h-48">
              <div class="space-y-2">
                <div class="flex items-center gap-2 text-amber-700">
                  <span class="material-icons text-md">shopping_bag</span>
                  <span class="text-[10px] uppercase font-bold tracking-wider">Marketplace</span>
                </div>
                <h4 class="text-md font-bold text-[#1c1917] group-hover:text-amber-700 transition-colors">100+ Professional Templates</h4>
                <p class="text-xs text-[#44403c] leading-relaxed">Instantly load customized templates for SaaS, law firms, healthcare, and agencies.</p>
              </div>
              <span class="text-[10px] text-amber-700 font-bold uppercase flex items-center gap-1">Explore Templates <span class="material-icons text-xs">arrow_forward</span></span>
            </div>

            <!-- Clickable Promotional Tile -->
            <div (click)="triggerAction('tile', { type: 'internal_route', target: 'pricing' })" class="bg-white border border-[#e7e5e4] shadow-sm hover:bg-white hover:border-amber-600/50 hover:shadow-xl border border-[#e7e5e4] hover:border-slate-800 p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group flex flex-col justify-between h-48">
              <div class="space-y-2">
                <div class="flex items-center gap-2 text-slate-800">
                  <span class="material-icons text-md">sell</span>
                  <span class="text-[10px] uppercase font-bold tracking-wider">Promotional Tile</span>
                </div>
                <h4 class="text-md font-bold text-[#1c1917] group-hover:text-slate-800 transition-colors">Simple Subscription Tiers</h4>
                <p class="text-xs text-[#44403c] leading-relaxed">Discover plans for startups and enterprise. Start with a 14-day free trial workspace.</p>
              </div>
              <span class="text-[10px] text-slate-800 font-bold uppercase flex items-center gap-1">Review Plans <span class="material-icons text-xs">arrow_forward</span></span>
            </div>

          </div>

          <!-- Section: Interactive Product Demonstrations -->
          <div id="demo-section" class="space-y-8 pt-12 scroll-mt-24">
            <div class="text-center max-w-2xl mx-auto space-y-4">
              <h2 class="text-3xl font-extrabold text-[#1c1917]">Experience GrownX in Real-Time</h2>
              <p class="text-[#44403c] text-sm">Interact with live demo screens to experience the platform features before signing up.</p>
            </div>

            <div class="bg-white border border-[#e7e5e4] shadow-sm border border-[#e7e5e4] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
              <!-- Demo Selector Tabs -->
              <div class="flex flex-wrap border-b border-[#e7e5e4]/80 bg-slate-100 p-2 text-xs font-bold gap-1">
                <button (click)="setDemoTab('crm')" [class.bg-[#1c1917] text-white shadow-md]="activeDemoTab() === 'crm'" [class.text-[#1c1917]]="activeDemoTab() === 'crm'" class="px-5 py-2.5 rounded-xl text-[#44403c] hover:text-[#1c1917] transition-all flex items-center gap-2 cursor-pointer">
                  <span class="material-icons text-sm">dashboard</span> CRM Dashboard
                </button>
                <button (click)="setDemoTab('pipeline')" [class.bg-[#1c1917] text-white shadow-md]="activeDemoTab() === 'pipeline'" [class.text-[#1c1917]]="activeDemoTab() === 'pipeline'" class="px-5 py-2.5 rounded-xl text-[#44403c] hover:text-[#1c1917] transition-all flex items-center gap-2 cursor-pointer">
                  <span class="material-icons text-sm">leaderboard</span> Kanban Pipeline
                </button>
                <button (click)="setDemoTab('workflow')" [class.bg-[#1c1917] text-white shadow-md]="activeDemoTab() === 'workflow'" [class.text-[#1c1917]]="activeDemoTab() === 'workflow'" class="px-5 py-2.5 rounded-xl text-[#44403c] hover:text-[#1c1917] transition-all flex items-center gap-2 cursor-pointer">
                  <span class="material-icons text-sm">account_tree</span> Workflow Automation
                </button>
                <button (click)="setDemoTab('funnel')" [class.bg-[#1c1917] text-white shadow-md]="activeDemoTab() === 'funnel'" [class.text-[#1c1917]]="activeDemoTab() === 'funnel'" class="px-5 py-2.5 rounded-xl text-[#44403c] hover:text-[#1c1917] transition-all flex items-center gap-2 cursor-pointer">
                  <span class="material-icons text-sm">filter_alt</span> Sales Funnel
                </button>
                <button (click)="setDemoTab('calendar')" [class.bg-[#1c1917] text-white shadow-md]="activeDemoTab() === 'calendar'" [class.text-[#1c1917]]="activeDemoTab() === 'calendar'" class="px-5 py-2.5 rounded-xl text-[#44403c] hover:text-[#1c1917] transition-all flex items-center gap-2 cursor-pointer">
                  <span class="material-icons text-sm">calendar_month</span> Calendar Scheduler
                </button>
              </div>

              <!-- Demo Views Panel -->
              <div class="p-8 min-h-[400px] flex items-center justify-center bg-[#1c1917]/20 text-slate-100">
                
                <!-- Demo View 1: CRM Dashboard -->
                <div *ngIf="activeDemoTab() === 'crm'" class="w-full max-w-xl space-y-6 animate-fadeIn">
                  <div class="flex justify-between items-center">
                    <h4 class="text-sm font-bold uppercase tracking-wider text-[#44403c]">Mock Executive KPI Simulator</h4>
                    <span class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-black uppercase">Click cards to select active graph</span>
                  </div>
                  
                  <div class="grid grid-cols-3 gap-3">
                    <div (click)="selectCrmMetric('revenue')" [class.ring-2]="selectedCrmMetric() === 'revenue'" class="bg-white text-[#1c1917] border border-slate-200 p-4 rounded-xl border border-[#e7e5e4] cursor-pointer hover:border-slate-800 transition-all">
                      <p class="text-[10px] text-[#44403c] font-bold uppercase">Revenue</p>
                      <p class="text-lg font-black mt-1 text-[#1c1917]">$625,000</p>
                    </div>
                    <div (click)="selectCrmMetric('leads')" [class.ring-2]="selectedCrmMetric() === 'leads'" class="bg-white text-[#1c1917] border border-slate-200 p-4 rounded-xl border border-[#e7e5e4] cursor-pointer hover:border-slate-800 transition-all">
                      <p class="text-[10px] text-[#44403c] font-bold uppercase">Active Leads</p>
                      <p class="text-lg font-black mt-1 text-[#1c1917]">18</p>
                    </div>
                    <div (click)="selectCrmMetric('rate')" [class.ring-2]="selectedCrmMetric() === 'rate'" class="bg-white text-[#1c1917] border border-slate-200 p-4 rounded-xl border border-[#e7e5e4] cursor-pointer hover:border-slate-800 transition-all">
                      <p class="text-[10px] text-[#44403c] font-bold uppercase">Conv. Rate</p>
                      <p class="text-lg font-black mt-1 text-[#1c1917]">42%</p>
                    </div>
                  </div>

                  <div class="bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] p-6 rounded-2xl h-48 flex flex-col justify-between">
                    <p class="text-xs font-bold text-[#44403c] uppercase">Active Metric: {{ selectedCrmMetric() | uppercase }} trend line</p>
                    <div class="flex items-end gap-2 h-28 pt-2">
                      <div class="w-full bg-indigo-500/10 border-t-2 border-indigo-500 rounded" [style.height.%]="selectedCrmMetric() === 'revenue' ? 25 : selectedCrmMetric() === 'leads' ? 60 : 40"></div>
                      <div class="w-full bg-indigo-500/10 border-t-2 border-indigo-500 rounded" [style.height.%]="selectedCrmMetric() === 'revenue' ? 45 : selectedCrmMetric() === 'leads' ? 50 : 35"></div>
                      <div class="w-full bg-indigo-500/10 border-t-2 border-indigo-500 rounded" [style.height.%]="selectedCrmMetric() === 'revenue' ? 70 : selectedCrmMetric() === 'leads' ? 80 : 50"></div>
                      <div class="w-full bg-indigo-500/10 border-t-2 border-indigo-500 rounded" [style.height.%]="selectedCrmMetric() === 'revenue' ? 95 : selectedCrmMetric() === 'leads' ? 40 : 75"></div>
                    </div>
                  </div>
                </div>

                <!-- Demo View 2: Kanban Pipeline -->
                <div *ngIf="activeDemoTab() === 'pipeline'" class="w-full max-w-xl space-y-6 animate-fadeIn">
                  <div class="flex justify-between items-center">
                    <h4 class="text-sm font-bold uppercase tracking-wider text-[#44403c]">Interactive Pipeline Simulator</h4>
                    <span class="text-[10px] text-[#1c1917] font-bold">Total Converted: \${{ demoConvertedRevenue().toLocaleString() }}</span>
                  </div>

                  <div class="grid grid-cols-3 gap-4">
                    <!-- Column 1: New -->
                    <div class="bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] p-3 rounded-2xl min-h-[180px] space-y-2">
                      <p class="text-[10px] font-black uppercase text-[#44403c] pb-1 border-b border-[#e7e5e4]">New Inquiries</p>
                      
                      <div *ngFor="let lead of demoLeads()" class="bg-[#1c1917] border border-slate-800 p-3 rounded-xl space-y-1 relative group cursor-pointer hover:border-slate-700 transition-colors">
                        <p class="text-xs font-bold text-[#1c1917]">{{ lead.name }}</p>
                        <p class="text-[9px] text-[#1c1917] font-bold">\${{ lead.val.toLocaleString() }}</p>
                        <button (click)="moveDemoLead(lead)" class="mt-2 w-full py-1 bg-[#1c1917] hover:bg-[#292524] text-white rounded text-[8px] font-black uppercase">Move Next</button>
                      </div>
                    </div>

                    <!-- Column 2: Contacted -->
                    <div class="bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] p-3 rounded-2xl min-h-[180px] space-y-2">
                      <p class="text-[10px] font-black uppercase text-[#44403c] pb-1 border-b border-[#e7e5e4]">Contacted</p>
                      <div *ngFor="let lead of demoContacted()" class="bg-[#1c1917] border border-slate-800 p-3 rounded-xl space-y-1 relative group cursor-pointer hover:border-slate-700 transition-colors">
                        <p class="text-xs font-bold text-[#1c1917]">{{ lead.name }}</p>
                        <p class="text-[9px] text-[#1c1917] font-bold">\${{ lead.val.toLocaleString() }}</p>
                        <button (click)="moveDemoLead(lead)" class="mt-2 w-full py-1 bg-[#1c1917] hover:bg-[#292524] text-white rounded text-[8px] font-black uppercase">Convert Deal</button>
                      </div>
                    </div>

                    <!-- Column 3: Converted -->
                    <div class="bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] p-3 rounded-2xl min-h-[180px] space-y-2">
                      <p class="text-[10px] font-black uppercase text-emerald-500 pb-1 border-b border-[#e7e5e4]">Converted VIPs</p>
                      <div *ngFor="let lead of demoConverted()" class="bg-[#1c1917]/50 border border-emerald-950/60 p-3 rounded-xl space-y-1 relative group transition-colors">
                        <p class="text-xs font-bold text-[#292524]">{{ lead.name }}</p>
                        <p class="text-[9px] text-emerald-400 font-bold">\${{ lead.val.toLocaleString() }}</p>
                        <span class="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded font-black uppercase inline-block mt-2">Active Client</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Demo View 3: Workflow Automation -->
                <div *ngIf="activeDemoTab() === 'workflow'" class="w-full max-w-xl space-y-6 animate-fadeIn">
                  <div class="flex justify-between items-center">
                    <h4 class="text-sm font-bold uppercase tracking-wider text-[#44403c]">Interactive Automation Run</h4>
                    <button (click)="simulateWorkflowRun()" [disabled]="workflowRunning()" class="bg-[#1c1917] hover:bg-[#292524] disabled:opacity-50 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase">
                      {{ workflowRunning() ? 'Running...' : 'Simulate Trigger' }}
                    </button>
                  </div>

                  <div class="space-y-4">
                    <div class="flex items-center gap-3 bg-white text-[#1c1917] border border-slate-200 p-4 rounded-xl border" [class.border-indigo-500]="workflowStep() >= 1" [class.border-[#e7e5e4]]="workflowStep() < 1">
                      <span class="material-icons text-md" [class.text-[#1c1917]]="workflowStep() >= 1" [class.text-[#44403c]]="workflowStep() < 1">person_add</span>
                      <div class="flex-1">
                        <p class="text-xs font-bold text-[#1c1917]">Trigger: Lead Created</p>
                        <p class="text-[10px] text-[#44403c]">Event fired upon registration</p>
                      </div>
                      <span class="material-icons text-sm text-emerald-500" *ngIf="workflowStep() >= 1">check_circle</span>
                    </div>

                    <div class="flex items-center gap-3 bg-white text-[#1c1917] border border-slate-200 p-4 rounded-xl border" [class.border-indigo-500]="workflowStep() >= 2" [class.border-[#e7e5e4]]="workflowStep() < 2">
                      <span class="material-icons text-md" [class.text-[#1c1917]]="workflowStep() >= 2" [class.text-[#44403c]]="workflowStep() < 2">schedule</span>
                      <div class="flex-1 flex items-center justify-between">
                        <div>
                          <p class="text-xs font-bold text-[#1c1917]">Delay: 1 Minutes</p>
                          <p class="text-[10px] text-[#44403c]">Wait duration scheduler</p>
                        </div>
                        <div *ngIf="workflowRunning() && workflowStep() === 1" class="h-1.5 w-24 bg-[#1c1917] rounded-full overflow-hidden">
                          <div class="h-full bg-indigo-500 animate-progressBar"></div>
                        </div>
                      </div>
                      <span class="material-icons text-sm text-emerald-500" *ngIf="workflowStep() >= 2">check_circle</span>
                    </div>

                    <div class="flex items-center gap-3 bg-white text-[#1c1917] border border-slate-200 p-4 rounded-xl border" [class.border-indigo-500]="workflowStep() >= 3" [class.border-[#e7e5e4]]="workflowStep() < 3">
                      <span class="material-icons text-md" [class.text-[#1c1917]]="workflowStep() >= 3" [class.text-[#44403c]]="workflowStep() < 3">mail</span>
                      <div class="flex-1">
                        <p class="text-xs font-bold text-[#1c1917]">Action: Send Welcome Email</p>
                        <p class="text-[10px] text-[#44403c]">Dispatches mock template from OAuth</p>
                      </div>
                      <span class="material-icons text-sm text-emerald-500" *ngIf="workflowStep() >= 3">check_circle</span>
                    </div>
                  </div>
                </div>

                <!-- Demo View 4: Sales Funnel -->
                <div *ngIf="activeDemoTab() === 'funnel'" class="w-full max-w-xl space-y-6 animate-fadeIn">
                  <div class="flex justify-between items-center">
                    <h4 class="text-sm font-bold uppercase tracking-wider text-[#44403c]">Interactive Funnel Simulator</h4>
                    <button (click)="simulateFunnelTraffic()" class="bg-[#1c1917] hover:bg-[#292524] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase">Simulate Traffic +100</button>
                  </div>

                  <div class="space-y-4">
                    <div class="space-y-1.5">
                      <div class="flex justify-between text-xs font-bold">
                        <span>1. Landing Page (Visits)</span>
                        <span>{{ funnelVisits() }} Visits</span>
                      </div>
                      <div class="h-3 bg-white text-[#1c1917] border border-slate-200 rounded-full overflow-hidden border border-[#e7e5e4]">
                        <div class="h-full bg-indigo-500" style="width: 100%"></div>
                      </div>
                    </div>

                    <div class="space-y-1.5">
                      <div class="flex justify-between text-xs font-bold">
                        <span>2. Opt-in Form (Leads)</span>
                        <span>{{ funnelLeads() }} Leads (Conv: {{ funnelConvRate() }}%)</span>
                      </div>
                      <div class="h-3 bg-white text-[#1c1917] border border-slate-200 rounded-full overflow-hidden border border-[#e7e5e4]">
                        <div class="h-full bg-purple-500" [style.width.%]="funnelConvRate()"></div>
                      </div>
                    </div>

                    <div class="space-y-1.5">
                      <div class="flex justify-between text-xs font-bold">
                        <span>3. Booked Demo Sales (Revenue)</span>
                        <span>\${{ funnelRevenue().toLocaleString() }} Generated</span>
                      </div>
                      <div class="h-3 bg-white text-[#1c1917] border border-slate-200 rounded-full overflow-hidden border border-[#e7e5e4]">
                        <div class="h-full bg-emerald-500" [style.width.%]="funnelConvRate() / 2"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Demo View 5: Calendar Grid -->
                <div *ngIf="activeDemoTab() === 'calendar'" class="w-full max-w-xl space-y-4 animate-fadeIn">
                  <div class="flex justify-between items-center">
                    <h4 class="text-sm font-bold uppercase tracking-wider text-[#44403c]">Weekly Schedule Grid Simulator</h4>
                    <span class="text-[10px] bg-indigo-500/10 text-[#1c1917] px-2 py-0.5 rounded font-black uppercase">Click cells to schedule demo slot</span>
                  </div>

                  <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#44403c]">
                    <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                  </div>

                  <div class="grid grid-cols-7 gap-1">
                    <div *ngFor="let cell of calendarCells(); let idx = index" (click)="bookCalendarSlot(idx)" [class.bg-white text-[#1c1917] border border-slate-200]="!cell.booked" [class.bg-[#1c1917] text-white shadow-md]="cell.booked" [class.border-slate-800]="!cell.booked" [class.border-indigo-600]="cell.booked" class="h-10 border rounded-lg flex items-center justify-center cursor-pointer transition-colors relative group">
                      <span class="material-icons text-xs text-white" *ngIf="cell.booked">check_circle</span>
                      <div *ngIf="cell.booked" class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white text-[#1c1917] border border-slate-200 text-[8px] font-bold text-white px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        {{ cell.subject }}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        <!-- Tab: Features Matrix -->
        <div *ngIf="activeTab() === 'features'" class="space-y-12 animate-fadeIn">
          <div class="text-center max-w-2xl mx-auto space-y-4">
            <h2 class="text-3xl font-extrabold text-[#1c1917]">Enterprise Feature Modules</h2>
            <p class="text-[#44403c]">The GrownX CRM ecosystem consists of 18 integrated modules scaling your workflows, pipelines, and document systems.</p>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="bg-white border border-[#e7e5e4] shadow-sm border border-[#e7e5e4] p-6 rounded-2xl hover:border-slate-800 hover:-translate-y-0.5 transition-all duration-300" *ngFor="let feat of featuresList">
              <span class="material-icons text-[#1c1917] text-3xl mb-4 bg-amber-500/10 animate-floating-orb p-3 rounded-xl inline-block">{{ feat.icon }}</span>
              <h4 class="font-extrabold text-white mb-2">{{ feat.title }}</h4>
              <p class="text-xs text-[#44403c] leading-relaxed">{{ feat.desc }}</p>
            </div>
          </div>
        </div>

        <!-- Tab: Template Marketplace Gallery (100+ Website Templates & 50+ Funnels) -->
        <div *ngIf="activeTab() === 'templates'" class="space-y-12 animate-fadeIn">
          <div class="text-center max-w-2xl mx-auto space-y-4">
            <h2 class="text-3xl font-extrabold text-[#1c1917]">Template Marketplace Library</h2>
            <p class="text-[#44403c] text-sm">Select from over 100+ categorized professional company website templates and 50+ funnel layouts.</p>
          </div>

          <!-- Gallery Type Toggle -->
          <div class="flex justify-center gap-3">
            <button (click)="setMarketTab('web')" [class.bg-[#1c1917] text-white shadow-md]="activeMarketTab() === 'web'" class="bg-[#1c1917] hover:bg-white hover:border-amber-600/50 hover:shadow-xl text-white font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer">
              Website Templates (108 Available)
            </button>
            <button (click)="setMarketTab('funnel')" [class.bg-[#1c1917] text-white shadow-md]="activeMarketTab() === 'funnel'" class="bg-[#1c1917] hover:bg-white hover:border-amber-600/50 hover:shadow-xl text-white font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer">
              Sales Funnel Templates (54 Available)
            </button>
          </div>

          <!-- Websites gallery -->
          <div *ngIf="activeMarketTab() === 'web'" class="space-y-8 animate-fadeIn">
            
            <!-- Category filters -->
            <div class="flex flex-wrap gap-2 justify-center text-xs font-semibold">
              <button *ngFor="let cat of templateCategories" (click)="setTemplateFilter(cat)" [class.bg-[#1c1917] text-white shadow-md]="activeTemplateFilter() === cat" class="px-4 py-2 rounded-xl bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] text-[#292524] hover:text-[#1c1917] cursor-pointer transition-colors">
                {{ cat }}
              </button>
            </div>

            <!-- Templates Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div *ngFor="let t of filteredTemplates()" class="bg-[#1c1917]/30 border border-[#e7e5e4] hover:border-indigo-500/50 p-6 rounded-2xl flex flex-col justify-between space-y-4 group transition-all">
                <div>
                  <div class="flex justify-between items-start">
                    <span class="text-[9px] font-black uppercase bg-indigo-500/10 text-[#1c1917] px-2 py-0.5 rounded">{{ t.category }}</span>
                    <span class="text-[8px] bg-slate-800 text-[#44403c] px-2 py-0.5 rounded font-bold">100% Configurable</span>
                  </div>
                  <h4 class="text-md font-extrabold text-white pt-3 group-hover:text-amber-600 transition-colors">{{ t.name }}</h4>
                  <p class="text-xs text-[#44403c] pt-1 leading-relaxed">{{ t.desc }}</p>
                </div>
                <button (click)="setTab('register')" class="w-full bg-white text-[#1c1917] border border-slate-200 hover:bg-white hover:border-amber-600/50 hover:shadow-xl text-white shadow-md text-white text-xs font-bold py-2.5 rounded-xl border border-[#e7e5e4] hover:border-transparent transition-all mt-4">
                  Select Template
                </button>
              </div>
            </div>
          </div>

          <!-- Funnel gallery -->
          <div *ngIf="activeMarketTab() === 'funnel'" class="space-y-6 animate-fadeIn">
            <!-- Funnel templates list -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div *ngFor="let fn of mockFunnelsList" class="bg-[#1c1917]/30 border border-[#e7e5e4] hover:border-violet-500/50 p-6 rounded-2xl flex flex-col justify-between space-y-4 group transition-all">
                <div>
                  <div class="flex justify-between items-start">
                    <span class="text-[9px] font-black uppercase bg-violet-500/10 text-amber-700 px-2 py-0.5 rounded">{{ fn.type }}</span>
                    <span class="text-[10px] text-[#44403c] font-bold">Steps: {{ fn.steps }}</span>
                  </div>
                  <h4 class="text-md font-extrabold text-white pt-3 group-hover:text-amber-700 transition-colors">{{ fn.name }}</h4>
                  <p class="text-xs text-[#44403c] pt-1 leading-relaxed">Simulates lead captures, scheduling pages, and checking conversion rate records.</p>
                </div>
                <button (click)="setTab('register')" class="w-full bg-white text-[#1c1917] border border-slate-200 hover:bg-violet-600 text-white text-xs font-bold py-2.5 rounded-xl border border-[#e7e5e4] hover:border-transparent transition-all mt-4">
                  Select Funnel
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: Pricing -->
        <div *ngIf="activeTab() === 'pricing'" class="space-y-12 animate-fadeIn">
          <div class="text-center max-w-2xl mx-auto space-y-4">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 px-4 py-1.5 rounded-full">Commercial Licenses & Standalone Suites</span>
            <h2 class="text-3xl font-black text-[#1c1917]">Commercial Software Tiers</h2>
            <p class="text-[#44403c] text-sm">Purchase a lifetime software license to instantly receive your license key, downloadable installer package (.ZIP), and official tax invoice.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Starter License Card -->
            <div class="border border-[#e7e5e4] bg-white p-8 rounded-3xl space-y-6 flex flex-col justify-between shadow-lg">
              <div class="space-y-4">
                <span class="text-xs font-bold text-[#1c1917] bg-stone-100 border border-[#e7e5e4] px-3 py-1 rounded-full uppercase">Starter Edition</span>
                <h3 class="text-3.5xl font-black text-[#1c1917]">₹4,999 <span class="text-xs font-semibold text-[#44403c]">/ one-time</span></h3>
                <p class="text-xs text-[#44403c]">Essential standalone software suite for small business teams.</p>
                <ul class="space-y-2.5 text-xs text-[#292524] pt-4">
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> 1 Standalone Server License</li>
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Kanban pipeline & Customer 360</li>
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Standalone ZIP Installer Package</li>
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Official Tax Invoice Email</li>
                </ul>
              </div>
              <button (click)="triggerBuyPlan('Starter License', 4999)" class="w-full bg-[#1c1917] hover:bg-[#292524] py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all mt-6 cursor-pointer">Buy Starter License</button>
            </div>

            <!-- Growth Edition Card -->
            <div class="border-2 border-amber-600 bg-white p-8 rounded-3xl space-y-6 flex flex-col justify-between relative shadow-2xl">
              <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[9px] font-black tracking-wider px-4 py-1 rounded-full uppercase shadow-md">Best Value</div>
              <div class="space-y-4">
                <span class="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full uppercase">Growth Edition</span>
                <h3 class="text-3.5xl font-black text-[#1c1917]">₹9,999 <span class="text-xs font-semibold text-[#44403c]">/ one-time</span></h3>
                <p class="text-xs text-[#44403c]">Full commercial suite with Gmail OAuth & Visual Workflows.</p>
                <ul class="space-y-2.5 text-xs text-[#292524] pt-4">
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Unlimited User Licenses</li>
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Gmail OAuth & Gmail Center</li>
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Visual Automation Workflows</li>
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Instant ZIP Package & License Key</li>
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Automated Dual Invoice Emails</li>
                </ul>
              </div>
              <button (click)="triggerBuyPlan('Growth Edition', 9999)" class="w-full bg-amber-700 hover:bg-amber-800 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all mt-6 cursor-pointer">Buy Growth Suite</button>
            </div>

            <!-- Enterprise Edition Card -->
            <div class="border border-[#e7e5e4] bg-white p-8 rounded-3xl space-y-6 flex flex-col justify-between shadow-lg">
              <div class="space-y-4">
                <span class="text-xs font-bold text-[#1c1917] bg-stone-100 border border-[#e7e5e4] px-3 py-1 rounded-full uppercase">Enterprise Edition</span>
                <h3 class="text-3.5xl font-black text-[#1c1917]">₹19,999 <span class="text-xs font-semibold text-[#44403c]">/ one-time</span></h3>
                <p class="text-xs text-[#44403c]">Complete source package, dedicated support, and custom domain setup.</p>
                <ul class="space-y-2.5 text-xs text-[#292524] pt-4">
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Full Standalone Source Code Package</li>
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Dedicated Founder Setup Support</li>
                  <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Priority WhatsApp & Email SLA</li>
                </ul>
              </div>
              <button (click)="triggerBuyPlan('Enterprise Suite', 19999)" class="w-full bg-[#1c1917] hover:bg-[#292524] py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all mt-6 cursor-pointer">Buy Enterprise Suite</button>
            </div>
          </div>
        </div>

        <!-- Tab: About -->
        <div *ngIf="activeTab() === 'about'" class="space-y-10 max-w-4xl mx-auto animate-fadeIn py-8">
          <div class="text-center space-y-4">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 px-4 py-1.5 rounded-full">Company & Leadership</span>
            <h2 class="text-3xl lg:text-4xl font-black text-[#1c1917]">About GrownX CRM</h2>
            <p class="text-[#44403c] leading-relaxed text-md max-w-2xl mx-auto">
              GrownX CRM is a next-generation commercial software suite designed to streamline sales pipelines, automated email communications, visual workflows, and customer account operations with absolute performance and precision.
            </p>
          </div>

          <div class="bg-white border border-[#e7e5e4] shadow-xl p-8 rounded-3xl space-y-6">
            <h3 class="text-xl font-extrabold text-[#1c1917] border-b border-[#e7e5e4] pb-4">Founder & Engineering Leadership</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="h-12 w-12 rounded-2xl bg-[#1c1917] text-white flex items-center justify-center font-black text-lg shadow-md">VU</div>
                  <div>
                    <h4 class="text-lg font-black text-[#1c1917]">Vatsal Udani</h4>
                    <p class="text-xs font-bold text-amber-700">Founder & Lead Software Architect</p>
                  </div>
                </div>
                <p class="text-xs text-[#44403c] leading-relaxed">
                  Dedicated to delivering high-performance, easy-to-use business software engineered for modern sales teams, entrepreneurs, and growing enterprise operations.
                </p>
              </div>

              <div class="bg-stone-50 border border-[#e7e5e4] p-5 rounded-2xl space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-[#1c1917]">Direct Founder Contact</h4>
                
                <div class="flex items-center gap-3 text-xs text-[#1c1917]">
                  <span class="material-icons text-amber-700 text-sm">email</span>
                  <a href="mailto:vatsaludani94@gmail.com" class="font-bold hover:underline">vatsaludani94@gmail.com</a>
                </div>

                <div class="flex items-center gap-3 text-xs text-[#1c1917]">
                  <span class="material-icons text-amber-700 text-sm">phone</span>
                  <a href="tel:+917624026264" class="font-bold hover:underline">+91 7624026264</a>
                </div>

                <div class="flex items-center gap-3 text-xs text-[#1c1917]">
                  <span class="material-icons text-amber-700 text-sm">location_on</span>
                  <span class="font-medium text-[#44403c]">Gujarat, India</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: Register / Lead Acquisition Flow -->
        <div *ngIf="activeTab() === 'register'" class="max-w-md mx-auto animate-fadeIn py-6">
          <div class="bg-[#1c1917] border border-[#e7e5e4] p-8 rounded-3xl shadow-2xl space-y-6">
            
            <div class="text-center space-y-2">
              <h2 class="text-2xl font-black text-white">Create Your Workspace</h2>
              <p class="text-xs text-[#44403c]">14-day free trial. No credit card required.</p>
            </div>

            <!-- Flow Step 1: Info -->
            <div *ngIf="regStep() === 1" class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-[#44403c] mb-1.5">Company Name</label>
                <input type="text" [(ngModel)]="companyName" placeholder="My Enterprise Co." class="w-full bg-white text-[#1c1917] border border-slate-200 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors">
              </div>
              
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-[#44403c] mb-1.5">Contact Person</label>
                <input type="text" [(ngModel)]="contactName" placeholder="Jane Doe" class="w-full bg-white text-[#1c1917] border border-slate-200 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors">
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-[#44403c] mb-1.5">Work Email</label>
                <input type="email" [(ngModel)]="regEmail" placeholder="jane@company.com" class="w-full bg-white text-[#1c1917] border border-slate-200 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors">
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-[#44403c] mb-1.5">Phone Number</label>
                <input type="text" [(ngModel)]="regPhone" placeholder="+1 (555) 019-2834" class="w-full bg-white text-[#1c1917] border border-slate-200 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors">
              </div>

              <button (click)="submitRegistration()" [disabled]="!companyName || !contactName || !regEmail" class="w-full bg-gradient-to-r from-[#1c1917] to-[#292524] hover:from-indigo-400 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none mt-4 cursor-pointer">
                Continue to Verification
              </button>
            </div>

            <!-- Flow Step 2: Email Verification -->
            <div *ngIf="regStep() === 2" class="space-y-6 text-center animate-fadeIn">
              <span class="material-icons text-5xl text-[#1c1917] bg-indigo-500/10 p-4 rounded-full">mark_email_read</span>
              <div class="space-y-2">
                <h3 class="text-lg font-bold text-white">Verify Your Email Address</h3>
                <p class="text-xs text-[#44403c]">We sent a verification code to <strong class="text-[#1c1917]">{{ regEmail }}</strong>. Enter it below to activate your trial.</p>
              </div>

              <div class="flex justify-center gap-3">
                <input type="text" maxlength="1" class="w-12 h-12 text-center bg-white text-[#1c1917] border border-slate-200 border border-slate-800 text-lg font-extrabold rounded-xl focus:outline-none focus:border-indigo-500 text-white" value="4">
                <input type="text" maxlength="1" class="w-12 h-12 text-center bg-white text-[#1c1917] border border-slate-200 border border-slate-800 text-lg font-extrabold rounded-xl focus:outline-none focus:border-indigo-500 text-white" value="8">
                <input type="text" maxlength="1" class="w-12 h-12 text-center bg-white text-[#1c1917] border border-slate-200 border border-slate-800 text-lg font-extrabold rounded-xl focus:outline-none focus:border-indigo-500 text-white" value="2">
                <input type="text" maxlength="1" class="w-12 h-12 text-center bg-white text-[#1c1917] border border-slate-200 border border-slate-800 text-lg font-extrabold rounded-xl focus:outline-none focus:border-indigo-500 text-white" value="9">
              </div>

              <button (click)="completeVerification()" class="w-full bg-[#1c1917] text-white shadow-md hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-900/10 cursor-pointer">
                Verify and Access Dashboard
              </button>
            </div>

            <!-- Flow Step 3: Success Welcome Email Simulator -->
            <div *ngIf="regStep() === 3" class="space-y-6 text-left animate-fadeIn">
              <div class="text-center space-y-2">
                <span class="material-icons text-5xl text-emerald-400 bg-emerald-500/10 p-4 rounded-full">celebration</span>
                <h3 class="text-lg font-bold text-white">Workspace Created!</h3>
                <p class="text-xs text-[#44403c]">System lead-acquisition workflows executed successfully.</p>
              </div>

              <div class="bg-white text-[#1c1917] border border-slate-200 border border-indigo-950 p-4 rounded-2xl space-y-2.5">
                <p class="text-[9px] font-black text-[#1c1917] uppercase tracking-widest">System Automation Log</p>
                <div class="space-y-2 text-xs">
                  <div class="flex items-center gap-2 text-emerald-400 font-bold">
                    <span class="material-icons text-sm">check_circle</span>
                    <span>Lead record created for {{ contactName }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-emerald-400 font-bold">
                    <span class="material-icons text-sm">check_circle</span>
                    <span>Welcome email sync registered to timeline</span>
                  </div>
                  <div class="flex items-center gap-2 text-emerald-400 font-bold">
                    <span class="material-icons text-sm">check_circle</span>
                    <span>Google Drive customer folder created</span>
                  </div>
                </div>
              </div>

              <button (click)="goToLogin()" class="w-full bg-gradient-to-r from-[#1c1917] to-[#292524] hover:from-indigo-400 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-slate-900/20 cursor-pointer">
                Access GrownX Portal login
              </button>
            </div>

          </div>
        </div>

      </main>

      <!-- Footer -->
      <footer class="border-t border-[#e7e5e4] mt-24 py-12 relative z-10 bg-white text-[#1c1917] border border-slate-200/20">
        <div class="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div class="space-y-4 col-span-2 md:col-span-1">
            <div class="flex items-center gap-2">
              <span class="material-icons text-amber-600">bolt</span>
              <span class="text-md font-extrabold text-white">GrownX Technologies</span>
            </div>
            <p class="text-xs text-[#44403c] leading-relaxed font-medium">
              Enterprise customer relations management solutions. Dallas, TX.
            </p>
          </div>
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-[#44403c] uppercase tracking-wider">Product</h4>
            <div class="flex flex-col gap-2.5 text-xs text-[#44403c] font-semibold">
              <a href="javascript:void(0)" (click)="setTab('features')" class="hover:text-[#292524]">Features Matrix</a>
              <a href="javascript:void(0)" (click)="setTab('templates')" class="hover:text-[#292524]">Marketplace Templates</a>
              <a href="javascript:void(0)" (click)="setTab('pricing')" class="hover:text-[#292524]">Plans Pricing</a>
            </div>
          </div>
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-[#44403c] uppercase tracking-wider">Company</h4>
            <div class="flex flex-col gap-2.5 text-xs text-[#44403c] font-semibold">
              <a href="javascript:void(0)" (click)="setTab('about')" class="hover:text-[#292524]">About Us</a>
              <a href="javascript:void(0)" class="hover:text-[#292524]">Careers</a>
              <a href="javascript:void(0)" class="hover:text-[#292524]">Contact Team</a>
            </div>
          </div>
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-[#44403c] uppercase tracking-wider">Legal</h4>
            <div class="flex flex-col gap-2.5 text-xs text-[#44403c] font-semibold">
              <a href="javascript:void(0)" class="hover:text-[#292524]">Privacy Policy</a>
              <a href="javascript:void(0)" class="hover:text-[#292524]">Terms of Service</a>
              <a href="javascript:void(0)" class="hover:text-[#292524]">Uptime SLA</a>
            </div>
          </div>
        </div>
        <div class="max-w-7xl mx-auto px-6 border-t border-[#e7e5e4]/60 mt-8 pt-6 flex justify-between items-center text-[10px] text-[#44403c] font-bold">
          <span>© {{ year }} GrownX Technologies. All rights reserved.</span>
          <span>Security Certified ISO 27001</span>
        </div>
      </footer>

      <!-- Floating AI Chat Assistant Widget (Enhancement 3) -->
      <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
        
        <!-- Chat pane container -->
        <div *ngIf="showChat()" class="w-[380px] h-[520px] bg-[#1c1917] border border-[#e7e5e4] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn text-slate-100">
          
          <!-- Chat Header -->
          <div class="p-4 bg-white text-[#1c1917] border border-slate-200 border-b border-[#e7e5e4] flex items-center gap-3">
            <div class="h-8 w-8 rounded-full bg-gradient-to-br from-[#1c1917] to-[#292524] flex items-center justify-center">
              <span class="material-icons text-white text-sm">support_agent</span>
            </div>
            <div>
              <h4 class="text-xs font-extrabold text-white">GrownX Help Assistant</h4>
              <p class="text-[9px] text-[#1c1917] font-bold">AI Chatbot • Operational Knowledge</p>
            </div>
          </div>

          <!-- Messages thread -->
          <div class="flex-1 p-4 overflow-y-auto space-y-3 text-xs" id="chat-thread">
            <div *ngFor="let msg of chatMessages()" class="flex flex-col" [class.items-end]="msg.sender === 'visitor'" [class.items-start]="msg.sender === 'assistant'">
              <div [class.bg-[#1c1917] text-white shadow-md]="msg.sender === 'visitor'" [class.bg-white text-[#1c1917] border border-slate-200]="msg.sender === 'assistant'" [class.text-white]="msg.sender === 'visitor'" [class.border-[#e7e5e4]]="msg.sender === 'assistant'" class="max-w-[85%] p-3 rounded-2xl border text-xs leading-relaxed whitespace-pre-wrap">
                {{ msg.text }}
              </div>
              <span class="text-[8px] text-[#44403c] font-semibold mt-1 px-1">{{ msg.time | date:'shortTime' }}</span>
            </div>

            <div *ngIf="chatTyping()" class="flex items-center gap-1.5 p-3 bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] rounded-2xl max-w-[50px] justify-center">
              <span class="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
              <span class="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span class="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>

          <!-- Quick FAQ Options -->
          <div class="p-2 border-t border-[#e7e5e4]/80 bg-white text-[#1c1917] border border-slate-200/40 flex flex-wrap gap-1 text-[10px] font-bold">
            <button (click)="askQuickQuestion('What roles are available in the demo?')" class="px-2.5 py-1.5 bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] text-[#292524] hover:text-[#1c1917] rounded-lg cursor-pointer">What are the credentials?</button>
            <button (click)="askQuickQuestion('How do I run the CRM locally?')" class="px-2.5 py-1.5 bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] text-[#292524] hover:text-[#1c1917] rounded-lg cursor-pointer">Local launch guide</button>
            <button (click)="askQuickQuestion('Can employees access payroll?')" class="px-2.5 py-1.5 bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] text-[#292524] hover:text-[#1c1917] rounded-lg cursor-pointer">Payroll accessibility</button>
            <button (click)="askQuickQuestion('Tell me about the website builder.')" class="px-2.5 py-1.5 bg-white text-[#1c1917] border border-slate-200 border border-[#e7e5e4] text-[#292524] hover:text-[#1c1917] rounded-lg cursor-pointer">Website Builder</button>
          </div>

          <!-- Input Footer -->
          <form (ngSubmit)="sendChatMessage()" class="p-3 bg-white text-[#1c1917] border border-slate-200 border-t border-[#e7e5e4] flex gap-2">
            <input type="text" [(ngModel)]="chatInput" name="chatText" placeholder="Ask about features, pricing, local setup..." class="flex-1 bg-[#1c1917] border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-700">
            <button type="submit" [disabled]="!chatInput.trim()" class="h-9 w-9 bg-[#1c1917] text-white shadow-md hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center shadow transition-colors cursor-pointer">
              <span class="material-icons text-sm">send</span>
            </button>
          </form>

        </div>

        <!-- Float toggle button -->
        <button (click)="toggleChat()" class="h-14 w-14 bg-[#1c1917] hover:bg-[#292524] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
          <span class="material-icons text-2xl">{{ showChat() ? 'close' : 'chat' }}</span>
        </button>

      </div>

    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-scaleIn {
      animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes progressBar {
      from { width: 0%; }
      to { width: 100%; }
    }
    .animate-progressBar {
      animation: progressBar 1.5s linear forwards;
    }
  `]
})
export class PublicWebsiteComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  activeTab = signal<string>('home');
  regStep = signal<number>(1);
  year = new Date().getFullYear();

  // Registries Toggles
  activeMarketTab = signal<string>('web');
  activeTemplateFilter = signal<string>('All');
  templateCategories = ['All', 'SaaS', 'Agency', 'Corporate', 'Education', 'Healthcare', 'Real Estate', 'Ecommerce', 'Portfolio', 'Professional Services'];

  // Registration states
  companyName = '';
  contactName = '';
  regEmail = '';
  regPhone = '';
  welcomeEmailContent = 'Welcome to GrownX CRM! Your workspace is ready for setup.';

  // Animated Statistics Signals
  statsContacts = signal<number>(0);
  statsRate = signal<number>(0);
  statsRevenue = signal<number>(0);

  // AI Chat Assistant Signals
  showChat = signal<boolean>(false);
  chatInput = '';
  chatTyping = signal<boolean>(false);
  chatMessages = signal<ChatMessage[]>([
    { sender: 'assistant', text: 'Hi! I am the GrownX AI Help Assistant. Ask me anything about our CRM modules, user roles, pricing, or local launch guides!', time: new Date() }
  ]);

  // Interactive Demonstration Previews Signals
  activeDemoTab = signal<string>('crm');
  selectedCrmMetric = signal<string>('revenue');
  
  // Demo Kanban Pipeline Board state
  demoLeads = signal<any[]>([
    { id: 1, name: 'Stark Industries', val: 300000, stage: 'New' },
    { id: 2, name: 'Acme Technologies', val: 125000, stage: 'New' }
  ]);
  demoContacted = signal<any[]>([
    { id: 3, name: 'Wayne Enterprises', val: 180000, stage: 'Contacted' }
  ]);
  demoConverted = signal<any[]>([]);
  demoConvertedRevenue = signal<number>(0);

  // Demo Workflow state
  workflowRunning = signal<boolean>(false);
  workflowStep = signal<number>(0);

  // Demo Funnel state
  funnelVisits = signal<number>(1200);
  funnelLeads = signal<number>(240);
  funnelRevenue = signal<number>(4900);
  funnelConvRate = signal<number>(20);

  // Demo Calendar Grid state
  calendarCells = signal<any[]>([
    { booked: false }, { booked: false }, { booked: true, subject: 'Wayne Demo Call' }, { booked: false }, { booked: false }, { booked: false }, { booked: false },
    { booked: false }, { booked: true, subject: 'Stark License Alignment' }, { booked: false }, { booked: false }, { booked: false }, { booked: false }, { booked: false },
    { booked: false }, { booked: false }, { booked: false }, { booked: false }, { booked: true, subject: 'Acme Sync Meeting' }, { booked: false }, { booked: false },
    { booked: false }, { booked: false }, { booked: false }, { booked: false }, { booked: false }, { booked: false }, { booked: true, subject: 'Nova Healthcare Sync' }
  ]);

  featuresList = [
    { icon: 'account_tree', title: 'Workflows Automation', desc: 'Visual workflow flowchart constructor supporting triggers, condition paths, delays, and REST Webhooks.' },
    { icon: 'mail', title: 'Gmail Integration', desc: 'Secure Google OAuth inbox connector syncing logs directly into Customer 360 timelines.' },
    { icon: 'cloud', title: 'Google Drive Sync', desc: 'Automatic provisions root company folder maps per customer (Contracts, Invoices, Proposals subfolders).' },
    { icon: 'web', title: 'Website Builder', desc: 'Drag-and-drop builder components, custom domain maps, and 100+ professional templates.' },
    { icon: 'filter_alt', title: 'Funnel Tracker', desc: 'Chain pages into webinar, lead capture, and product checkout funnels with statistics counters.' },
    { icon: 'assignment', title: 'Forms & Surveys', desc: 'HTML5 Signature options, conditional routing logic, and quiz scoring sheets.' },
    { icon: 'sms', title: 'SMS campaigns', desc: 'SMS templates broadcaster, scheduled deliveries, and audience segments manager.' },
    { icon: 'chat', title: 'Slack-style Chat', desc: 'Direct DMs, mentions, file sharing, and company announcement channels.' },
    { icon: 'badge', title: 'Employee Cards', desc: 'Performance tracking, solved support queries counts, and payslips pdf generation.' },
    { icon: 'calendar_month', title: 'Scheduler Calendar', desc: 'Chevron monthly scheduler grid, booking drawer, and manager filters.' },
    { icon: 'confirmation_number', title: 'Support Center', desc: 'AI Ticket priority classification, department routing, and suggest replies.' },
    { icon: 'monetization_on', title: 'Invoicing System', desc: 'Quotation estimates, computed discounts/taxes rates, and paid status tracking.' }
  ];

  // 108 generated website templates registry
  websiteTemplates: any[] = [];
  // 54 generated funnel templates registry
  mockFunnelsList: any[] = [];

  ngOnInit() {
    this.startStatsCounters();
    this.websiteTemplates = this.generateWebTemplatesRegistry();
    this.mockFunnelsList = this.generateFunnelTemplatesRegistry();
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
    this.regStep.set(1);
    if (tab === 'home') {
      this.startStatsCounters();
    }
  }

  setMarketTab(tab: string) {
    this.activeMarketTab.set(tab);
  }

  setTemplateFilter(cat: string) {
    this.activeTemplateFilter.set(cat);
  }

  // Universal Action System configuration triggers
  triggerAction(elementName: string, action: { type: 'url' | 'internal_route'; target: string }) {
    console.log(`Action configured by Admin on ${elementName} clicked. Action Config:`, action);
    if (action.type === 'internal_route') {
      if (action.target === 'register') {
        this.setTab('register');
      } else if (action.target === 'features') {
        this.setTab('features');
      } else if (action.target === 'templates') {
        this.setTab('templates');
      } else if (action.target === 'pricing') {
        this.setTab('pricing');
      } else {
        this.router.navigate([action.target]);
      }
    }
  }

  // Animated statistics counter loops
  startStatsCounters() {
    this.statsContacts.set(0);
    this.statsRate.set(0);
    this.statsRevenue.set(0);

    const cInterval = setInterval(() => {
      if (this.statsContacts() < 10000) {
        this.statsContacts.set(this.statsContacts() + 500);
      } else {
        clearInterval(cInterval);
      }
    }, 40);

    const rInterval = setInterval(() => {
      if (this.statsRate() < 42) {
        this.statsRate.set(this.statsRate() + 2);
      } else {
        clearInterval(rInterval);
      }
    }, 50);

    const revInterval = setInterval(() => {
      if (this.statsRevenue() < 625000) {
        this.statsRevenue.set(this.statsRevenue() + 25000);
      } else {
        clearInterval(revInterval);
      }
    }, 45);
  }

  scrollToDemo() {
    const el = document.getElementById('demo-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  // Interactive Product Demo Tabs
  setDemoTab(tab: string) {
    this.activeDemoTab.set(tab);
    if (tab === 'workflow') {
      this.workflowStep.set(0);
      this.workflowRunning.set(false);
    }
  }

  selectCrmMetric(metric: string) {
    this.selectedCrmMetric.set(metric);
  }

  // Interactive Pipeline (Kanban Drag simulator)
  moveDemoLead(lead: any) {
    if (lead.stage === 'New') {
      lead.stage = 'Contacted';
      const index = this.demoLeads().indexOf(lead);
      if (index > -1) {
        this.demoLeads.set(this.demoLeads().filter(l => l.id !== lead.id));
        this.demoContacted.set([...this.demoContacted(), lead]);
      }
    } else if (lead.stage === 'Contacted') {
      lead.stage = 'Converted';
      const index = this.demoContacted().indexOf(lead);
      if (index > -1) {
        this.demoContacted.set(this.demoContacted().filter(l => l.id !== lead.id));
        this.demoConverted.set([...this.demoConverted(), lead]);
        this.demoConvertedRevenue.set(this.demoConvertedRevenue() + lead.val);
      }
    }
  }

  // Interactive Workflow (progress bar simulation)
  simulateWorkflowRun() {
    this.workflowRunning.set(true);
    this.workflowStep.set(1); // Trigger event

    setTimeout(() => {
      this.workflowStep.set(2); // Delay completed
      setTimeout(() => {
        this.workflowStep.set(3); // Action sent
        this.workflowRunning.set(false);
      }, 1500);
    }, 1800);
  }

  // Interactive Funnel (visit increments)
  simulateFunnelTraffic() {
    this.funnelVisits.set(this.funnelVisits() + 100);
    const newLeads = Math.round(this.funnelLeads() + (100 * (this.funnelConvRate() / 100)));
    this.funnelLeads.set(newLeads);
    this.funnelRevenue.set(this.funnelRevenue() + 490);
    this.funnelConvRate.set(Math.round((this.funnelLeads() / this.funnelVisits()) * 100));
  }

  // Interactive Calendar (cell clicks)
  bookCalendarSlot(idx: number) {
    const cells = this.calendarCells();
    if (!cells[idx].booked) {
      cells[idx].booked = true;
      cells[idx].subject = 'Live Product Demo Call';
      this.calendarCells.set([...cells]);
    }
  }

  // AI Chatbot Widget Controls
  toggleChat() {
    this.showChat.set(!this.showChat());
  }

  askQuickQuestion(question: string) {
    this.chatInput = question;
    this.sendChatMessage();
  }

  sendChatMessage() {
    if (!this.chatInput.trim()) return;

    const visitorMsg: ChatMessage = {
      sender: 'visitor',
      text: this.chatInput,
      time: new Date()
    };

    this.chatMessages.set([...this.chatMessages(), visitorMsg]);
    const question = this.chatInput;
    this.chatInput = '';
    this.chatTyping.set(true);

    // Scroll chat thread to bottom
    setTimeout(() => this.scrollChat(), 100);

    this.apiService.askWebsiteAssistant(question).subscribe({
      next: (res) => {
        this.chatTyping.set(false);
        const reply = res.success ? res.answer : 'Sorry, I am having trouble fetching detailed help docs.';
        
        this.chatMessages.set([...this.chatMessages(), {
          sender: 'assistant',
          text: reply,
          time: new Date()
        }]);

        setTimeout(() => this.scrollChat(), 100);
      },
      error: () => {
        this.chatTyping.set(false);
        this.chatMessages.set([...this.chatMessages(), {
          sender: 'assistant',
          text: 'I apologize, but I encountered a communication error with our help servers. Please verify local servers are running.',
          time: new Date()
        }]);
        setTimeout(() => this.scrollChat(), 100);
      }
    });
  }

  scrollChat() {
    const el = document.getElementById('chat-thread');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  // Registration Leads Acquisition flow
  submitRegistration() {
    const leadPayload = {
      company: this.companyName,
      contactName: this.contactName,
      email: this.regEmail,
      phone: this.regPhone,
      leadSource: 'Website',
      expectedRevenue: 199,
      stage: 'New'
    };

    this.apiService.createLead(leadPayload).subscribe({
      next: () => {
        // Send a mock verification trigger email
        this.apiService.receiveMockEmail({
          from: this.regEmail,
          to: 'sales@grownox.com',
          subject: 'Lead Signup Verification',
          body: `Verification triggered for lead ${this.contactName} from ${this.companyName}.`
        }).subscribe();

        this.regStep.set(2);
      },
      error: () => {
        // Fallback progress for demo
        this.regStep.set(2);
      }
    });
  }

  completeVerification() {
    this.regStep.set(3);
    
    // Simulate auto welcome email
    this.apiService.sendGmail({
      subject: 'Welcome to GrownX CRM! 🚀',
      body: `Hi ${this.contactName},\n\nWelcome to GrownX CRM! Your workspace has been initialized successfully. Let us know if you need help.\n\nBest,\nThe GrownX Team`,
      to: this.regEmail,
      cc: [],
      bcc: []
    }).subscribe();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  triggerBuyPlan(planName: string, amount: number) {
    const user = this.authService.currentUserValue;
    if (!user) {
      this.router.navigate(['/register']);
      return;
    }
    this.router.navigate(['/downloads']);
  }

  // Generates 108 website templates across categories (Enhancement 8)
  generateWebTemplatesRegistry() {
    const list: any[] = [];
    const categories = ['SaaS', 'Agency', 'Corporate', 'Education', 'Healthcare', 'Real Estate', 'Ecommerce', 'Portfolio', 'Professional Services'];
    const subnames = {
      'SaaS': ['AI Core Sync', 'API Command Portal', 'Productivity Master', 'Data Mesh Analytics', 'Cloud Orchestrator', 'Cyber Security Hub'],
      'Agency': ['Creative Studio', 'Digital Catalyst', 'Growth Marketing', 'Influencer Hub', 'SEO Boost Studio', 'Brand Identity Co'],
      'Corporate': ['Capital Ventures', 'Consulting Group', 'Enterprise Logistics', 'Global Holdings', 'Strategic Advisory', 'Industries Global'],
      'Education': ['LMS Academy', 'University Portal', 'Coaching School', 'EduLearn Center', 'Study Buddy App', 'Classroom Hub'],
      'Healthcare': ['Medical Clinic', 'Dental Plaza', 'Therapy Center', 'Hospital Portal', 'BioTech Labs', 'Care Support'],
      'Real Estate': ['Broker Elite', 'Listing Directory', 'Penthouse Listings', 'Urban Rentals', 'Residential Group', 'Commerical Spaces'],
      'Ecommerce': ['Single Product Store', 'Multibrand Storefront', 'Merch Shop', 'Fashion Vault', 'Gourmet Store', 'Tech Deals'],
      'Portfolio': ['Designer CV', 'Developer Showcase', 'Freelance Hub', 'Artist Gallery', 'Writer Blog', 'Consultant Profile'],
      'Professional Services': ['Law Firm Partner', 'Accountant Ledger', 'Architect Studio', 'Dental Clinic', 'Broker Hub', 'Agency Hub']
    };

    let idx = 1;
    categories.forEach(cat => {
      const subs = subnames[cat as keyof typeof subnames] || ['Standard Template'];
      // Generate 12 templates per category to reach 108 templates
      for (let i = 1; i <= 12; i++) {
        const nameIdx = (i - 1) % subs.length;
        list.push({
          id: idx++,
          name: `${subs[nameIdx]} v${i}`,
          category: cat,
          desc: `A professional company template matching the ${cat} sector requirements. Prebuilt components, responsive styles, and default sections.`
        });
      }
    });
    return list;
  }

  filteredTemplates() {
    const filter = this.activeTemplateFilter();
    if (filter === 'All') return this.websiteTemplates;
    return this.websiteTemplates.filter(t => t.category === filter);
  }

  // Generates 54 funnel templates (Enhancement 9)
  generateFunnelTemplatesRegistry() {
    const list = [];
    const types = ['Lead Generation', 'Webinar Funnel', 'Appointment Funnel', 'Product Funnel', 'Coaching Funnel', 'SaaS Funnel', 'Consulting Funnel', 'Event Funnel', 'Recruitment Funnel', 'Agency Funnel'];
    for (let i = 1; i <= 54; i++) {
      const typeIdx = (i - 1) % types.length;
      list.push({
        id: i,
        name: `Funnel Strategy Builder Layout v${i}`,
        type: types[typeIdx],
        steps: Math.floor(Math.random() * 3) + 2 // 2 to 4 steps
      });
    }
    return list;
  }
}
