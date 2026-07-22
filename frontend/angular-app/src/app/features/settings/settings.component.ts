import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-fadeIn font-sans">
      
      <!-- Page Header -->
      <div class="space-y-1">
        <h1 class="text-2xl lg:text-3xl font-black text-[#1c1917]">Security & Authentication Settings</h1>
        <p class="text-xs text-[#44403c]">Add multi-factor protection, manage hardware passkeys, and secure your workspace identity.</p>
      </div>

      <!-- Main Layout Panels -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <!-- Left Sidebar Options -->
        <div class="md:col-span-1 space-y-4">
          <div class="bg-white border border-[#e7e5e4] shadow-sm rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-stone-500">Settings Panels</h3>
            <button class="w-full text-left p-3 rounded-xl bg-amber-500/10 text-amber-900 border border-amber-500/20 text-xs font-black flex items-center gap-2">
              <span class="material-icons text-sm">security</span>
              <span>Account Security</span>
            </button>
          </div>

          <div class="bg-[#1c1917] text-white p-5 rounded-2xl space-y-3 shadow-md">
            <h3 class="text-xs font-bold text-amber-400">Security Recommendation</h3>
            <p class="text-[11px] text-stone-300 leading-relaxed">We recommend adding at least one biometric passkey and enabling TOTP 2FA to prevent unauthorized workspace access.</p>
          </div>
        </div>

        <!-- Right Content Area -->
        <div class="md:col-span-2 space-y-6">
          
          <!-- Alert Box -->
          <div *ngIf="message()" class="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl text-xs text-center font-bold">
            {{ message() }}
          </div>
          <div *ngIf="errorMessage()" class="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-xl text-xs text-center font-bold">
            {{ errorMessage() }}
          </div>

          <!-- Section 1: Biometric & Security Key Passkeys -->
          <div class="bg-white border border-[#e7e5e4] shadow-sm rounded-2xl p-6 space-y-6">
            <div class="flex justify-between items-center border-b border-[#e7e5e4] pb-3">
              <h3 class="text-sm font-black text-[#1c1917] flex items-center gap-2">
                <span class="material-icons text-stone-500 text-sm">fingerprint</span>
                <span>FIDO2 / WebAuthn Passkeys</span>
              </h3>
              <button 
                (click)="registerPasskey()" 
                [disabled]="isLoading()"
                class="bg-[#1c1917] hover:bg-[#292524] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer disabled:bg-stone-300 active:scale-95">
                + Add Passkey
              </button>
            </div>

            <!-- Passkey Register Input dialog -->
            <div *ngIf="showPasskeyModal()" class="bg-stone-50 p-4 border border-[#e7e5e4] rounded-xl space-y-3 animate-slideIn">
              <h4 class="text-xs font-bold text-[#1c1917]">Assign Passkey Nickname</h4>
              <div class="flex gap-2">
                <input 
                  type="text" 
                  [(ngModel)]="passkeyNickname"
                  placeholder="e.g. Macbook TouchID, Windows Hello" 
                  class="flex-1 px-3 py-2 bg-white border border-[#e7e5e4] text-xs font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600">
                <button (click)="submitPasskeyRegistration()" class="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">Register</button>
                <button (click)="showPasskeyModal.set(false)" class="bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer">Cancel</button>
              </div>
            </div>

            <!-- Passkeys list -->
            <div *ngIf="passkeys().length > 0; else noPasskeys" class="space-y-2">
              <div *ngFor="let pk of passkeys()" class="flex justify-between items-center p-3 border border-[#e7e5e4] rounded-xl hover:bg-stone-50 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-amber-700 text-lg">devices</span>
                  <div>
                    <p class="text-xs font-black text-[#1c1917]">{{ pk.deviceName }}</p>
                    <p class="text-[10px] text-[#44403c]">Registered on {{ pk.createdAt | date:'shortDate' }} • Counter: {{ pk.counter }}</p>
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
              <p class="text-xs text-[#44403c] italic py-2">No hardware key or biometric passkeys registered yet.</p>
            </ng-template>
          </div>

          <!-- Section 2: Google Authenticator TOTP 2FA -->
          <div class="bg-white border border-[#e7e5e4] shadow-sm rounded-2xl p-6 space-y-6">
            <div class="flex justify-between items-center border-b border-[#e7e5e4] pb-3">
              <h3 class="text-sm font-black text-[#1c1917] flex items-center gap-2">
                <span class="material-icons text-stone-500 text-sm">security</span>
                <span>Two-Factor Authentication (TOTP)</span>
              </h3>
              <span 
                [class.bg-emerald-100]="twoFactorEnabled()"
                [class.text-emerald-800]="twoFactorEnabled()"
                [class.bg-stone-100]="!twoFactorEnabled()"
                [class.text-stone-700]="!twoFactorEnabled()"
                class="text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-stone-200">
                {{ twoFactorEnabled() ? 'Active' : 'Disabled' }}
              </span>
            </div>

            <!-- Enable 2FA Setup Panel -->
            <div *ngIf="show2faSetup()" class="bg-stone-50 p-5 border border-[#e7e5e4] rounded-xl space-y-5 animate-slideIn">
              <div class="space-y-2 text-center md:text-left">
                <h4 class="text-xs font-bold text-[#1c1917]">Scan QR Code</h4>
                <p class="text-[11px] text-[#44403c] leading-relaxed">Open your Google Authenticator or Microsoft Authenticator app on your phone, click "+" and scan this QR code.</p>
              </div>

              <div class="flex flex-col md:flex-row items-center gap-6 justify-center md:justify-start">
                <div class="bg-white p-2 border border-[#e7e5e4] rounded-lg shadow-sm">
                  <img [src]="qrCodeUrl()" alt="Authenticator QR Code" class="w-32 h-32 object-contain">
                </div>
                <div class="space-y-3 flex-1">
                  <div>
                    <p class="text-[9px] font-black text-[#44403c] uppercase">Backup Secret Key</p>
                    <code class="text-xs font-mono font-bold text-amber-700 select-all block bg-white border border-[#e7e5e4] p-2 rounded mt-1">{{ backupSecret() }}</code>
                  </div>
                  <div>
                    <label for="totpVerify" class="block text-[10px] font-bold text-[#1c1917] uppercase tracking-wider mb-1">Enter Verification Code</label>
                    <div class="flex gap-2">
                      <input 
                        id="totpVerify" 
                        type="text" 
                        maxLength="6"
                        placeholder="123456" 
                        [(ngModel)]="totpCode"
                        class="px-3 py-2 bg-white border border-[#e7e5e4] text-xs font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 w-32">
                      <button (click)="confirmEnable2FA()" class="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">Verify & Enable</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Disable 2FA Panel -->
            <div *ngIf="show2faDisable()" class="bg-stone-50 p-4 border border-[#e7e5e4] rounded-xl space-y-3 animate-slideIn">
              <h4 class="text-xs font-bold text-[#1c1917]">Disable Two-Factor Authentication</h4>
              <p class="text-[11px] text-[#44403c]">Enter your password to disable 2FA protection.</p>
              <div class="flex gap-2">
                <input 
                  type="password" 
                  [(ngModel)]="disablePassword"
                  placeholder="••••••••" 
                  class="px-3 py-2 bg-white border border-[#e7e5e4] text-xs font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 w-44">
                <button (click)="confirmDisable2FA()" class="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">Confirm Disable</button>
                <button (click)="show2faDisable.set(false)" class="bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer">Cancel</button>
              </div>
            </div>

            <!-- Actions button -->
            <div class="flex justify-between items-center">
              <p class="text-xs text-[#44403c]">TOTP 2FA prevents remote takeovers if your password is leaked.</p>
              <button 
                *ngIf="!twoFactorEnabled() && !show2faSetup()" 
                (click)="start2faSetup()" 
                class="bg-[#1c1917] hover:bg-[#292524] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95">
                Enable 2FA
              </button>
              <button 
                *ngIf="twoFactorEnabled() && !show2faDisable()" 
                (click)="start2faDisable()" 
                class="bg-rose-50/10 hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95">
                Disable 2FA
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  `
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);

  isLoading = signal(false);
  message = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

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
  }

  loadProfile() {
    this.authService.getMe().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const user = res.data;
          this.passkeys.set(user.passkeys || []);
          this.twoFactorEnabled.set(user.twoFactorEnabled || false);
        }
      },
      error: (err: any) => {
        this.errorMessage.set('Failed to load profile settings data.');
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
