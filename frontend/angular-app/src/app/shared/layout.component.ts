import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService, UserProfile } from '../core/services/auth.service';
import { ApiService } from '../core/services/api.service';
import { SocketService } from '../core/services/socket.service';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

export interface AlertNotification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  link: string;
  type: string;
  createdAt: Date;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen flex flex-col md:flex-row bg-[#fafaf9] text-[#1c1917] font-sans selection:bg-amber-600 selection:text-white">
      
      <!-- Mobile Header -->
      <header class="md:hidden flex justify-between items-center bg-[#1c1917] text-white px-4 py-3 border-b border-[#292524]">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center font-black text-white text-sm shadow">G</div>
          <span class="font-extrabold text-base tracking-tight text-white">GrownX<span class="text-amber-500">CRM</span></span>
        </div>
        <button (click)="toggleMobileMenu()" class="text-[#292524] hover:text-white focus:outline-none">
          <span class="material-icons">{{ isMobileOpen() ? 'close' : 'menu' }}</span>
        </button>
      </header>

      <!-- Sidebar Container -->
      <aside 
        [class.translate-x-0]="isMobileOpen()" 
        [class.-translate-x-full]="!isMobileOpen()" 
        class="fixed md:static inset-y-0 left-0 w-64 bg-[#1c1917] text-[#292524] flex flex-col z-30 transition-transform duration-300 md:translate-x-0 border-r border-[#292524] shadow-xl">
        
        <!-- Sidebar Branding -->
        <div class="p-5 border-b border-[#292524] flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-600/20">
            <span class="material-icons text-xl font-black">bolt</span>
          </div>
          <div>
            <h1 class="font-extrabold text-lg text-white tracking-tight leading-none">GrownX<span class="text-amber-500 font-medium">CRM</span></h1>
            <span class="text-[10px] text-[#44403c] font-bold tracking-wider uppercase mt-1 block">Enterprise Command</span>
          </div>
        </div>

        <!-- User Brief -->
        <div class="p-4 border-b border-[#292524] flex items-center gap-3 bg-[#292524]/50">
          <div class="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-sm uppercase">
            {{ user()?.name?.substring(0, 2) }}
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="font-bold text-xs text-white truncate">{{ user()?.name }}</h4>
            <span class="text-[10px] text-amber-400 truncate block capitalize font-medium">{{ user()?.role?.replace('_', ' ') }}</span>
          </div>
        </div>

        <!-- Sidebar Navigation Groups (Categorized Hierarchy) -->
        <nav class="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
          
          <!-- Category 1: Executive Overview -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-stone-500 px-3 block">Executive Overview</span>
            <a routerLink="/dashboard" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">space_dashboard</span>
              <span>Executive Dashboard</span>
            </a>
            <a *ngIf="hasAccess(['super_admin', 'manager'])" routerLink="/command-center" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">insights</span>
              <span>Command Center</span>
            </a>
          </div>

          <!-- Category 2: Sales & Pipeline Engine (Grouped) -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-stone-500 px-3 block">Sales & Pipeline Engine</span>
            <a *ngIf="hasAccess(['super_admin', 'manager', 'employee'])" routerLink="/leads" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">leaderboard</span>
              <span>Kanban Sales Pipeline</span>
            </a>
            <a routerLink="/customers" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">people_alt</span>
              <span>Customer 360 Accounts</span>
            </a>
            <a routerLink="/documents-invoices" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">receipt_long</span>
              <span>Proposals & Quotes</span>
            </a>
          </div>

          <!-- Category 3: HR & Support Operations (Grouped) -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-stone-500 px-3 block">HR & Support Center</span>
            <a routerLink="/tickets" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">confirmation_number</span>
              <span>Support Desk & AI Tickets</span>
            </a>
            <a *ngIf="hasAccess(['super_admin', 'manager', 'employee'])" routerLink="/employees" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">badge</span>
              <span>Team Directory</span>
            </a>
            <a routerLink="/payroll" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">payments</span>
              <span>Payroll Hub</span>
            </a>
          </div>

          <!-- Category 4: AI & Automations Engine (Grouped) -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-stone-500 px-3 block">AI & Automations</span>
            <a *ngIf="hasAccess(['super_admin', 'manager'])" routerLink="/workflows" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">account_tree</span>
              <span>Visual Workflows</span>
            </a>
            <a *ngIf="hasAccess(['super_admin', 'manager', 'employee'])" routerLink="/social-automation" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">forum</span>
              <span>Social Auto-Responders</span>
            </a>
            <a *ngIf="hasAccess(['super_admin', 'manager', 'employee'])" routerLink="/calendar" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">calendar_month</span>
              <span>Calendar Scheduler</span>
            </a>
          </div>

          <!-- Category 5: Web, Funnels & Marketing (Grouped) -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-stone-500 px-3 block">Web & Marketing Suite</span>
            <a routerLink="/web-builder" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">web</span>
              <span>Website Builder</span>
            </a>
            <a routerLink="/funnel-builder" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">filter_alt</span>
              <span>Sales Funnel Builder</span>
            </a>
            <a routerLink="/forms-surveys" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">assignment</span>
              <span>Forms & Surveys</span>
            </a>
          </div>

          <!-- Category 6: Communications & Cloud Storage (Grouped) -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-stone-500 px-3 block">Communications & Cloud</span>
            <a routerLink="/email-center" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">mail</span>
              <span>Gmail Center</span>
            </a>
            <a routerLink="/sms-marketing" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">sms</span>
              <span>SMS Marketing</span>
            </a>
            <a routerLink="/chat-center" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">chat</span>
              <span>Team Collaboration Chat</span>
            </a>
            <a routerLink="/drive-center" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">cloud_upload</span>
              <span>Google Drive Storage</span>
            </a>
          </div>

          <!-- Category 7: Analytics & Task Management (Grouped) -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-stone-500 px-3 block">Analytics & Tasks</span>
            <a *ngIf="hasAccess(['super_admin', 'manager'])" routerLink="/reports" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">analytics</span>
              <span>Executive Reports</span>
            </a>
            <a routerLink="/tasks" routerLinkActive="active-link" class="nav-item">
              <span class="material-icons">task_alt</span>
              <span>Tasks & Deadlines</span>
            </a>
          </div>

        </nav>

        <!-- Sidebar Footer -->
        <div class="p-4 border-t border-[#292524]">
          <button (click)="logout()" class="w-full py-2.5 px-4 rounded-xl bg-[#292524] hover:bg-rose-500/10 hover:text-rose-400 border border-[#44403c] hover:border-rose-500/20 text-[#292524] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer">
            <span class="material-icons text-sm">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#fafaf9]">
        
        <!-- Header -->
        <header class="bg-white border-b border-[#e7e5e4] h-16 flex items-center justify-between px-6 z-20 shadow-sm">
          
          <!-- Search Box -->
          <div class="flex items-center gap-2 max-w-md w-full">
            <div class="relative w-full">
              <span class="material-icons absolute left-3 top-2.5 text-[#44403c] text-lg">search</span>
              <input 
                type="text" 
                [(ngModel)]="searchQuery" 
                (keyup.enter)="triggerGlobalSearch()"
                placeholder="Search CRM records (Press Enter)..." 
                class="w-full pl-10 pr-4 py-2 border border-[#e7e5e4] rounded-xl bg-[#fafaf9] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-[#1c1917]">
            </div>
          </div>

          <!-- Header Actions -->
          <div class="flex items-center gap-4">
            
            <!-- Notifications Dropdown -->
            <div class="relative">
              <button (click)="toggleNotifications()" class="p-2 text-stone-600 hover:bg-[#f5f5f4] rounded-xl focus:outline-none relative transition-colors">
                <span class="material-icons text-xl">notifications</span>
                <span *ngIf="unreadCount() > 0" class="absolute top-1 right-1 h-4 w-4 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white animate-pulse">
                  {{ unreadCount() }}
                </span>
              </button>

              <!-- Notifications Menu -->
              <div *ngIf="isNotifOpen()" class="absolute right-0 mt-3 w-80 bg-white border border-[#e7e5e4] rounded-2xl shadow-xl z-50 overflow-hidden">
                <div class="px-4 py-3 bg-[#fafaf9] border-b border-[#e7e5e4] flex justify-between items-center">
                  <span class="font-extrabold text-xs text-[#1c1917]">Alerts & Notifications</span>
                  <button (click)="markAllRead()" class="text-xs text-amber-700 font-bold hover:underline">Mark all read</button>
                </div>
                <div class="max-h-72 overflow-y-auto divide-y divide-[#f5f5f4]">
                  <div *ngIf="notifications().length === 0" class="p-6 text-center text-[#44403c] text-xs font-semibold">
                    No new notifications
                  </div>
                  <div *ngFor="let n of notifications()" class="p-4 hover:bg-[#fafaf9] flex gap-3 transition-colors">
                    <div class="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-700">
                      <span class="material-icons text-sm">
                        {{ n.type === 'Ticket' ? 'confirmation_number' : n.type === 'Lead' ? 'monetization_on' : 'settings' }}
                      </span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex justify-between items-start">
                        <h5 class="text-xs font-bold text-[#1c1917] truncate" [class.font-black]="!n.read">{{ n.title }}</h5>
                        <button *ngIf="!n.read" (click)="markRead(n._id)" class="h-2 w-2 rounded-full bg-amber-600 shrink-0"></button>
                      </div>
                      <p class="text-[11px] text-stone-600 mt-0.5 leading-normal">{{ n.message }}</p>
                      <span class="text-[9px] text-[#44403c] mt-1 block font-semibold">{{ n.createdAt | date:'shortTime' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Profile Widget -->
            <div class="h-6 w-px bg-[#e7e5e4]"></div>
            <div class="flex items-center gap-2.5">
              <div class="text-right hidden sm:block">
                <span class="text-xs font-extrabold text-[#1c1917] block leading-none">{{ user()?.name }}</span>
                <span class="text-[10px] text-amber-700 font-bold capitalize block mt-0.5">{{ user()?.role?.replace('_', ' ') }}</span>
              </div>
              <div class="h-9 w-9 rounded-xl bg-[#1c1917] text-white flex items-center justify-center font-bold text-xs uppercase shadow">
                {{ user()?.name?.charAt(0) }}
              </div>
            </div>

          </div>
        </header>

        <!-- Dynamic Content Router Outlet -->
        <main class="flex-grow p-6 overflow-y-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      color: #a8a29e;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .nav-item:hover {
      background-color: rgba(255,255,255,0.06);
      color: #ffffff;
    }
    .nav-item.active-link {
      background-color: #d97706; /* Amber 600 */
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.25);
    }
    .nav-item .material-icons {
      font-size: 18px;
    }
  `]
})
export class LayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private socketService = inject(SocketService);
  private router = inject(Router);

  user = signal<UserProfile | null>(null);
  isMobileOpen = signal(false);
  isNotifOpen = signal(false);
  searchQuery = '';

  notifications = signal<AlertNotification[]>([]);
  unreadCount = signal(0);

  constructor() {
    this.user.set(this.authService.currentUserValue);
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMobileOpen.set(false);
      this.isNotifOpen.set(false);
    });

    this.loadNotifications();

    this.socketService.onNotificationReceived.subscribe((notif: AlertNotification) => {
      this.notifications.update(n => [notif, ...n]);
      this.unreadCount.update(c => c + 1);
    });
  }

  toggleMobileMenu() {
    this.isMobileOpen.update(v => !v);
  }

  toggleNotifications() {
    this.isNotifOpen.update(v => !v);
  }

  loadNotifications() {
    this.apiService.getNotifications().subscribe({
      next: (res) => {
        if (res.success) {
          this.notifications.set(res.data);
        }
      }
    });
    this.apiService.getUnreadCount().subscribe({
      next: (res) => {
        if (res.success) {
          this.unreadCount.set(res.count);
        }
      }
    });
  }

  markRead(id: string) {
    this.apiService.markNotificationAsRead(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notifications.update(list => list.map(item => item._id === id ? { ...item, read: true } : item));
          this.unreadCount.update(c => Math.max(0, c - 1));
        }
      }
    });
  }

  markAllRead() {
    this.apiService.markAllNotificationsAsRead().subscribe({
      next: (res) => {
        if (res.success) {
          this.notifications.update(list => list.map(item => ({ ...item, read: true })));
          this.unreadCount.set(0);
        }
      }
    });
  }

  hasAccess(roles: string[]): boolean {
    return this.authService.hasRole(roles);
  }

  triggerGlobalSearch() {
    if (!this.searchQuery.trim()) return;
    this.router.navigate(['/customers'], { queryParams: { search: this.searchQuery } });
    this.searchQuery = '';
  }

  logout() {
    this.authService.logout();
  }
}
