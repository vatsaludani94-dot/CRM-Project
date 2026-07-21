import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-downloads',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-fadeIn font-sans">
      
      <!-- Top Banner -->
      <div class="bg-white border border-[#e7e5e4] shadow-md rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 px-3 py-1 rounded-full">Commercial License Portal</span>
          <h1 class="text-2xl lg:text-3xl font-black text-[#1c1917]">Software Downloads & License Center</h1>
          <p class="text-xs text-[#44403c]">Access your purchased standalone software installer packages, active license keys, and official tax invoices.</p>
        </div>
        <button (click)="downloadInstaller()" class="bg-[#1c1917] hover:bg-[#292524] text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95">
          <span class="material-icons text-md">download</span>
          <span>Download Installer (.ZIP)</span>
        </button>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left 2 Cols: Purchased Software & Licenses -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white border border-[#e7e5e4] shadow-sm rounded-3xl p-6 space-y-6">
            <h3 class="text-lg font-extrabold text-[#1c1917] border-b border-[#e7e5e4] pb-3 flex items-center justify-between">
              <span>Your Active Software Licenses</span>
              <span class="text-xs font-bold bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full">Verified Purchases</span>
            </h3>

            <!-- License Cards List -->
            <div *ngIf="userLicenses().length > 0" class="space-y-4">
              <div *ngFor="let lic of userLicenses()" class="bg-stone-50 border border-[#e7e5e4] p-5 rounded-2xl space-y-3">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="text-sm font-black text-[#1c1917]">{{ lic.planName || 'GrownX Enterprise Plan' }}</h4>
                    <p class="text-[11px] text-[#44403c]">Purchased on {{ lic.purchasedAt | date:'mediumDate' }} • ₹{{ lic.amountPaid || 49 }} INR</p>
                  </div>
                  <span class="text-[10px] font-black uppercase bg-amber-100 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg">Active License</span>
                </div>

                <div class="bg-[#1c1917] text-white p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p class="text-[9px] uppercase tracking-wider text-stone-400 font-bold">LICENSE KEY</p>
                    <p class="text-sm font-mono font-black text-amber-400 tracking-wider">{{ lic.licenseKey }}</p>
                  </div>
                  <button (click)="copyLicense(lic.licenseKey)" class="text-xs font-bold text-stone-300 hover:text-white bg-stone-800 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <span class="material-icons text-xs">content_copy</span>
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Default Enterprise Standalone Package Card if no licenses yet -->
            <div *ngIf="userLicenses().length === 0" class="bg-stone-50 border border-[#e7e5e4] p-5 rounded-2xl space-y-4">
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="text-sm font-black text-[#1c1917]">GrownX CRM Standalone Software Suite</h4>
                  <p class="text-[11px] text-[#44403c]">Version v2.4.0 • Enterprise Installer Package</p>
                </div>
                <span class="text-[10px] font-black uppercase bg-amber-100 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg">Ready to Download</span>
              </div>

              <div class="p-4 bg-white border border-[#e7e5e4] rounded-xl space-y-2 text-xs text-[#44403c]">
                <p>Includes complete Node.js backend, Angular SPA frontend, MongoDB schema blueprints, and automatic setup scripts.</p>
              </div>

              <button (click)="downloadInstaller()" class="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs flex justify-center items-center gap-2 shadow-md cursor-pointer">
                <span class="material-icons text-sm">file_download</span>
                <span>Download Standalone Package (.ZIP)</span>
              </button>
            </div>

          </div>
        </div>

        <!-- Right Col: System Requirements & Direct Founder Support -->
        <div class="space-y-6">
          <div class="bg-white border border-[#e7e5e4] shadow-sm rounded-3xl p-6 space-y-4">
            <h3 class="text-md font-extrabold text-[#1c1917] border-b border-[#e7e5e4] pb-3">System Requirements</h3>
            <ul class="space-y-2.5 text-xs text-[#44403c]">
              <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> OS: Windows 10/11, macOS, or Linux</li>
              <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Node.js: v18.0.0 or higher</li>
              <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> Database: MongoDB v6.0+ or Atlas</li>
              <li class="flex items-center gap-2"><span class="material-icons text-amber-700 text-sm">check_circle</span> RAM: Minimum 2 GB RAM</li>
            </ul>
          </div>

          <div class="bg-[#1c1917] text-white p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 class="text-md font-extrabold text-amber-400">Direct Founder Support</h3>
            <p class="text-xs text-stone-300 leading-relaxed">Need custom deployment assistance or dedicated server configuration? Contact Founder Vatsal Udani directly:</p>
            <div class="space-y-2 text-xs">
              <p class="flex items-center gap-2 text-stone-200"><span class="material-icons text-xs text-amber-400">email</span> vatsaludani94@gmail.com</p>
              <p class="flex items-center gap-2 text-stone-200"><span class="material-icons text-xs text-amber-400">phone</span> +91 7624026264</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class DownloadsComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  userLicenses = signal<any[]>([]);

  ngOnInit() {
    const user = this.authService.currentUserValue;
    if (user && (user as any).purchasedLicenses) {
      this.userLicenses.set((user as any).purchasedLicenses);
    }
  }

  copyLicense(key: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key);
      alert(`License Key copied to clipboard: ${key}`);
    }
  }

  downloadInstaller() {
    const token = this.authService.token;
    const downloadUrl = '/api/payments/download-installer';
    
    // Create hidden anchor to trigger file download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'GrownX-CRM-Standalone-Package.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
