import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface WorkspaceIdentity {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  theme: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceContextService {
  private authService = inject(AuthService);

  // Reactive state using Angular Signals
  public workspaceName = signal<string>('GrownX SaaS Workspace');
  public workspaceLogo = signal<string>('');
  public primaryColor = signal<string>('#d97706'); // Default Amber 600
  public secondaryColor = signal<string>('#1c1917');
  public theme = signal<string>('dark');

  // Computed workspace initials for logo avatar fallbacks
  public workspaceInitials = computed(() => {
    const name = this.workspaceName() || 'GrownX Workspace';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  constructor() {
    this.updateWorkspaceFromUser();
    this.authService.currentUser$.subscribe(() => {
      this.updateWorkspaceFromUser();
    });
  }

  private updateWorkspaceFromUser() {
    const user = this.authService.currentUserValue;
    if (user && user.tenant) {
      const tenant = typeof user.tenant === 'object' ? user.tenant : null;
      const name = tenant?.name || (user.name ? `${user.name}'s Workspace` : 'GrownX SaaS Workspace');
      this.workspaceName.set(name);
      if (tenant?.logo) this.workspaceLogo.set(tenant.logo);
      if (tenant?.primaryColor) this.primaryColor.set(tenant.primaryColor);
      if (tenant?.secondaryColor) this.secondaryColor.set(tenant.secondaryColor);
    } else if (user) {
      this.workspaceName.set(user.name ? `${user.name}'s Workspace` : 'GrownX SaaS Workspace');
    } else {
      this.workspaceName.set('GrownX SaaS Workspace');
    }
  }

  public setCustomBranding(identity: Partial<WorkspaceIdentity>) {
    if (identity.name) this.workspaceName.set(identity.name);
    if (identity.logo !== undefined) this.workspaceLogo.set(identity.logo);
    if (identity.primaryColor) this.primaryColor.set(identity.primaryColor);
    if (identity.secondaryColor) this.secondaryColor.set(identity.secondaryColor);
    if (identity.theme) this.theme.set(identity.theme);
  }
}
