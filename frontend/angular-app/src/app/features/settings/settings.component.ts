import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-fadeIn font-sans">
      
      <!-- Page Header -->
      <div class="space-y-1">
        <h1 class="text-2xl lg:text-3xl font-extrabold text-slate-900">Workspace & Security Settings</h1>
        <p class="text-xs text-slate-500">Configure outbound communication identity, brand theme, and account security controls.</p>
      </div>

      <!-- Main Layout Panels -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <!-- Left Sidebar Options -->
        <div class="md:col-span-1 space-y-4">
          <div class="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 space-y-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">Settings Navigation</h3>
            
            <button 
              (click)="activeTab = 'workspace'" 
              [class.bg-indigo-50]="activeTab === 'workspace'"
              [class.text-indigo-600]="activeTab === 'workspace'"
              [class.border-indigo-200]="activeTab === 'workspace'"
              class="w-full text-left p-3 rounded-xl border border-transparent text-slate-700 font-bold text-xs flex items-center gap-2.5 transition-all">
              <span class="material-icons text-sm">business</span>
              <span>Workspace & Identity</span>
            </button>

            <button 
              (click)="activeTab = 'security'" 
              [class.bg-indigo-50]="activeTab === 'security'"
              [class.text-indigo-600]="activeTab === 'security'"
              [class.border-indigo-200]="activeTab === 'security'"
              class="w-full text-left p-3 rounded-xl border border-transparent text-slate-700 font-bold text-xs flex items-center gap-2.5 transition-all">
              <span class="material-icons text-sm">security</span>
              <span>Account & 2FA Security</span>
            </button>
          </div>

          <div class="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md">
            <h3 class="text-xs font-bold text-amber-400">Communication Identity</h3>
            <p class="text-[11px] text-slate-300 leading-relaxed">
              Your outbound communication email identity sends client proposals and invoices. Your login authentication email remains protected separately.
            </p>
          </div>
        </div>

        <!-- Right Content Area -->
        <div class="md:col-span-2 space-y-6">
          
          <!-- Alert Messages -->
          <div *ngIf="message()" class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs text-center font-bold">
            {{ message() }}
          </div>
          <div *ngIf="errorMessage()" class="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs text-center font-bold">
            {{ errorMessage() }}
          </div>

          <!-- TAB 1: WORKSPACE IDENTITY & OUTBOUND EMAIL CONFIGURATION -->
          <div *ngIf="activeTab === 'workspace'" class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-6">
            <div class="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                <span class="material-icons text-slate-500 text-sm">business</span>
                <span>Workspace Communication Identity</span>
              </h3>
              <span 
                [class.bg-emerald-100]="workspaceForm.communicationEmailStatus === 'verified'"
                [class.text-emerald-700]="workspaceForm.communicationEmailStatus === 'verified'"
                [class.bg-amber-100]="workspaceForm.communicationEmailStatus !== 'verified'"
                [class.text-amber-700]="workspaceForm.communicationEmailStatus !== 'verified'"
                class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                {{ workspaceForm.communicationEmailStatus || 'unconfigured' }}
              </span>
            </div>

            <form class="space-y-4 text-xs">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Workspace Display Name</label>
                <input type="text" [(ngModel)]="workspaceForm.workspaceName" name="workspaceName" placeholder="e.g., Apex Technologies" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <span class="text-[10px] text-slate-400 mt-1 block">Displayed on client PDF proposals, invoice headers, and executive reports.</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Outbound Communication Email</label>
                  <input type="email" [(ngModel)]="workspaceForm.communicationEmail" name="communicationEmail" placeholder="contact@apextech.com" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <span class="text-[10px] text-slate-400 mt-1 block">Used for sending proposals, invoices, and customer communications.</span>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Communication Sender Name</label>
                  <input type="text" [(ngModel)]="workspaceForm.communicationEmailName" name="communicationEmailName" placeholder="Apex Customer Success" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <span class="text-[10px] text-slate-400 mt-1 block">Name displayed in email "From" header.</span>
                </div>
              </div>

              <!-- Auth vs Communication Identity Read-Only Summary -->
              <div class="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 font-semibold">Account Login Email (Auth Identity):</span>
                  <span class="font-bold text-slate-900">{{ authUserEmail() }}</span>
                </div>
                <div class="flex justify-between items-center border-t border-slate-200 pt-2">
                  <span class="text-slate-500 font-semibold">Active Outbound Email (CRM Identity):</span>
                  <span class="font-bold text-indigo-600">{{ workspaceForm.communicationEmail || authUserEmail() }}</span>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Application Visual Theme</label>
                  <select [(ngModel)]="workspaceForm.theme" name="theme" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="light">Light Theme (Default)</option>
                    <option value="dark">Dark Theme</option>
                    <option value="system">System Preference</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Brand Primary Accent Color</label>
                  <input type="color" [(ngModel)]="workspaceForm.primaryColor" name="primaryColor" class="h-10 w-full p-1 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer">
                </div>
              </div>

              <div class="flex justify-end pt-4 border-t border-slate-100">
                <button (click)="saveWorkspaceSettings()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all">
                  Save Workspace Identity
                </button>
              </div>
            </form>
          </div>

          <!-- TAB 2: PASSKEYS & 2FA SECURITY -->
          <div *ngIf="activeTab === 'security'" class="space-y-6">
            
            <!-- Section 1: Biometric & Security Key Passkeys -->
            <div class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-6">
              <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span class="material-icons text-slate-500 text-sm">fingerprint</span>
                  <span>FIDO2 / WebAuthn Passkeys</span>
                </h3>
                <button 
                  (click)="registerPasskey()" 
                  [disabled]="isLoading()"
                  class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer disabled:bg-slate-300">
                  + Add Passkey
                </button>
              </div>

              <!-- Passkey Register Input dialog -->
              <div *ngIf="showPasskeyModal()" class="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3 animate-slideIn">
                <h4 class="text-xs font-bold text-slate-900">Assign Passkey Nickname</h4>
                <div class="flex gap-2">
                  <input 
                    type="text" 
                    [(ngModel)]="passkeyNickname"
                    placeholder="e.g. Macbook TouchID, Windows Hello" 
                    class="flex-1 px-3 py-2 bg-white border border-slate-200 text-xs font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600">
                  <button (click)="submitPasskeyRegistration()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">Register</button>
                  <button (click)="showPasskeyModal.set(false)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer">Cancel</button>
                </div>
              </div>

              <!-- Passkeys list -->
              <div *ngIf="passkeys().length > 0; else noPasskeys" class="space-y-2">
                <div *ngFor="let pk of passkeys()" class="flex justify-between items-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <div class="flex items-center gap-3">
                    <span class="material-icons text-indigo-600 text-lg">devices</span>
                    <div>
                      <p class="text-xs font-black text-slate-900">{{ pk.deviceName }}</p>
                      <p class="text-[10px] text-slate-500">Registered on {{ pk.createdAt | date:'shortDate' }} • Counter: {{ pk.counter }}</p>
                    </div>
                  </div>
                  <button 
                    (click)="deletePasskey(pk._id)" 
                    class="text-[10px] text-rose-600 font-bold hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                    Delete
                  </button>
                </div>
              </div>
              <ng-template #noPasskeys>
                <p class="text-xs text-slate-500 italic py-2">No hardware key or biometric passkeys registered yet.</p>
              </ng-template>
            </div>

            <!-- Section 2: Google Authenticator TOTP 2FA -->
            <div class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-6">
              <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span class="material-icons text-slate-500 text-sm">security</span>
                  <span>Two-Factor Authentication (TOTP)</span>
                </h3>
                <span 
                  [class.bg-emerald-100]="twoFactorEnabled()"
                  [class.text-emerald-800]="twoFactorEnabled()"
                  [class.bg-slate-100]="!twoFactorEnabled()"
                  [class.text-slate-700]="!twoFactorEnabled()"
                  class="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-slate-200">
                  {{ twoFactorEnabled() ? 'Active' : 'Disabled' }}
                </span>
              </div>

              <!-- Enable 2FA Setup Panel -->
              <div *ngIf="show2faSetup()" class="bg-slate-50 p-5 border border-slate-200 rounded-xl space-y-5 animate-slideIn">
                <div class="space-y-2">
                  <h4 class="text-xs font-bold text-slate-900">Scan QR Code</h4>
                  <p class="text-[11px] text-slate-500">Open Google Authenticator app, click "+" and scan this QR code.</p>
                </div>

                <div class="flex flex-col md:flex-row items-center gap-6">
                  <div class="bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                    <img [src]="qrCodeUrl()" alt="Authenticator QR Code" class="w-32 h-32 object-contain">
                  </div>
                  <div class="space-y-3 flex-1">
                    <div>
                      <p class="text-[9px] font-bold text-slate-500 uppercase">Backup Secret Key</p>
                      <code class="text-xs font-mono font-bold text-indigo-600 select-all block bg-white border border-slate-200 p-2 rounded mt-1">{{ backupSecret() }}</code>
                    </div>
                    <div>
                      <label for="totpVerify" class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Enter Verification Code</label>
                      <div class="flex gap-2">
                        <input 
                          id="totpVerify" 
                          type="text" 
                          maxLength="6"
                          placeholder="123456" 
                          [(ngModel)]="totpCode"
                          class="px-3 py-2 bg-white border border-slate-200 text-xs font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 w-32">
                        <button (click)="confirmEnable2FA()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">Verify & Enable</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Disable 2FA Panel -->
              <div *ngIf="show2faDisable()" class="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3 animate-slideIn">
                <h4 class="text-xs font-bold text-slate-900">Disable Two-Factor Authentication</h4>
                <p class="text-[11px] text-slate-500">Enter your password to disable 2FA protection.</p>
                <div class="flex gap-2">
                  <input 
                    type="password" 
                    [(ngModel)]="disablePassword"
                    placeholder="••••••••" 
                    class="px-3 py-2 bg-white border border-slate-200 text-xs font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 w-44">
                  <button (click)="confirmDisable2FA()" class="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">Confirm Disable</button>
                  <button (click)="show2faDisable.set(false)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer">Cancel</button>
                </div>
              </div>

              <div class="flex justify-between items-center">
                <p class="text-xs text-slate-500">TOTP 2FA protects workspace access if password is compromised.</p>
                <button 
                  *ngIf="!twoFactorEnabled() && !show2faSetup()" 
                  (click)="start2faSetup()" 
                  class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer">
                  Enable 2FA
                </button>
                <button 
                  *ngIf="twoFactorEnabled() && !show2faDisable()" 
                  (click)="start2faDisable()" 
                  class="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer">
                  Disable 2FA
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  `
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);

  activeTab = 'workspace';
  isLoading = signal(false);
  message = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  authUserEmail = signal<string>('');

  workspaceForm = {
    workspaceName: '',
    communicationEmail: '',
    communicationEmailName: '',
    communicationEmailStatus: 'unconfigured',
    theme: 'light',
    primaryColor: '#6366f1',
    secondaryColor: '#0f172a'
  };

  // Passkeys signals
  passkeys = signal<any[]>([]);
  showPasskeyModal = signal(false);
  passkeyNickname = '';

  // 2FA signals
  twoFactorEnabled = signal(false);
  show2faSetup = signal(false);
  show2faDisable = signal(false);
  qrCodeUrl = signal('');
  backupSecret = signal('');
  totpCode = '';
  disablePassword = '';

  ngOnInit() {
    this.loadProfile();
    this.loadWorkspaceSettings();
  }

  loadProfile() {
    this.authService.getMe().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const user = res.data;
          this.authUserEmail.set(user.email || '');
          this.passkeys.set(user.passkeys || []);
          this.twoFactorEnabled.set(user.twoFactorEnabled || false);
        }
      }
    });
  }

  loadWorkspaceSettings() {
    this.apiService.getWorkspaceSettings().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const d = res.data;
          this.workspaceForm = {
            workspaceName: d.workspaceName || '',
            communicationEmail: d.communicationEmail || '',
            communicationEmailName: d.communicationEmailName || '',
            communicationEmailStatus: d.communicationEmailStatus || 'unconfigured',
            theme: d.theme || 'light',
            primaryColor: d.whiteLabelSettings?.primaryColor || '#6366f1',
            secondaryColor: d.whiteLabelSettings?.secondaryColor || '#0f172a'
          };
        }
      }
    });
  }

  saveWorkspaceSettings() {
    this.message.set(null);
    this.errorMessage.set(null);

    this.apiService.updateWorkspaceSettings(this.workspaceForm).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.message.set('Workspace Identity & Outbound Communication Email updated successfully!');
          this.loadWorkspaceSettings();
        }
      },
      error: (err: any) => {
        this.errorMessage.set(err.error?.error || 'Failed to update workspace settings.');
      }
    });
  }

  // Passkey Actions
  registerPasskey() {
    this.passkeyNickname = '';
    this.showPasskeyModal.set(true);
  }

  submitPasskeyRegistration() {
    if (!this.passkeyNickname.trim()) return;

    this.isLoading.set(true);
    this.message.set(null);
    this.errorMessage.set(null);

    this.authService.getPasskeyRegisterOptions().subscribe({
      next: async (options) => {
        try {
          const { startRegistration } = await import('@simplewebauthn/browser');
          const regResponse = await startRegistration(options);

          this.authService.verifyPasskeyRegistration(regResponse, this.passkeyNickname).subscribe({
            next: (res) => {
              this.isLoading.set(false);
              this.showPasskeyModal.set(false);
              this.message.set('Device passkey registered successfully!');
              this.loadProfile();
            },
            error: (err: any) => {
              this.isLoading.set(false);
              this.errorMessage.set(err.error?.error || 'Failed to verify passkey signature.');
            }
          });
        } catch (err: any) {
          this.isLoading.set(false);
          this.errorMessage.set(err.message || 'Passkey registration cancelled.');
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to load WebAuthn options.');
      }
    });
  }

  deletePasskey(id: string) {
    if (!confirm('Are you sure you want to delete this passkey?')) return;

    this.authService.deletePasskey(id).subscribe({
      next: () => {
        this.message.set('Passkey deleted successfully.');
        this.loadProfile();
      },
      error: (err: any) => {
        this.errorMessage.set(err.error?.error || 'Failed to delete passkey.');
      }
    });
  }

  // 2FA Actions
  start2faSetup() {
    this.isLoading.set(true);
    this.message.set(null);
    this.errorMessage.set(null);

    this.authService.setup2FA().subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success) {
          this.qrCodeUrl.set(res.qrCode);
          this.backupSecret.set(res.secret);
          this.show2faSetup.set(true);
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to initialize 2FA configuration.');
      }
    });
  }

  confirmEnable2FA() {
    if (this.totpCode.length !== 6) return;

    this.isLoading.set(true);
    this.message.set(null);
    this.errorMessage.set(null);

    this.authService.verify2FA(this.totpCode).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.show2faSetup.set(false);
        this.totpCode = '';
        this.message.set('Two-Factor Authentication is now active!');
        this.loadProfile();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Invalid code.');
      }
    });
  }

  start2faDisable() {
    this.disablePassword = '';
    this.show2faDisable.set(true);
  }

  confirmDisable2FA() {
    this.isLoading.set(true);
    this.message.set(null);
    this.errorMessage.set(null);

    this.authService.disable2FA(this.disablePassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.show2faDisable.set(false);
        this.disablePassword = '';
        this.message.set('Two-Factor Authentication disabled successfully.');
        this.loadProfile();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to disable 2FA.');
      }
    });
  }
}
