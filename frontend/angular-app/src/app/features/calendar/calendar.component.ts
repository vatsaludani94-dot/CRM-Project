import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface Appointment {
  _id: string;
  subject: string;
  description?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  customer?: { _id: string; companyName: string; contactPerson: string };
  lead?: { _id: string; company: string; contactName: string };
  host: { _id: string; name: string; role: string; department: string };
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white bg-white p-6 rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-sm">
        <div>
          <h2 class="text-2xl font-bold text-slate-800 text-[#1c1917] tracking-tight">Calendar Scheduler</h2>
          <p class="text-sm text-[#574c43] mt-1">Manage, view, and schedule business client appointments.</p>
        </div>
        <div class="flex flex-wrap gap-3 w-full sm:w-auto">
          
          <!-- Host Filter Dropdown (Admins / Managers) -->
          <div *ngIf="isAdminOrManager()" class="relative min-w-[180px]">
            <select 
              [(ngModel)]="filterHostId" 
              (change)="loadAppointments()"
              class="w-full pl-3 pr-8 py-2.5 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c] appearance-none">
              <option value="">All Hosts / Staff</option>
              <option *ngFor="let emp of employees()" [value]="emp._id">{{ emp.name }} ({{ emp.department }})</option>
            </select>
            <span class="material-icons absolute right-2.5 top-3 text-[#44403c] pointer-events-none text-sm">unfold_more</span>
          </div>

          <button 
            (click)="openBookingModal()"
            class="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-500/10 hover:shadow-sky-500/20 transition-all flex items-center gap-2">
            <span class="material-icons text-sm">add</span>
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      <!-- Calendar Body -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <!-- Month Grid (Cols: 3) -->
        <div class="lg:col-span-3 bg-white bg-white rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-sm overflow-hidden flex flex-col">
          
          <!-- Month Selector Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 border-[#e7e5e4]/60 bg-slate-50/55 bg-[#fafaf9]/30">
            <h3 class="text-base font-bold text-slate-800 text-[#1c1917] flex items-center gap-2">
              <span class="material-icons text-sky-500">calendar_month</span>
              <span>{{ getMonthName() }} {{ currentYear() }}</span>
            </h3>
            <div class="flex items-center gap-1">
              <button (click)="prevMonth()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-[#44403c]">
                <span class="material-icons text-lg">chevron_left</span>
              </button>
              <button (click)="goToToday()" class="px-2.5 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-[#44403c] font-medium">
                Today
              </button>
              <button (click)="nextMonth()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-[#44403c]">
                <span class="material-icons text-lg">chevron_right</span>
              </button>
            </div>
          </div>

          <!-- Week Days Label Header -->
          <div class="grid grid-cols-7 text-center py-2.5 bg-slate-100/50 bg-[#fafaf9]/50 border-b border-slate-100 border-[#e7e5e4]/60">
            <div *ngFor="let day of weekDays" class="text-xs font-bold text-[#574c43] uppercase tracking-wider">
              {{ day }}
            </div>
          </div>

          <!-- Calendar Monthly Grid -->
          <div class="grid grid-cols-7 grid-rows-6 flex-grow divide-x divide-y divide-slate-100 dark:divide-slate-700/50 min-h-[500px]">
            <div 
              *ngFor="let day of calendarDays()" 
              [class.bg-slate-50/30]="!day.dayNum"
              [class.bg-[#fafaf9]/10]="!day.dayNum"
              [class.hover:bg-slate-50/70]="day.dayNum"
              [class.dark:hover:bg-slate-700/20]="day.dayNum"
              [class.bg-sky-500/5]="day.dayNum && isToday(day.date)"
              [class.dark:bg-sky-500/10]="day.dayNum && isToday(day.date)"
              class="p-2 flex flex-col justify-between min-h-[90px] relative transition-colors group">
              
              <!-- Day Num Header -->
              <div class="flex justify-between items-center">
                <span 
                  *ngIf="day.dayNum" 
                  [class.h-6]="isToday(day.date)"
                  [class.w-6]="isToday(day.date)"
                  [class.rounded-full]="isToday(day.date)"
                  [class.bg-sky-500]="isToday(day.date)"
                  [class.text-white]="isToday(day.date)"
                  [class.flex]="isToday(day.date)"
                  [class.items-center]="isToday(day.date)"
                  [class.justify-center]="isToday(day.date)"
                  [class.font-bold]="isToday(day.date)"
                  class="text-xs font-medium text-[#44403c] dark:text-[#292524]">
                  {{ day.dayNum }}
                </span>
                
                <!-- Quick add button on hover -->
                <button 
                  *ngIf="day.dayNum"
                  (click)="openBookingModal(day.date)"
                  class="opacity-0 group-hover:opacity-100 text-sky-500 hover:text-sky-600 transition-opacity p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                  <span class="material-icons text-xs">add</span>
                </button>
              </div>

              <!-- Appointments List inside Day cell -->
              <div *ngIf="day.dayNum" class="mt-1 flex-grow space-y-1 overflow-y-auto max-h-[70px]">
                <div 
                  *ngFor="let app of day.appointments"
                  (click)="viewAppointmentDetails(app)"
                  [class.bg-sky-500/10]="app.status === 'Scheduled'"
                  [class.text-sky-700]="app.status === 'Scheduled'"
                  [class.dark:text-sky-400]="app.status === 'Scheduled'"
                  [class.bg-emerald-500/10]="app.status === 'Completed'"
                  [class.text-emerald-700]="app.status === 'Completed'"
                  [class.dark:text-emerald-400]="app.status === 'Completed'"
                  [class.bg-rose-500/10]="app.status === 'Cancelled'"
                  [class.text-rose-700]="app.status === 'Cancelled'"
                  [class.dark:text-rose-400]="app.status === 'Cancelled'"
                  class="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate cursor-pointer hover:brightness-95 transition-all flex items-center gap-1 border-l-2"
                  [ngClass]="{
                    'border-sky-500': app.status === 'Scheduled',
                    'border-emerald-500': app.status === 'Completed',
                    'border-rose-500': app.status === 'Cancelled'
                  }">
                  <span class="font-normal text-[9px] opacity-75">{{ app.startTime }}</span>
                  <span class="truncate">{{ app.subject }}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Appointment Details Drawer & Overview (Col: 1) -->
        <div class="space-y-6">
          
          <!-- Appointment Inspector Widget -->
          <div class="bg-white bg-white rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-sm p-6">
            <h3 class="text-base font-bold text-slate-800 text-[#1c1917] border-b border-slate-100 border-[#e7e5e4] pb-3 flex items-center gap-2">
              <span class="material-icons text-[#44403c]">info</span>
              <span>Details Inspector</span>
            </h3>

            <!-- Placeholder if no appointment is selected -->
            <div *ngIf="!selectedApp()" class="py-12 text-center text-[#44403c] dark:text-[#292524]">
              <span class="material-icons text-4xl mb-2">touch_app</span>
              <p class="text-xs font-medium">Click any appointment on the grid to inspect details and update status.</p>
            </div>

            <!-- Selected Appointment Info -->
            <div *ngIf="selectedApp() as app" class="space-y-4 pt-3">
              <div>
                <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  [ngClass]="{
                    'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400': app.status === 'Scheduled',
                    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400': app.status === 'Completed',
                    'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400': app.status === 'Cancelled'
                  }">
                  {{ app.status }}
                </span>
                <h4 class="text-lg font-bold text-slate-800 text-[#1c1917] mt-2 leading-snug">{{ app.subject }}</h4>
              </div>

              <div class="space-y-2.5 text-xs text-[#44403c]">
                <div class="flex items-center gap-2">
                  <span class="material-icons text-[#44403c] text-sm">schedule</span>
                  <span><strong>Time:</strong> {{ app.startTime }} - {{ app.endTime }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="material-icons text-[#44403c] text-sm">event</span>
                  <span><strong>Date:</strong> {{ formatDate(app.appointmentDate) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="material-icons text-[#44403c] text-sm">person</span>
                  <span><strong>Host:</strong> {{ app.host.name }} ({{ app.host.department }})</span>
                </div>

                <!-- Customer / Lead Link -->
                <div *ngIf="app.customer" class="flex items-center gap-2 p-2 bg-slate-50 bg-[#fafaf9] rounded-lg border border-slate-100 border-[#e7e5e4]/40">
                  <span class="material-icons text-sky-500 text-lg">corporate_fare</span>
                  <div class="min-w-0 flex-1">
                    <p class="font-bold text-slate-800 text-[#1c1917] truncate">Customer: {{ app.customer.companyName }}</p>
                    <a [routerLink]="['/customers', app.customer._id]" class="text-[10px] text-sky-500 hover:underline">View 360 profile &rarr;</a>
                  </div>
                </div>

                <div *ngIf="app.lead" class="flex items-center gap-2 p-2 bg-slate-50 bg-[#fafaf9] rounded-lg border border-slate-100 border-[#e7e5e4]/40">
                  <span class="material-icons text-emerald-500 text-lg">leaderboard</span>
                  <div class="min-w-0 flex-1">
                    <p class="font-bold text-slate-800 text-[#1c1917] truncate">Lead: {{ app.lead.company }}</p>
                    <a routerLink="/leads" class="text-[10px] text-emerald-500 hover:underline">View Kanban pipeline &rarr;</a>
                  </div>
                </div>
              </div>

              <!-- Description -->
              <div class="p-3 bg-slate-50 bg-[#fafaf9]/50 rounded-lg border border-slate-100 border-[#e7e5e4]/30 text-xs">
                <p class="font-semibold text-[#574c43] uppercase tracking-wider text-[9px] mb-1">Notes / Agenda</p>
                <p class="text-[#44403c] leading-relaxed italic">
                  {{ app.description || 'No description provided.' }}
                </p>
              </div>

              <!-- Edit / Update Status Actions -->
              <div class="space-y-2 pt-2">
                <p class="text-[10px] font-bold text-[#44403c] uppercase tracking-wider">Update Status</p>
                <div class="flex gap-2">
                  <button 
                    *ngIf="app.status === 'Scheduled'"
                    (click)="changeAppointmentStatus(app._id, 'Completed')"
                    class="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-semibold shadow transition-colors">
                    Mark Completed
                  </button>
                  <button 
                    *ngIf="app.status === 'Scheduled'"
                    (click)="changeAppointmentStatus(app._id, 'Cancelled')"
                    class="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-xs font-semibold shadow transition-colors">
                    Cancel Meeting
                  </button>
                </div>
                <button 
                  (click)="deleteAppointmentRecord(app._id)"
                  class="w-full py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 border-[#e7e5e4] text-[#574c43] rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1">
                  <span class="material-icons text-sm">delete</span>
                  <span>Delete Appointment</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Upcoming Meetings Panel -->
          <div class="bg-white bg-white rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-sm p-6">
            <h3 class="text-base font-bold text-slate-800 text-[#1c1917] border-b border-slate-100 border-[#e7e5e4] pb-3 flex items-center gap-2">
              <span class="material-icons text-sky-500">pending_actions</span>
              <span>Upcoming Queue</span>
            </h3>
            <div class="space-y-3 pt-3">
              <div *ngIf="upcomingAppointments().length === 0" class="text-center text-xs py-6 text-[#44403c]">
                No upcoming meetings.
              </div>
              <div 
                *ngFor="let app of upcomingAppointments()"
                (click)="viewAppointmentDetails(app)"
                class="p-2 rounded-lg bg-slate-50 bg-[#fafaf9] border border-slate-100 border-[#e7e5e4] hover:border-sky-400 dark:hover:border-sky-500 transition-colors cursor-pointer flex justify-between items-center gap-2">
                <div class="min-w-0 flex-1">
                  <h4 class="text-xs font-bold text-slate-700 text-[#1c1917] truncate">{{ app.subject }}</h4>
                  <p class="text-[10px] text-[#574c43] mt-0.5">
                    {{ formatDateShort(app.appointmentDate) }} at {{ app.startTime }}
                  </p>
                </div>
                <span class="material-icons text-[#1c1917] text-sm shrink-0">navigate_next</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Booking Dialog/Modal Modal -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 bg-slate-900/60 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white bg-white rounded-2xl border border-slate-100 border-[#e7e5e4]/60 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
          
          <!-- Header -->
          <div class="px-6 py-4 bg-slate-50 bg-[#fafaf9]/50 border-b border-slate-100 border-[#e7e5e4] flex justify-between items-center">
            <h3 class="font-bold text-slate-800 text-[#1c1917] text-base">Schedule New Appointment</h3>
            <button (click)="closeBookingModal()" class="text-[#44403c] hover:text-slate-600 dark:hover:text-[#1c1917]">
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- Form -->
          <form (ngSubmit)="bookAppointment()" class="p-6 space-y-4">
            
            <!-- Subject -->
            <div>
              <label class="block text-xs font-bold text-[#574c43] uppercase tracking-wider mb-1.5">Subject *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Q3 Contract Discussion"
                [(ngModel)]="newApp.subject" 
                name="subject"
                class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]">
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-bold text-[#574c43] uppercase tracking-wider mb-1.5">Description / Agenda</label>
              <textarea 
                rows="2"
                placeholder="Meeting agenda or briefing notes..."
                [(ngModel)]="newApp.description" 
                name="description"
                class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]"></textarea>
            </div>

            <!-- Date, Start, End -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-[#574c43] uppercase tracking-wider mb-1.5">Date *</label>
                <input 
                  type="date" 
                  required
                  [(ngModel)]="newApp.appointmentDate" 
                  name="appointmentDate"
                  class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]">
              </div>
              <div>
                <label class="block text-xs font-bold text-[#574c43] uppercase tracking-wider mb-1.5">Start Time *</label>
                <input 
                  type="time" 
                  required
                  [(ngModel)]="newApp.startTime" 
                  name="startTime"
                  class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]">
              </div>
              <div>
                <label class="block text-xs font-bold text-[#574c43] uppercase tracking-wider mb-1.5">End Time *</label>
                <input 
                  type="time" 
                  required
                  [(ngModel)]="newApp.endTime" 
                  name="endTime"
                  class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]">
              </div>
            </div>

            <!-- Client Linking -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-[#574c43] uppercase tracking-wider mb-1.5">Link Customer (Optional)</label>
                <select 
                  [(ngModel)]="newApp.customerId" 
                  name="customerId"
                  (change)="newApp.leadId = ''"
                  class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]">
                  <option value="">-- No Customer Link --</option>
                  <option *ngFor="let cust of customers()" [value]="cust._id">{{ cust.companyName }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#574c43] uppercase tracking-wider mb-1.5">Link Lead (Optional)</label>
                <select 
                  [(ngModel)]="newApp.leadId" 
                  name="leadId"
                  (change)="newApp.customerId = ''"
                  class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]">
                  <option value="">-- No Lead Link --</option>
                  <option *ngFor="let ld of leads()" [value]="ld._id">{{ ld.company }} ({{ ld.contactName }})</option>
                </select>
              </div>
            </div>

            <!-- Host Assignment (Super Admins / Managers can assign) -->
            <div *ngIf="isAdminOrManager()">
              <label class="block text-xs font-bold text-[#574c43] uppercase tracking-wider mb-1.5">Host Representative *</label>
              <select 
                [(ngModel)]="newApp.hostId" 
                name="hostId"
                required
                class="w-full px-3 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg bg-slate-50 bg-[#fafaf9] text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[#44403c]">
                <option value="">-- Select Host --</option>
                <option *ngFor="let emp of employees()" [value]="emp._id">{{ emp.name }} ({{ emp.department }})</option>
              </select>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 border-[#e7e5e4]">
              <button 
                type="button" 
                (click)="closeBookingModal()"
                class="px-4 py-2 border border-slate-200 border-[#e7e5e4] rounded-lg text-slate-600 dark:text-[#44403c] text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button 
                type="submit"
                class="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-500/10">
                Confirm Booking
              </button>
            </div>

          </form>
        </div>
      </div>

    </div>
  `,
  styles: []
})
export class CalendarComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  // States
  appointments = signal<Appointment[]>([]);
  selectedApp = signal<Appointment | null>(null);
  
  // Date State
  currentYear = signal<number>(2026);
  currentMonth = signal<number>(5); // June (0-indexed)
  
  calendarDays = signal<any[]>([]);

  // Filter
  filterHostId = '';
  
  // Resources for Form
  employees = signal<any[]>([]);
  customers = signal<any[]>([]);
  leads = signal<any[]>([]);

  // Modal State
  isModalOpen = signal(false);
  newApp = {
    subject: '',
    description: '',
    appointmentDate: '',
    startTime: '',
    endTime: '',
    customerId: '',
    leadId: '',
    hostId: ''
  };

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Upcoming appointments (limit 5)
  upcomingAppointments = computed(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return this.appointments()
      .filter(app => new Date(app.appointmentDate) >= today && app.status === 'Scheduled')
      .slice(0, 5);
  });

  ngOnInit() {
    const today = new Date();
    // Default to today's year & month (or fallbacks for seed data if seed date is fixed)
    this.currentYear.set(today.getFullYear());
    this.currentMonth.set(today.getMonth());

    this.loadAppointments();
    
    // Load metadata for scheduler lists
    if (this.isAdminOrManager()) {
      this.apiService.getEmployees().subscribe(res => {
        if (res.success) this.employees.set(res.data);
      });
    }
    
    this.apiService.getCustomers().subscribe(res => {
      if (res.success) this.customers.set(res.data);
    });

    this.apiService.getLeads().subscribe(res => {
      if (res.success) this.leads.set(res.data);
    });
  }

  isAdminOrManager(): boolean {
    return this.authService.hasRole(['super_admin', 'manager']);
  }

  loadAppointments() {
    // Formulate date range of the active grid view (first to end day)
    const startDate = new Date(this.currentYear(), this.currentMonth(), 1);
    const endDate = new Date(this.currentYear(), this.currentMonth() + 1, 0, 23, 59, 59);

    const queryParams: any = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };

    if (this.filterHostId) {
      queryParams.hostId = this.filterHostId;
    }

    this.apiService.getAppointments(queryParams).subscribe({
      next: (res) => {
        if (res.success) {
          this.appointments.set(res.data);
          this.generateCalendarGrid();
          
          // Re-sync selected appointment details if it was open
          if (this.selectedApp()) {
            const current = res.data.find((a: Appointment) => a._id === this.selectedApp()?._id);
            if (current) this.selectedApp.set(current);
            else this.selectedApp.set(null);
          }
        }
      }
    });
  }

  generateCalendarGrid() {
    const year = this.currentYear();
    const month = this.currentMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // Sunday=0, Monday=1 etc.
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: any[] = [];
    
    // Previous month placeholder slots
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNum: null, date: null, appointments: [] });
    }
    
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      
      // Compare string dates in local timezone to group matching appointments
      const dateString = this.getLocalDateString(date);
      
      const dayAppointments = this.appointments().filter(app => {
        const appDate = new Date(app.appointmentDate);
        return this.getLocalDateString(appDate) === dateString;
      });

      days.push({
        dayNum: d,
        date: date,
        appointments: dayAppointments
      });
    }

    // Fill remaining grid spaces for calendar formatting (6 rows * 7 columns = 42 total slots)
    const remainingSlots = 42 - days.length;
    for (let i = 0; i < remainingSlots; i++) {
      days.push({ dayNum: null, date: null, appointments: [] });
    }
    
    this.calendarDays.set(days);
  }

  private getLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getMonthName(): string {
    return this.months[this.currentMonth()];
  }

  prevMonth() {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.update(y => y - 1);
    } else {
      this.currentMonth.update(m => m - 1);
    }
    this.loadAppointments();
  }

  nextMonth() {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.update(y => y + 1);
    } else {
      this.currentMonth.update(m => m + 1);
    }
    this.loadAppointments();
  }

  goToToday() {
    const today = new Date();
    this.currentYear.set(today.getFullYear());
    this.currentMonth.set(today.getMonth());
    this.loadAppointments();
  }

  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  viewAppointmentDetails(app: Appointment) {
    this.selectedApp.set(app);
  }

  // Appointment scheduling
  openBookingModal(preselectedDate?: Date) {
    this.newApp = {
      subject: '',
      description: '',
      appointmentDate: preselectedDate ? this.getLocalDateString(preselectedDate) : this.getLocalDateString(new Date()),
      startTime: '10:00',
      endTime: '11:00',
      customerId: '',
      leadId: '',
      hostId: this.authService.currentUserValue?._id || ''
    };
    this.isModalOpen.set(true);
  }

  closeBookingModal() {
    this.isModalOpen.set(false);
  }

  bookAppointment() {
    this.apiService.createAppointment(this.newApp).subscribe({
      next: (res) => {
        if (res.success) {
          this.isModalOpen.set(false);
          this.loadAppointments();
          this.selectedApp.set(res.data);
        }
      }
    });
  }

  changeAppointmentStatus(id: string, status: string) {
    this.apiService.updateAppointment(id, { status }).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadAppointments();
        }
      }
    });
  }

  deleteAppointmentRecord(id: string) {
    if (confirm('Are you sure you want to cancel and remove this appointment?')) {
      this.apiService.deleteAppointment(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.selectedApp.set(null);
            this.loadAppointments();
          }
        }
      });
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatDateShort(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
