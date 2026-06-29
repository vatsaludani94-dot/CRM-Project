import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-drive-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Drive Synchronization</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage project assets, client contract files, and folder directories permissions.</p>
        </div>
        
        <div class="flex gap-2">
          <button (click)="openCreateFolderModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5">
            <span class="material-icons text-sm">create_new_folder</span> New Folder
          </button>
          <button *ngIf="currentFolderId()" (click)="triggerMockFileUpload()" class="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-1.5">
            <span class="material-icons text-sm">upload_file</span> Upload File
          </button>
        </div>
      </div>

      <!-- Drive Path Breadcrumbs -->
      <div class="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
        <a href="javascript:void(0)" (click)="navigateHome()" class="hover:text-indigo-500 flex items-center gap-1">
          <span class="material-icons text-sm">cloud</span> Root Drive
        </a>
        <span *ngIf="currentFolderName()" class="flex items-center gap-2">
          <span class="material-icons text-slate-400 text-xs">chevron_right</span>
          <span class="text-slate-800 dark:text-white">{{ currentFolderName() }}</span>
        </span>
      </div>

      <!-- Main Directory View -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
        
        <!-- Folders Panel -->
        <div class="lg:col-span-8 space-y-6">
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-4">
            <h4 class="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Directories</h4>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div *ngFor="let folder of currentSubfolders()" (click)="navigateToFolder(folder)" class="border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl flex items-center gap-3 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer group transition-all">
                <span class="material-icons text-amber-400 group-hover:scale-105 transition-transform">folder</span>
                <div class="overflow-hidden">
                  <h5 class="text-xs font-bold text-slate-800 dark:text-white truncate">{{ folder.name }}</h5>
                  <p class="text-[9px] text-slate-400 font-bold uppercase">{{ folder.type }}</p>
                </div>
              </div>
              <div *ngIf="currentSubfolders().length === 0" class="col-span-3 text-center py-6 text-xs text-slate-400 font-semibold">
                No subdirectories inside this folder.
              </div>
            </div>
          </div>

          <!-- Files Panel -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-4">
            <h4 class="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Files</h4>

            <div class="divide-y divide-slate-100 dark:divide-slate-700">
              <div *ngFor="let file of currentFiles()" class="py-4 flex justify-between items-center group">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-slate-400" [ngClass]="{
                    'text-rose-400': file.mimeType === 'application/pdf',
                    'text-sky-400': file.mimeType.startsWith('image/')
                  }">
                    {{ file.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'description' }}
                  </span>
                  <div>
                    <h5 class="text-xs font-bold text-slate-800 dark:text-white">{{ file.name }}</h5>
                    <p class="text-[10px] text-slate-400">
                      {{ (file.sizeBytes / 1024).toFixed(1) }} KB • Uploaded by {{ file.uploadedBy?.name || 'User' }}
                    </p>
                  </div>
                </div>

                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button (click)="previewFile(file)" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    Preview
                  </button>
                  <a [href]="file.url" download class="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    Download
                  </a>
                  <button (click)="deleteFile(file._id)" class="text-rose-500 hover:text-rose-400 p-1.5 rounded-lg">
                    <span class="material-icons text-sm">delete</span>
                  </button>
                </div>
              </div>
              
              <div *ngIf="currentFiles().length === 0" class="text-center py-12 text-xs text-slate-400 font-semibold">
                No files uploaded here. Navigate inside a folder or click Upload File.
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar / Actions Info -->
        <div class="lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-6">
          <h4 class="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider">Storage Metrics</h4>
          
          <div class="space-y-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div>
              <div class="flex justify-between mb-1.5">
                <span>Enterprise Space used</span>
                <span class="text-slate-900 dark:text-white">12.4 MB / 10 GB</span>
              </div>
              <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500" style="width: 1.2%"></div>
              </div>
            </div>

            <div class="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
              <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Folder Permission Rules</p>
              <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border dark:border-slate-700/70 space-y-2">
                <p class="text-[11px] text-slate-900 dark:text-white font-bold">Restrict User Roles Access</p>
                <div class="space-y-1.5 text-[10px]">
                  <div class="flex items-center gap-2 text-emerald-400 font-bold">
                    <span class="material-icons text-xs">gpp_good</span> Super Admins
                  </div>
                  <div class="flex items-center gap-2 text-emerald-400 font-bold">
                    <span class="material-icons text-xs">gpp_good</span> Managers
                  </div>
                  <div class="flex items-center gap-2 text-emerald-400 font-bold">
                    <span class="material-icons text-xs">gpp_good</span> Employees
                  </div>
                  <div class="flex items-center gap-2 text-rose-500 font-bold">
                    <span class="material-icons text-xs">block</span> Customers Portal Users
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Modals (Create Folder & Preview File) -->
      <div *ngIf="showFolderModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 border dark:border-slate-700 p-6 rounded-2xl w-full max-w-sm space-y-4 text-xs animate-fadeIn">
          <h3 class="text-sm font-extrabold text-slate-800 dark:text-white">Create Drive Folder</h3>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Folder Name</label>
            <input type="text" [(ngModel)]="newFolderName" placeholder="Sales Assets" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Folder Type</label>
            <select [(ngModel)]="newFolderType" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
              <option value="General">General Folder</option>
              <option value="Customer">Customer Folder</option>
              <option value="Deal">Deal Folder</option>
              <option value="Project">Project Folder</option>
            </select>
          </div>
          <div class="flex gap-2 pt-2">
            <button (click)="closeFolderModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 py-2.5 rounded-xl font-bold transition-colors">Cancel</button>
            <button (click)="createFolder()" [disabled]="!newFolderName" class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold transition-all">Create</button>
          </div>
        </div>
      </div>

      <!-- File Preview Modal -->
      <div *ngIf="previewingFile()" class="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg space-y-4 text-xs animate-fadeIn text-slate-100 flex flex-col h-[400px]">
          <div class="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 class="text-sm font-extrabold text-white">{{ previewingFile().name }}</h3>
            <button (click)="previewingFile.set(null)" class="text-slate-400 hover:text-white">
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- Simulated File Content Frame -->
          <div class="flex-1 bg-slate-950 border border-slate-900 p-6 rounded-xl overflow-y-auto font-mono text-[10px] text-slate-400">
            <div *ngIf="previewingFile().mimeType === 'application/pdf'">
              <p class="text-xs text-white font-bold uppercase tracking-wider mb-2">Simulated PDF Document View</p>
              <p>--------------------------------------------------</p>
              <p>GrownX Technologies PDF Generator Engine</p>
              <p>Metadata Link: Connected to customer cloud sync</p>
              <p>Size: {{ (previewingFile().sizeBytes / 1024).toFixed(1) }} KB</p>
              <p>--------------------------------------------------</p>
              <p class="mt-4">This mockup represents the rendered service contract or sales invoice document generated inside the system. Click "Download" to fetch the full stream payload.</p>
            </div>
            <div *ngIf="previewingFile().mimeType.startsWith('image/')">
              <p class="text-xs text-white font-bold uppercase tracking-wider mb-2">Image Mock File View</p>
              <p>--------------------------------------------------</p>
              <p>Source URL: {{ previewingFile().url }}</p>
              <p>--------------------------------------------------</p>
              <div class="mt-4 flex justify-center">
                <span class="material-icons text-5xl text-sky-400">image</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class DriveCenterComponent implements OnInit {
  private apiService = inject(ApiService);

  allFolders = signal<any[]>([]);
  
  // Navigation State
  currentFolderId = signal<string | null>(null);
  currentFolderName = signal<string | null>(null);
  currentSubfolders = signal<any[]>([]);
  currentFiles = signal<any[]>([]);

  // Modals state
  showFolderModal = signal<boolean>(false);
  previewingFile = signal<any | null>(null);

  // Form inputs
  newFolderName = '';
  newFolderType = 'General';

  ngOnInit() {
    this.loadFoldersList();
  }

  loadFoldersList() {
    this.apiService.getDriveFolders().subscribe({
      next: (res) => {
        if (res.success) {
          this.allFolders.set(res.data);
          this.filterCurrentDirectory();
        }
      }
    });
  }

  filterCurrentDirectory() {
    const folders = this.allFolders();
    const activeId = this.currentFolderId();

    if (activeId === null) {
      // Root View: list folders with no parentFolder
      this.currentSubfolders.set(folders.filter(f => !f.parentFolder));
      this.currentFiles.set([]);
    } else {
      // Fetch contents of current folder
      this.apiService.getFolderContents(activeId).subscribe({
        next: (res) => {
          if (res.success) {
            this.currentSubfolders.set(res.data.subfolders);
            this.currentFiles.set(res.data.files);
          }
        }
      });
    }
  }

  navigateToFolder(folder: any) {
    this.currentFolderId.set(folder._id);
    this.currentFolderName.set(folder.name);
    this.filterCurrentDirectory();
  }

  navigateHome() {
    this.currentFolderId.set(null);
    this.currentFolderName.set(null);
    this.filterCurrentDirectory();
  }

  openCreateFolderModal() {
    this.newFolderName = '';
    this.newFolderType = 'General';
    this.showFolderModal.set(true);
  }

  closeFolderModal() {
    this.showFolderModal.set(false);
  }

  createFolder() {
    const payload = {
      name: this.newFolderName,
      type: this.newFolderType,
      parentFolderId: this.currentFolderId() || undefined,
    };

    this.apiService.createDriveFolder(payload).subscribe({
      next: (res) => {
        this.closeFolderModal();
        this.loadFoldersList();
      }
    });
  }

  triggerMockFileUpload() {
    // Generate a mock file upload payload
    const mockMimeTypes = ['application/pdf', 'image/png', 'application/pdf'];
    const mockNames = ['proposal_quote_v2.pdf', 'signature_stamp.png', 'service_agreement.pdf'];
    const randomIdx = Math.floor(Math.random() * mockNames.length);

    const payload = {
      name: mockNames[randomIdx],
      mimeType: mockMimeTypes[randomIdx],
      sizeBytes: Math.floor(Math.random() * 45000) + 12000,
      url: `/assets/mock-doc-${randomIdx}.pdf`,
      folderId: this.currentFolderId()
    };

    this.apiService.uploadDriveFile(payload).subscribe({
      next: (res) => {
        this.loadFoldersList();
      }
    });
  }

  previewFile(file: any) {
    this.previewingFile.set(file);
  }

  deleteFile(id: string) {
    if (confirm('Delete this file permanently?')) {
      this.apiService.deleteDriveFile(id).subscribe({
        next: () => this.loadFoldersList()
      });
    }
  }
}
