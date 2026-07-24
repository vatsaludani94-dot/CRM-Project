import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  // Public Routes
  {
    path: 'home',
    loadComponent: () => import('./features/public-website/public-website.component').then(m => m.PublicWebsiteComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent)
  },

  // Private Routes wrapped in Layout
  {
    path: '',
    loadComponent: () => import('./shared/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'home/command-center',
        pathMatch: 'full'
      },

      // --- CANONICAL SAAS WORKFLOW ROUTES ---
      // HOME
      {
        path: 'home/command-center',
        loadComponent: () => import('./features/command-center/command-center.component').then(m => m.CommandCenterComponent)
      },

      // SALES
      {
        path: 'sales/pipeline',
        loadComponent: () => import('./features/leads/leads.component').then(m => m.LeadsComponent),
        data: { roles: ['super_admin', 'manager', 'employee'] }
      },
      {
        path: 'sales/customers',
        loadComponent: () => import('./features/customers/customers.component').then(m => m.CustomersComponent)
      },
      {
        path: 'sales/customers/:id',
        loadComponent: () => import('./features/customers/customer360.component').then(m => m.Customer360Component)
      },
      {
        path: 'sales/proposals',
        loadComponent: () => import('./features/documents-invoices/documents-invoices.component').then(m => m.DocumentsInvoicesComponent)
      },

      // COMMUNICATIONS
      {
        path: 'communications/inbox',
        loadComponent: () => import('./features/email-center/email-center.component').then(m => m.EmailCenterComponent)
      },

      // OPERATIONS
      {
        path: 'operations/automations',
        loadComponent: () => import('./features/workflows/workflows.component').then(m => m.WorkflowsComponent),
        data: { roles: ['super_admin', 'manager'] }
      },
      {
        path: 'operations/calendar',
        loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent),
        data: { roles: ['super_admin', 'manager', 'employee'] }
      },
      {
        path: 'operations/tasks',
        loadComponent: () => import('./features/tasks/tasks.component').then(m => m.TasksComponent)
      },

      // GROWTH
      {
        path: 'growth/website-builder',
        loadComponent: () => import('./features/web-builder/web-builder.component').then(m => m.WebBuilderComponent)
      },
      {
        path: 'growth/forms',
        loadComponent: () => import('./features/forms-surveys/forms-surveys.component').then(m => m.FormsSurveysComponent)
      },
      {
        path: 'growth/storage',
        loadComponent: () => import('./features/drive-center/drive-center.component').then(m => m.DriveCenterComponent)
      },

      // INSIGHTS
      {
        path: 'insights/ai',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
        data: { roles: ['super_admin', 'manager'] }
      },

      // WORKSPACE
      {
        path: 'workspace/team',
        loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent),
        data: { roles: ['super_admin', 'manager', 'employee'] }
      },
      {
        path: 'workspace/payroll',
        loadComponent: () => import('./features/payroll/payroll.component').then(m => m.PayrollComponent)
      },
      {
        path: 'workspace/chat',
        loadComponent: () => import('./features/chat-center/chat-center.component').then(m => m.ChatCenterComponent)
      },
      {
        path: 'workspace/settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },

      // --- LEGACY COMPATIBILITY ROUTE ALIASES ---
      {
        path: 'dashboard',
        loadComponent: () => import('./features/command-center/command-center.component').then(m => m.CommandCenterComponent)
      },
      {
        path: 'command-center',
        loadComponent: () => import('./features/command-center/command-center.component').then(m => m.CommandCenterComponent)
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customers.component').then(m => m.CustomersComponent)
      },
      {
        path: 'customers/:id',
        loadComponent: () => import('./features/customers/customer360.component').then(m => m.Customer360Component)
      },
      {
        path: 'leads',
        loadComponent: () => import('./features/leads/leads.component').then(m => m.LeadsComponent),
        data: { roles: ['super_admin', 'manager', 'employee'] }
      },
      {
        path: 'tickets',
        loadComponent: () => import('./features/tickets/tickets.component').then(m => m.TicketsComponent)
      },
      {
        path: 'employees',
        loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent),
        data: { roles: ['super_admin', 'manager', 'employee'] }
      },
      {
        path: 'payroll',
        loadComponent: () => import('./features/payroll/payroll.component').then(m => m.PayrollComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
        data: { roles: ['super_admin', 'manager'] }
      },
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent),
        data: { roles: ['super_admin', 'manager', 'employee'] }
      },
      {
        path: 'social-automation',
        loadComponent: () => import('./features/social-automation/social-automation.component').then(m => m.SocialAutomationComponent),
        data: { roles: ['super_admin', 'manager', 'employee'] }
      },
      {
        path: 'workflows',
        loadComponent: () => import('./features/workflows/workflows.component').then(m => m.WorkflowsComponent),
        data: { roles: ['super_admin', 'manager'] }
      },
      {
        path: 'email-center',
        loadComponent: () => import('./features/email-center/email-center.component').then(m => m.EmailCenterComponent)
      },
      {
        path: 'drive-center',
        loadComponent: () => import('./features/drive-center/drive-center.component').then(m => m.DriveCenterComponent)
      },
      {
        path: 'web-builder',
        loadComponent: () => import('./features/web-builder/web-builder.component').then(m => m.WebBuilderComponent)
      },
      {
        path: 'downloads',
        loadComponent: () => import('./features/downloads/downloads.component').then(m => m.DownloadsComponent)
      },
      {
        path: 'forms-surveys',
        loadComponent: () => import('./features/forms-surveys/forms-surveys.component').then(m => m.FormsSurveysComponent)
      },
      {
        path: 'sms-marketing',
        loadComponent: () => import('./features/sms-marketing/sms-marketing.component').then(m => m.SmsMarketingComponent)
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/tasks.component').then(m => m.TasksComponent)
      },
      {
        path: 'chat-center',
        loadComponent: () => import('./features/chat-center/chat-center.component').then(m => m.ChatCenterComponent)
      },
      {
        path: 'documents-invoices',
        loadComponent: () => import('./features/documents-invoices/documents-invoices.component').then(m => m.DocumentsInvoicesComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },

  // Fallback
  {
    path: '**',
    redirectTo: 'home'
  }
];
