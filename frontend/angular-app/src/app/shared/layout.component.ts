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
    <div class="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      
      <!-- Mobile Header -->
      <header class="md:hidden flex justify-between items-center bg-slate-900 text-white px-4 py-3 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="material-icons text-sky-400">donut_large</span>
          <span class="font-bold text-lg tracking-wider">GROWNX</span>
        </div>
        <button (click)="toggleMobileMenu()" class="text-white hover:text-sky-400 focus:outline-none">
          <span class="material-icons">{{ isMobileOpen() ? 'close' : 'menu' }}</span>
        </button>
      </header>

      <!-- Sidebar Container -->
      <aside 
        [class.translate-x-0]="isMobileOpen()" 
        [class.-translate-x-full]="!isMobileOpen()" 
        class="fixed md:static inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-30 transition-transform duration-300 md:translate-x-0 border-r border-slate-800">
        
        <!-- Sidebar Branding -->
        <div class="p-6 border-b border-slate-800 flex items-center gap-3">
          <span class="material-icons text-4xl text-sky-400">donut_large</span>
          <div>
            <h1 class="font-bold text-xl text-white tracking-tight leading-none">GROWNX</h1>
            <span class="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-1 block">Grownox Technologies</span>
          </div>
        </div>

        <!-- User Brief -->
        <div class="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/30">
          <div class="h-10 w-10 rounded-full bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 font-semibold text-lg uppercase">
            {{ user()?.name?.substring(0, 2) }}
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="font-semibold text-sm text-white truncate">{{ user()?.name }}</h4>
            <span class="text-xs text-slate-500 truncate block capitalize font-medium">{{ user()?.role?.replace('_', ' ') }}</span>
          </div>
        </div>

        <!-- Sidebar Navigation Links -->
        <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <a routerLink="/dashboard" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">dashboard</span>
            <span>Dashboard</span>
          </a>
          <a *ngIf="hasAccess(['super_admin', 'manager'])" routerLink="/command-center" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">query_stats</span>
            <span>Command Center</span>
          </a>
          <a routerLink="/customers" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">people</span>
            <span>Customers</span>
          </a>
          <a *ngIf="hasAccess(['super_admin', 'manager', 'employee'])" routerLink="/leads" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">leaderboard</span>
            <span>Sales Pipeline</span>
          </a>
          <a routerLink="/tickets" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">confirmation_number</span>
            <span>Support Tickets</span>
          </a>
          <a *ngIf="hasAccess(['super_admin', 'manager', 'employee'])" routerLink="/employees" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">badge</span>
            <span>Employees</span>
          </a>
          <a routerLink="/payroll" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">payments</span>
            <span>Payroll Hub</span>
          </a>
          <a *ngIf="hasAccess(['super_admin', 'manager'])" routerLink="/reports" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">analytics</span>
            <span>Executive Reports</span>
          </a>
          <a *ngIf="hasAccess(['super_admin', 'manager', 'employee'])" routerLink="/calendar" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">calendar_today</span>
            <span>Calendar Scheduler</span>
          </a>
          <a *ngIf="hasAccess(['super_admin', 'manager', 'employee'])" routerLink="/social-automation" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">forum</span>
            <span>Social Automation</span>
          </a>
          <a *ngIf="hasAccess(['super_admin', 'manager'])" routerLink="/workflows" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">account_tree</span>
            <span>Workflows Builder</span>
          </a>
          <a routerLink="/email-center" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">mail</span>
            <span>Gmail Center</span>
          </a>
          <a routerLink="/drive-center" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">cloud_upload</span>
            <span>Google Drive</span>
          </a>
          <a routerLink="/web-builder" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">web</span>
            <span>Website Builder</span>
          </a>
          <a routerLink="/funnel-builder" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">filter_alt</span>
            <span>Sales Funnels</span>
          </a>
          <a routerLink="/forms-surveys" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">assignment</span>
            <span>Forms & Surveys</span>
          </a>
          <a routerLink="/sms-marketing" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">sms</span>
            <span>SMS Campaigns</span>
          </a>
          <a routerLink="/tasks" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">assignment_turned_in</span>
            <span>Tasks Hub</span>
          </a>
          <a routerLink="/chat-center" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">chat</span>
            <span>Team Chat</span>
          </a>
          <a routerLink="/documents-invoices" routerLinkActive="active-link" class="nav-item">
            <span class="material-icons">description</span>
            <span>Documents & Quotes</span>
          </a>
        </nav>

        <!-- Sidebar Footer -->
        <div class="p-4 border-t border-slate-800">
          <button (click)="logout()" class="w-full py-2.5 px-4 rounded-lg bg-slate-800/40 hover:bg-rose-500/10 hover:text-rose-400 border border-slate-800 hover:border-rose-500/20 text-slate-400 text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            <span class="material-icons text-sm">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <!-- Header -->
        <header class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/60 h-16 flex items-center justify-between px-6 z-20">
          
          <!-- Search Box -->
          <div class="flex items-center gap-2 max-w-lg w-full">
            <div class="relative w-full">
              <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input 
                type="text" 
                [(ngModel)]="searchQuery" 
                (keyup.enter)="triggerGlobalSearch()"
                placeholder="Search everywhere (Press Enter)..." 
                class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-700 dark:text-slate-200">
            </div>
          </div>

          <!-- Header Actions -->
          <div class="flex items-center gap-4">
            
            <!-- Dark Mode Toggle -->
            <button (click)="toggleDarkMode()" class="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full focus:outline-none">
              <span class="material-icons">{{ darkMode() ? 'light_mode' : 'dark_mode' }}</span>
            </button>

            <!-- Notifications Dropdown -->
            <div class="relative">
              <button (click)="toggleNotifications()" class="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full focus:outline-none relative">
                <span class="material-icons">notifications</span>
                <span *ngIf="unreadCount() > 0" class="absolute top-1 right-1 h-5 w-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-800 animate-pulse">
                  {{ unreadCount() }}
                </span>
              </button>

              <!-- Notifications Menu -->
              <div *ngIf="isNotifOpen()" class="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <div class="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <span class="font-bold text-sm text-slate-800 dark:text-white">Notifications</span>
                  <button (click)="markAllRead()" class="text-xs text-sky-500 hover:underline">Mark all read</button>
                </div>
                <div class="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  <div *ngIf="notifications().length === 0" class="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No new alerts
                  </div>
                  <div *ngFor="let n of notifications()" class="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 flex gap-3 transition-colors">
                    <div class="h-8 w-8 rounded-full flex items-center justify-center shrink-0" 
                      [ngClass]="{
                        'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400': n.type === 'Ticket',
                        'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400': n.type === 'Lead',
                        'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400': n.type === 'System'
                      }">
                      <span class="material-icons text-sm">
                        {{ n.type === 'Ticket' ? 'confirmation_number' : n.type === 'Lead' ? 'monetization_on' : 'settings' }}
                      </span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex justify-between items-start">
                        <h5 class="text-xs font-semibold text-slate-800 dark:text-white truncate" [class.font-bold]="!n.read">{{ n.title }}</h5>
                        <button *ngIf="!n.read" (click)="markRead(n._id)" class="h-2 w-2 rounded-full bg-sky-500 shrink-0"></button>
                      </div>
                      <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">{{ n.message }}</p>
                      <span class="text-[9px] text-slate-400 mt-1 block">{{ n.createdAt | date:'shortTime' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Profile widget -->
            <div class="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-slate-800 dark:text-white hidden sm:block">{{ user()?.name }}</span>
              <div class="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm uppercase">
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
      gap: 12px;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #94a3b8;
      transition: all 0.2s;
    }
    .nav-item:hover {
      background-color: rgba(255,255,255,0.04);
      color: #ffffff;
    }
    .nav-item.active-link {
      background-color: #0284c7; /* Sky 600 */
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
    }
    .nav-item .material-icons {
      font-size: 20px;
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
  darkMode = signal(false);
  isNotifOpen = signal(false);
  searchQuery = '';

  notifications = signal<AlertNotification[]>([]);
  unreadCount = signal(0);

  constructor() {
    // Synchronize signal with local storage
    this.user.set(this.authService.currentUserValue);
    
    // Check dark mode state from local storage or system defaults
    effect(() => {
      if (this.darkMode()) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }

  ngOnInit() {
    // Listen to route changes to close mobile menu
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMobileOpen.set(false);
      this.isNotifOpen.set(false);
    });

    // Load initial notifications
    this.loadNotifications();

    // Subscribe to Socket.IO real-time notification alerts!
    this.socketService.onNotificationReceived.subscribe((notif: AlertNotification) => {
      // Append to top of notifications array
      this.notifications.update(n => [notif, ...n]);
      this.unreadCount.update(c => c + 1);

      // Trigger modern audio cue/alert if available
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav');
        audio.volume = 0.4;
        audio.play();
      } catch (e) {
        // audio play failed (browser autoplays block)
      }
    });

    // Listen to ticket creations to live-update unread metrics if assigned to current user
    this.socketService.onTicketCreated.subscribe(ticket => {
      const activeUser = this.user();
      if (activeUser && ticket.assignedEmployee?._id === activeUser._id) {
        this.loadNotifications(); // reload
      }
    });
  }

  toggleMobileMenu() {
    this.isMobileOpen.update(v => !v);
  }

  toggleDarkMode() {
    this.darkMode.update(v => !v);
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
    // Redirect to customer directory with search parameter query
    this.router.navigate(['/customers'], { queryParams: { search: this.searchQuery } });
    this.searchQuery = '';
  }

  logout() {
    this.authService.logout();
  }
}
