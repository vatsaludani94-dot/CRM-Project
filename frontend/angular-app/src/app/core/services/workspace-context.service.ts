import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface WorkspaceIdentity {
  tenantId?: string;
  workspaceName?: string;
  name?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  theme?: string;
  communicationEmail?: string;
  communicationEmailName?: string;
  communicationEmailStatus?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceContextService {
  private authService = inject(AuthService);

  // Reactive state using Angular Signals
  public workspaceName = signal<string>('GrownX SaaS Workspace');
  public workspaceLogo = signal<string>('');
  public primaryColor = signal<string>('#6366f1'); // Default Indigo 600
  public secondaryColor = signal<string>('#0f172a'); // Default Slate 900
  public theme = signal<string>('light');
  public communicationEmail = signal<string>('');
  public communicationEmailName = signal<string>('');
  public communicationEmailStatus = signal<string>('unconfigured');

  // Computed workspace initials for logo avatar fallbacks
  public workspaceInitials = computed(() => {
    const name = this.workspaceName() || 'GrownX Workspace';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, Math.min(2, name.length)).toUpperCase();
  });

  constructor() {
    this.updateWorkspaceFromUser();
    this.authService.currentUser$.subscribe(() => {
      this.updateWorkspaceFromUser();
    });
  }

  public updateWorkspaceFromUser() {
    const user = this.authService.currentUserValue;
    const identity = user?.workspaceIdentity || {};
    const tenant = typeof user?.tenant === 'object' ? user?.tenant : null;

    const name = identity.workspaceName || tenant?.workspaceName || tenant?.name || (user?.name ? `${user.name}'s Workspace` : 'GrownX SaaS Workspace');
    const logo = identity.logo || tenant?.whiteLabelSettings?.logo || tenant?.logo || '';
    const primary = identity.primaryColor || tenant?.whiteLabelSettings?.primaryColor || tenant?.primaryColor || '#6366f1';
    const secondary = identity.secondaryColor || tenant?.whiteLabelSettings?.secondaryColor || tenant?.secondaryColor || '#0f172a';
    const themeMode = identity.theme || tenant?.theme || 'light';
    const commEmail = identity.communicationEmail || tenant?.communicationEmail || user?.email || '';
    const commName = identity.communicationEmailName || tenant?.communicationEmailName || name;
    const commStatus = identity.communicationEmailStatus || tenant?.communicationEmailStatus || (commEmail ? 'verified' : 'unconfigured');

    this.workspaceName.set(name);
    this.workspaceLogo.set(logo);
    this.primaryColor.set(primary);
    this.secondaryColor.set(secondary);
    this.theme.set(themeMode);
    this.communicationEmail.set(commEmail);
    this.communicationEmailName.set(commName);
    this.communicationEmailStatus.set(commStatus);

    this.applyTheme(themeMode, primary, secondary);
  }

  public setCustomBranding(identity: Partial<WorkspaceIdentity>) {
    if (identity.workspaceName || identity.name) {
      this.workspaceName.set(identity.workspaceName || identity.name || '');
    }
    if (identity.logo !== undefined) this.workspaceLogo.set(identity.logo);
    if (identity.primaryColor) this.primaryColor.set(identity.primaryColor);
    if (identity.secondaryColor) this.secondaryColor.set(identity.secondaryColor);
    if (identity.theme) this.theme.set(identity.theme);
    if (identity.communicationEmail) this.communicationEmail.set(identity.communicationEmail);
    if (identity.communicationEmailName) this.communicationEmailName.set(identity.communicationEmailName);
    if (identity.communicationEmailStatus) this.communicationEmailStatus.set(identity.communicationEmailStatus);

    this.applyTheme(this.theme(), this.primaryColor(), this.secondaryColor());
  }

  public applyTheme(themeMode: string, primary: string, secondary: string) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--workspace-primary', primary);
    root.style.setProperty('--workspace-secondary', secondary);
    root.style.setProperty('--workspace-primary-light', `${primary}1a`);
    root.style.setProperty('--workspace-primary-hover', primary);

    if (themeMode === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--workspace-background', '#090d16');
      root.style.setProperty('--workspace-surface', '#0f172a');
      root.style.setProperty('--workspace-text', '#f8fafc');
      root.style.setProperty('--workspace-muted-text', '#94a3b8');
      root.style.setProperty('--workspace-border', '#1e293b');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--workspace-background', '#fafaf9');
      root.style.setProperty('--workspace-surface', '#ffffff');
      root.style.setProperty('--workspace-text', '#1c1917');
      root.style.setProperty('--workspace-muted-text', '#574c43');
      root.style.setProperty('--workspace-border', '#e7e5e4');
    }
  }
}
