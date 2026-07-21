import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface CallAnalysis {
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  summary: string;
  actionItems: string[];
}

interface ChatMessage {
  sender: 'customer' | 'bot' | 'agent';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-social-automation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="bg-white bg-white p-6 rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-sm">
        <h2 class="text-2xl font-bold text-slate-800 text-[#1c1917] tracking-tight">AI Social & Call Automation</h2>
        <p class="text-sm text-[#574c43] mt-1">
          Harness AI to analyze voice call recordings and auto-reply to WhatsApp & Instagram inquiries.
        </p>
      </div>

      <!-- Main Tabs -->
      <div class="flex border-b border-slate-200 border-[#e7e5e4] space-x-6">
        <button 
          (click)="activeTab.set('caller')"
          [class.border-sky-500]="activeTab() === 'caller'"
          [class.text-sky-600]="activeTab() === 'caller'"
          [class.dark:text-sky-400]="activeTab() === 'caller'"
          class="pb-3 text-sm font-semibold border-b-2 border-transparent text-[#292524] hover:text-slate-700 dark:text-[#44403c] transition-colors flex items-center gap-2">
          <span class="material-icons text-lg">call</span>
          <span>AI Caller Analysis</span>
        </button>
        <button 
          (click)="activeTab.set('social')"
          [class.border-sky-500]="activeTab() === 'social'"
          [class.text-sky-600]="activeTab() === 'social'"
          [class.dark:text-sky-400]="activeTab() === 'social'"
          class="pb-3 text-sm font-semibold border-b-2 border-transparent text-[#292524] hover:text-slate-700 dark:text-[#44403c] transition-colors flex items-center gap-2">
          <span class="material-icons text-lg">forum</span>
          <span>WhatsApp & Instagram Auto-Responder</span>
        </button>
      </div>

      <!-- TAB 1: AI CALLER TRANSCRIPT ANALYSIS -->
      <div *ngIf="activeTab() === 'caller'" class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        <!-- Left: Input & Templates (Cols: 2) -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white bg-white rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-sm p-6 space-y-4">
            <h3 class="font-bold text-slate-800 text-[#1c1917] text-sm flex items-center gap-2">
              <span class="material-icons text-sky-500">record_voice_over</span>
              <span>Voice Log Analyzer</span>
            </h3>

            <!-- Template selection -->
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] dark:text-[#292524] uppercase tracking-wider mb-2">Load Call Demo Templates</label>
              <div class="grid grid-cols-1 gap-2">
                <button 
                  type="button"
                  *ngFor="let t of callTemplates"
                  (click)="loadCallTemplate(t.text)"
                  class="p-2.5 rounded-lg border border-slate-200 border-[#e7e5e4] bg-slate-50 hover:bg-slate-100 bg-[#fafaf9]/50 dark:hover:bg-white hover:border-amber-600/50 hover:shadow-xl text-left text-xs font-semibold text-slate-700 dark:text-[#1c1917] hover:border-sky-400 transition-all flex items-start gap-2">
                  <span class="material-icons text-sky-500 text-sm mt-0.5">description</span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate">{{ t.label }}</p>
                    <span class="text-[9px] text-[#44403c] block">{{ t.description }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Custom text input -->
            <div class="space-y-1.5">
              <label class="block text-[10px] font-bold text-[#44403c] dark:text-[#292524] uppercase tracking-wider">Paste Call Transcript</label>
              <textarea 
                rows="8"
                [(ngModel)]="transcript" 
                placeholder="Log conversation script here to analyze sentiment, summarize topics, and generate follow-up tasks..."
                class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]"></textarea>
            </div>

            <button 
              [disabled]="isLoading() || !transcript.trim()"
              (click)="analyzeCall()"
              class="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-500/10 hover:shadow-sky-500/20 transition-all flex items-center justify-center gap-2">
              <span class="material-icons text-sm">{{ isLoading() ? 'sync' : 'auto_awesome' }}</span>
              <span>{{ isLoading() ? 'AI Analyzing...' : 'Run Caller Analytics' }}</span>
            </button>
          </div>
        </div>

        <!-- Right: Results Panel (Cols: 3) -->
        <div class="lg:col-span-3">
          <div class="bg-white bg-white rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-sm p-6 min-h-[400px] flex flex-col justify-between">
            
            <div class="space-y-6">
              <h3 class="font-bold text-slate-800 text-[#1c1917] text-sm border-b border-slate-100 border-[#e7e5e4] pb-3 flex justify-between items-center">
                <span class="flex items-center gap-2">
                  <span class="material-icons text-sky-500">insights</span>
                  <span>AI Sentiment & Call Insights</span>
                </span>
                
                <!-- Active Indicator -->
                <span class="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                  <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>AI Core Online</span>
                </span>
              </h3>

              <!-- Loading Indicator -->
              <div *ngIf="isLoading()" class="py-24 text-center text-[#44403c]">
                <div class="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p class="text-xs font-medium">Gemini model reading transcript & extracting details...</p>
              </div>

              <!-- Empty State -->
              <div *ngIf="!analysis() && !isLoading()" class="py-24 text-center text-[#44403c]">
                <span class="material-icons text-4xl mb-2 text-[#1c1917]">analytics</span>
                <p class="text-xs font-medium">Paste transcripts or choose a demo template, then hit analyze to run caller system metrics.</p>
              </div>

              <!-- Output Analysis Data -->
              <div *ngIf="analysis() as data">
                <div *ngIf="!isLoading()" class="space-y-6 animate-in fade-in duration-300">
                  
                  <!-- Sentiment and KPI -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <!-- Sentiment Card -->
                    <div class="p-4 rounded-xl border border-slate-100 border-[#e7e5e4]/40 bg-slate-50/50 bg-[#fafaf9]/30 flex items-center gap-3">
                      <div class="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                        [ngClass]="{
                          'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400': data.sentiment === 'Positive',
                          'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400': data.sentiment === 'Negative',
                          'bg-slate-100 text-slate-600 bg-[#fafaf9] dark:text-[#44403c]': data.sentiment === 'Neutral'
                        }">
                        <span class="material-icons">
                          {{ data.sentiment === 'Positive' ? 'sentiment_satisfied_alt' : data.sentiment === 'Negative' ? 'sentiment_very_dissatisfied' : 'sentiment_neutral' }}
                        </span>
                      </div>
                      <div>
                        <span class="text-[9px] text-[#44403c] uppercase font-bold tracking-wider">Detected Sentiment</span>
                        <h4 class="text-base font-bold text-slate-800 text-[#1c1917]"
                          [ngClass]="{
                            'text-emerald-500': data.sentiment === 'Positive',
                            'text-rose-500': data.sentiment === 'Negative',
                            'text-[#292524]': data.sentiment === 'Neutral'
                          }">{{ data.sentiment }}</h4>
                      </div>
                    </div>

                    <!-- Confidence Indicator -->
                    <div class="p-4 rounded-xl border border-slate-100 border-[#e7e5e4]/40 bg-slate-50/50 bg-[#fafaf9]/30 flex items-center gap-3">
                      <div class="h-10 w-10 rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950 text-sky-400 flex items-center justify-center shrink-0">
                        <span class="material-icons">verified</span>
                      </div>
                      <div>
                        <span class="text-[9px] text-[#44403c] uppercase font-bold tracking-wider">Analysis Confidence</span>
                        <h4 class="text-base font-bold text-slate-800 text-[#1c1917]">96% (Gemini Verified)</h4>
                      </div>
                    </div>

                  </div>

                  <!-- Executive Summary -->
                  <div class="p-4 rounded-xl border border-slate-100 border-[#e7e5e4]/40 bg-slate-50/50 bg-[#fafaf9]/30">
                    <h4 class="text-xs font-bold text-slate-800 text-[#1c1917] uppercase tracking-wider mb-2">Executive Summary</h4>
                    <p class="text-xs text-[#44403c] leading-relaxed font-medium">
                      {{ data.summary }}
                    </p>
                  </div>

                  <!-- Action Items Checklist -->
                  <div>
                    <h4 class="text-xs font-bold text-slate-800 text-[#1c1917] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span class="material-icons text-sky-500 text-sm">checklist</span>
                      <span>AI-Generated Action Items</span>
                    </h4>
                    <div class="space-y-2">
                      <div 
                        *ngFor="let item of data.actionItems; let i = index"
                        class="flex items-start gap-3 p-3 rounded-lg border border-slate-100 border-[#e7e5e4] bg-slate-50/20 bg-[#fafaf9]/20 hover:bg-slate-50 dark:hover:bg-white hover:border-amber-600/50 hover:shadow-xl/50 transition-colors">
                        <input 
                          type="checkbox" 
                          [id]="'action-' + i"
                          class="mt-0.5 h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-300 rounded shrink-0">
                        <label [for]="'action-' + i" class="text-xs text-slate-700 dark:text-[#1c1917] font-medium cursor-pointer">
                          {{ item }}
                        </label>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            <!-- Sync activity status -->
            <div *ngIf="analysis() && !isLoading()" class="mt-6 pt-4 border-t border-slate-100 border-[#e7e5e4] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[11px] text-[#44403c]">
              <span class="flex items-center gap-1">
                <span class="material-icons text-sm">sync</span>
                <span>Analysed logs synchronized with customer interaction timeline.</span>
              </span>
              <button 
                (click)="clearAnalysis()"
                class="text-[#292524] hover:text-sky-500 font-semibold uppercase tracking-wider">
                Clear Results
              </button>
            </div>

          </div>
        </div>

      </div>

      <!-- TAB 2: WHATSAPP & INSTAGRAM AUTO-RESPONDER -->
      <div *ngIf="activeTab() === 'social'" class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        <!-- Left Sidebar settings (Cols: 2) -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Channel selector and Config -->
          <div class="bg-white bg-white rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-sm p-6 space-y-4">
            <h3 class="font-bold text-slate-800 text-[#1c1917] text-sm flex items-center gap-2">
              <span class="material-icons text-sky-500">settings</span>
              <span>Automation Rules</span>
            </h3>

            <!-- Choose channel -->
            <div class="space-y-2">
              <label class="block text-[10px] font-bold text-[#44403c] dark:text-[#292524] uppercase tracking-wider">Active Channel</label>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  (click)="changeSocialChannel('whatsapp')"
                  [class.bg-emerald-500/10]="socialChannel() === 'whatsapp'"
                  [class.text-emerald-600]="socialChannel() === 'whatsapp'"
                  [class.border-emerald-500]="socialChannel() === 'whatsapp'"
                  class="p-3 border border-slate-200 border-[#e7e5e4] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                  <svg class="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.385 5.39.002 12.022 0c3.21.001 6.231 1.254 8.508 3.535 2.278 2.28 3.528 5.305 3.527 8.514-.003 6.636-5.389 12.019-12.022 12.019-2.003-.001-3.971-.5-5.713-1.454L0 24zm6.59-4.846c1.6.95 3.167 1.453 4.89 1.454 5.407-.001 9.811-4.394 9.814-9.789.001-2.614-1.017-5.074-2.868-6.928-1.851-1.854-4.316-2.873-6.93-2.875-5.412 0-9.82 4.394-9.823 9.79-.001 1.83.479 3.619 1.392 5.205L2.08 21.082l6.136-1.61c-.55.35-1.12.56-1.57.682z"/>
                  </svg>
                  <span>WhatsApp</span>
                </button>
                <button 
                  (click)="changeSocialChannel('instagram')"
                  [class.bg-rose-500/10]="socialChannel() === 'instagram'"
                  [class.text-rose-600]="socialChannel() === 'instagram'"
                  [class.border-rose-500]="socialChannel() === 'instagram'"
                  class="p-3 border border-slate-200 border-[#e7e5e4] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                  <svg class="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  <span>Instagram</span>
                </button>
              </div>
            </div>

            <!-- Auto response toggle -->
            <div class="flex items-center justify-between p-3 rounded-lg border border-slate-100 border-[#e7e5e4]/60 bg-slate-50/50 bg-[#fafaf9]/40">
              <div>
                <h5 class="text-xs font-bold text-slate-800 text-[#1c1917]">Instant Auto-Reply</h5>
                <p class="text-[10px] text-[#44403c] mt-0.5">Let AI reply immediately to webhooks.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" [(ngModel)]="autoReplyEnabled" class="sr-only peer">
                <div class="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            <!-- Tone selector -->
            <div class="space-y-1.5">
              <label class="block text-[10px] font-bold text-[#44403c] dark:text-[#292524] uppercase tracking-wider">AI Suggested Tone</label>
              <select 
                [(ngModel)]="aiTone"
                class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]">
                <option value="professional">💼 Professional Support</option>
                <option value="playful">✨ Playful & Friendly (with Emojis)</option>
                <option value="urgent">🚨 Urgent Escalation</option>
              </select>
            </div>

            <!-- Simulator Webhook trigger -->
            <div class="border-t border-slate-100 border-[#e7e5e4] pt-4 space-y-3">
              <h4 class="text-xs font-bold text-slate-700 dark:text-[#1c1917] uppercase tracking-wider">Simulate Incoming Message</h4>
              <div class="grid grid-cols-1 gap-1.5">
                <button 
                  type="button"
                  *ngFor="let sample of socialMsgTemplates"
                  (click)="simulateIncomingMessage(sample)"
                  class="px-3 py-2 border border-slate-100 border-[#e7e5e4] bg-slate-50/60 hover:bg-slate-100 bg-[#fafaf9]/30 text-left text-xs text-slate-600 dark:text-[#44403c] rounded-lg hover:border-sky-500 truncate transition-all">
                  "{{ sample }}"
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- Right Chat interface simulator (Cols: 3) -->
        <div class="lg:col-span-3">
          
          <!-- Mock Phone UI/Window -->
          <div class="bg-white bg-white rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-lg overflow-hidden flex flex-col min-h-[500px]">
            
            <!-- Phone Header -->
            <div class="px-6 py-4 border-b border-slate-100 border-[#e7e5e4]/60 flex items-center justify-between"
              [ngClass]="{
                'bg-emerald-500/5 dark:bg-emerald-950/10': socialChannel() === 'whatsapp',
                'bg-rose-500/5 dark:bg-rose-950/10': socialChannel() === 'instagram'
              }">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-md"
                  [ngClass]="{
                    'bg-emerald-500': socialChannel() === 'whatsapp',
                    'bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600': socialChannel() === 'instagram'
                  }">
                  <span class="material-icons text-lg">
                    {{ socialChannel() === 'whatsapp' ? 'call' : 'camera_alt' }}
                  </span>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-slate-800 text-[#1c1917]">Grownox Technologies Live Agent</h4>
                  <span class="text-[10px] text-[#44403c] block font-medium">
                    {{ socialChannel() === 'whatsapp' ? 'WhatsApp Business Integration' : 'Instagram Direct Message API' }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-[10px] font-bold text-[#44403c] uppercase">Webhook Active</span>
              </div>
            </div>

            <!-- Chat Message Feed -->
            <div class="flex-grow p-6 overflow-y-auto space-y-4 max-h-[340px] min-h-[340px] bg-slate-50/50 bg-white/30 flex flex-col justify-end">
              
              <!-- Empty state message if no chats -->
              <div *ngIf="chatHistory().length === 0" class="text-center py-12 text-[#44403c] my-auto">
                <span class="material-icons text-4xl mb-1 text-[#1c1917]">chat_bubble_outline</span>
                <p class="text-xs font-semibold">Ready for incoming webhook simulation.</p>
                <p class="text-[10px] mt-1 text-[#44403c]">Click a message template in the sidebar to simulate.</p>
              </div>

              <!-- Message listing -->
              <div 
                *ngFor="let msg of chatHistory()"
                [class.justify-end]="msg.sender === 'bot' || msg.sender === 'agent'"
                class="flex w-full animate-in slide-in-from-bottom-2 duration-200">
                
                <div 
                  [class.bg-white]="msg.sender === 'customer'"
                  [class.bg-white]="msg.sender === 'customer'"
                  [class.text-slate-800]="msg.sender === 'customer'"
                  [class.dark:text-slate-100]="msg.sender === 'customer'"
                  [class.border]="msg.sender === 'customer'"
                  [class.border-slate-100]="msg.sender === 'customer'"
                  [class.border-[#e7e5e4]/60]="msg.sender === 'customer'"
                  [class.rounded-br-none]="msg.sender === 'customer'"

                  [class.bg-sky-500]="msg.sender === 'bot'"
                  [class.text-white]="msg.sender === 'bot'"
                  [class.rounded-bl-none]="msg.sender === 'bot'"

                  [class.bg-slate-700]="msg.sender === 'agent'"
                  [class.text-white]="msg.sender === 'agent'"
                  [class.rounded-bl-none]="msg.sender === 'agent'"

                  class="max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-xs space-y-1">
                  
                  <span *ngIf="msg.sender === 'bot'" class="text-[9px] font-bold text-sky-200 uppercase tracking-wider block">AI Auto-Reply</span>
                  <p class="leading-relaxed font-medium">{{ msg.text }}</p>
                  <span class="text-[9px] opacity-65 text-right block">{{ msg.timestamp | date:'shortTime' }}</span>
                </div>

              </div>

              <!-- Typing Indicator -->
              <div *ngIf="isTyping()" class="flex w-full justify-end">
                <div class="bg-sky-500/10 px-4 py-3 rounded-2xl flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-sky-600 dark:text-sky-400">AI Suggested Reply pending</span>
                  <div class="flex gap-1">
                    <span class="h-1.5 w-1.5 bg-sky-500 rounded-full animate-bounce"></span>
                    <span class="h-1.5 w-1.5 bg-sky-500 rounded-full animate-bounce delay-100"></span>
                    <span class="h-1.5 w-1.5 bg-sky-500 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              </div>

            </div>

            <!-- Agent Reply Input Box -->
            <div class="p-4 border-t border-slate-100 border-[#e7e5e4] bg-slate-50/30 bg-[#fafaf9]/30 flex gap-2">
              <input 
                type="text" 
                [(ngModel)]="agentInput" 
                placeholder="Type a custom message as client customer..."
                (keyup.enter)="sendAgentMessage()"
                class="flex-grow px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-white bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]">
              
              <button 
                [disabled]="!agentInput.trim()"
                (click)="sendAgentMessage()"
                class="p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors flex items-center justify-center">
                <span class="material-icons text-sm">send</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  `,
  styles: []
})
export class SocialAutomationComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = signal<'caller' | 'social'>('caller');
  isLoading = signal(false);

  // Caller Analyser
  transcript = '';
  analysis = signal<CallAnalysis | null>(null);

  // Social Auto-responder
  socialChannel = signal<'whatsapp' | 'instagram'>('whatsapp');
  autoReplyEnabled = true;
  aiTone = 'playful';
  agentInput = '';
  isTyping = signal(false);
  chatHistory = signal<ChatMessage[]>([]);

  callTemplates = [
    {
      label: 'Technical Escalation (Crash)',
      description: 'Customer reports database server crash during migration.',
      text: `Representative: Welcome to Grownox Support, this is John. How can I assist you today?
Customer: Hi John, we are having a critical emergency. We started our server migration an hour ago, but the database connection crashed and now none of our employees can log into Grownox.
Representative: I am sorry to hear that. Let me review your tenant ID and logs. Did you receive a specific error code?
Customer: Yes, it says "503 Service Temporarily Unavailable: connection refused at 10.0.1.42".
Representative: Perfect. I see the logs. It looks like the network security policy didn't authorize the new container IP. I will escalate this to our operations engineer to authorize the IP block immediately.
Customer: Thank you, we really need this back online ASAP.
Representative: I understand. I will send you an email confirmation as soon as it is resolved, and I'll call you back in 15 minutes to confirm.
Customer: Sounds good. Speak soon.`
    },
    {
      label: 'Sales Discovery (New Client)',
      description: 'Lead asks about enterprise pricing and custom integrations.',
      text: `Representative: Hello, thanks for calling Grownox Sales. This is Sarah.
Customer: Hi Sarah, I am calling from Wayne Enterprises. We are looking to migrate from our legacy CRM. We have about 150 sales staff.
Representative: Excellent, Wayne Enterprises is a great fit. What specific features are you looking for?
Customer: We need a visual pipeline board, and most importantly, AI lead scoring and custom PDF generator for reports.
Representative: Yes, we support automated AI lead scoring and customized PDF/CSV report exports out of the box. For 150 users, we can offer our Enterprise tier. I can email you our pricing proposal deck.
Customer: That would be helpful. Can we also schedule a live demo for our executive board next Thursday?
Representative: Absolutely. I will email you a calendar invite for next Thursday at 2 PM.
Customer: Great. I will keep an eye out for the email. Thanks, Sarah.`
    },
    {
      label: 'Billing Inquiry (Discrepancy)',
      description: 'Client calls regarding double charge on invoice.',
      text: `Representative: Grownox Billing, this is Robert.
Customer: Hi, I just reviewed our monthly credit card statement and it looks like we were charged twice for our June subscription. Our invoice code is INV-8021.
Representative: Thank you. Let me query INV-8021 in our records. I see the invoice. Yes, it looks like a retry connection timed out but processed, resulting in a duplicate credit card capture.
Customer: Oh, okay. Can we get a refund?
Representative: Yes, absolutely. I am submitting a refund request for the duplicate $4,500 charge now. It should reflect back in your bank statement in 3 to 5 business days. I'll send the credit note invoice to your email now.
Customer: Excellent, that was very fast. Thank you!
Representative: My pleasure. Have a great day.`
    }
  ];

  socialMsgTemplates = [
    'Hi, what are the pricing plans for Grownox Technologies?',
    'Hey, I am locked out of my account, can you help me reset my password?',
    'Hello, do you offer a free trial or demo for new customers?',
    'Our dashboard is not loading, we see a network error. Is there an outage?'
  ];

  ngOnInit() {
    // Initial chat history setup
    this.chatHistory.set([]);
  }

  // Caller System Analyser
  loadCallTemplate(text: string) {
    this.transcript = text;
  }

  analyzeCall() {
    if (!this.transcript.trim()) return;

    this.isLoading.set(true);
    this.apiService.analyzeCallTranscript(this.transcript).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.analysis.set(res.data);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  clearAnalysis() {
    this.analysis.set(null);
    this.transcript = '';
  }

  // Social Auto-Responder
  changeSocialChannel(channel: 'whatsapp' | 'instagram') {
    this.socialChannel.set(channel);
    this.chatHistory.set([]);
  }

  simulateIncomingMessage(text: string) {
    // Append customer message
    const customerMsg: ChatMessage = {
      sender: 'customer',
      text,
      timestamp: new Date()
    };
    
    this.chatHistory.update(list => [...list, customerMsg]);

    if (this.autoReplyEnabled) {
      this.isTyping.set(true);

      // Call API to get suggested response
      this.apiService.generateSocialReply(this.socialChannel(), text).subscribe({
        next: (res) => {
          this.isTyping.set(false);
          if (res.success) {
            const botMsg: ChatMessage = {
              sender: 'bot',
              text: res.reply,
              timestamp: new Date()
            };
            this.chatHistory.update(list => [...list, botMsg]);
          }
        },
        error: () => {
          this.isTyping.set(false);
        }
      });
    }
  }

  sendAgentMessage() {
    if (!this.agentInput.trim()) return;

    // Simulate agent typing as a user to test replying
    const userMsgText = this.agentInput;
    this.agentInput = '';

    const customerMsg: ChatMessage = {
      sender: 'customer',
      text: userMsgText,
      timestamp: new Date()
    };
    this.chatHistory.update(list => [...list, customerMsg]);

    if (this.autoReplyEnabled) {
      this.isTyping.set(true);
      
      this.apiService.generateSocialReply(this.socialChannel(), userMsgText).subscribe({
        next: (res) => {
          this.isTyping.set(false);
          if (res.success) {
            const botMsg: ChatMessage = {
              sender: 'bot',
              text: res.reply,
              timestamp: new Date()
            };
            this.chatHistory.update(list => [...list, botMsg]);
          }
        },
        error: () => {
          this.isTyping.set(false);
        }
      });
    }
  }
}
