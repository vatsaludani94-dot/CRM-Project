import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-[calc(100vh-120px)] flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
      
      <!-- Left Sidebar: Channels and DMs -->
      <div class="w-64 border-r border-slate-100 dark:border-slate-700 flex flex-col bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
        
        <!-- Channels Section -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6">
          <div class="space-y-2">
            <div class="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <span>Channels</span>
              <button (click)="openCreateChannelModal()" class="hover:text-white"><span class="material-icons text-sm">add</span></button>
            </div>
            <div class="space-y-1">
              <div *ngFor="let ch of channels()" (click)="selectChannel(ch)" [class.bg-indigo-500/10]="activeChannel()?._id === ch._id" [class.text-indigo-500]="activeChannel()?._id === ch._id" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-all">
                <span class="material-icons text-slate-400 text-sm">tag</span>
                <span>{{ ch.name }}</span>
              </div>
            </div>
          </div>

          <!-- Direct Messages Section -->
          <div class="space-y-2">
            <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Direct Messages</h4>
            <div class="space-y-1">
              <div *ngFor="let member of teamMembers()" (click)="selectDM(member)" [class.bg-indigo-500/10]="activeRecipient()?._id === member._id" [class.text-indigo-500]="activeRecipient()?._id === member._id" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-all">
                <span class="material-icons text-slate-400 text-sm">person_outline</span>
                <span>{{ member.name }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Chat Window -->
      <div class="flex-1 flex flex-col bg-white dark:bg-slate-800 relative">
        
        <!-- Header -->
        <div class="h-16 border-b border-slate-100 dark:border-slate-700 px-6 flex items-center justify-between shrink-0">
          <div *ngIf="activeChannel()" class="flex items-center gap-2">
            <span class="material-icons text-slate-400">tag</span>
            <strong class="text-sm text-slate-800 dark:text-white font-black">#{{ activeChannel().name }}</strong>
            <span class="text-xs text-slate-400 font-medium ml-2">{{ activeChannel().description }}</span>
          </div>
          <div *ngIf="activeRecipient()" class="flex items-center gap-2">
            <span class="material-icons text-slate-400">person</span>
            <strong class="text-sm text-slate-800 dark:text-white font-black">{{ activeRecipient().name }}</strong>
            <span class="text-xs text-slate-400 font-medium ml-2">{{ activeRecipient().department }}</span>
          </div>
          <div *ngIf="!activeChannel() && !activeRecipient()" class="text-xs text-slate-400 font-medium">Select a channel or conversation to start collaborating.</div>
        </div>

        <!-- Chat Pane messages -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div *ngFor="let msg of chatMessages()" class="flex items-start gap-3 text-xs">
            <div class="h-8 w-8 rounded-full bg-indigo-600/10 border dark:border-slate-700/80 flex items-center justify-center font-black text-indigo-500 uppercase shrink-0">
              {{ msg.sender?.name?.slice(0, 2) || 'US' }}
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2 font-bold text-slate-500">
                <span class="text-slate-800 dark:text-white font-black">{{ msg.sender?.name }}</span>
                <span class="text-[9px] text-slate-400 font-semibold">{{ msg.createdAt | date:'shortTime' }}</span>
              </div>
              <p class="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-2xl max-w-xl inline-block">{{ msg.messageText }}</p>
            </div>
          </div>

          <div *ngIf="chatMessages().length === 0 && (activeChannel() || activeRecipient())" class="text-center py-24 text-slate-400 font-semibold">
            This conversation is empty. Say hello! 👋
          </div>
        </div>

        <!-- Chat Input Composer -->
        <div class="p-4 border-t border-slate-100 dark:border-slate-700 shrink-0 flex gap-2">
          <input type="text" [(ngModel)]="messageInput" (keyup.enter)="sendMessage()" placeholder="Type a message..." class="flex-1 bg-slate-50 dark:bg-slate-950 border dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500">
          <button (click)="sendMessage()" [disabled]="!messageInput" class="bg-indigo-600 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md">
            Send
          </button>
        </div>

      </div>

      <!-- Modal: Create Channel -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 border dark:border-slate-700 p-6 rounded-2xl w-full max-w-sm space-y-4 text-xs animate-fadeIn">
          <h3 class="text-sm font-extrabold text-slate-800 dark:text-white">Create Channel</h3>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Channel Name</label>
            <input type="text" [(ngModel)]="newChannelName" placeholder="engineering" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
            <input type="text" [(ngModel)]="newChannelDesc" placeholder="Team discussions for code releases" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
          </div>
          <div class="flex gap-2 pt-2">
            <button (click)="closeCreateChannelModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 py-2.5 rounded-xl font-bold transition-colors">Cancel</button>
            <button (click)="createChannel()" [disabled]="!newChannelName" class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold transition-all">Create</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ChatCenterComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private socketService = inject(SocketService);

  channels = signal<any[]>([]);
  teamMembers = signal<any[]>([]);
  
  // Navigation active state
  activeChannel = signal<any | null>(null);
  activeRecipient = signal<any | null>(null);
  chatMessages = signal<any[]>([]);

  // Composer fields
  messageInput = '';

  // Channel Creation Modal
  showCreateModal = signal<boolean>(false);
  newChannelName = '';
  newChannelDesc = '';

  // Socket triggers
  private subList: Subscription[] = [];

  ngOnInit() {
    this.loadChannelsList();
    this.loadTeamMembers();

    // Listen to real-time chat updates
    this.subList.push(this.socketService.onChatMessage.subscribe({
      next: (msg) => {
        const activeCh = this.activeChannel();
        if (activeCh && msg.channel === activeCh._id) {
          this.chatMessages.set([...this.chatMessages(), msg]);
        }
      }
    }));

    this.subList.push(this.socketService.onDmMessage.subscribe({
      next: (dm) => {
        const activeRec = this.activeRecipient();
        if (activeRec && (dm.sender._id === activeRec._id || dm.recipient === activeRec._id)) {
          this.chatMessages.set([...this.chatMessages(), dm]);
        }
      }
    }));
  }

  ngOnDestroy() {
    this.subList.forEach(s => s.unsubscribe());
  }

  loadChannelsList() {
    this.apiService.getChannels().subscribe({
      next: (res) => {
        if (res.success) {
          this.channels.set(res.data);
          // Auto select first channel if none selected
          if (res.data.length > 0 && !this.activeChannel() && !this.activeRecipient()) {
            this.selectChannel(res.data[0]);
          }
        }
      }
    });
  }

  loadTeamMembers() {
    this.apiService.getTeamMembers().subscribe({
      next: (res) => {
        if (res.success) this.teamMembers.set(res.data);
      }
    });
  }

  selectChannel(channel: any) {
    // Leave previous channel room
    const currentCh = this.activeChannel();
    if (currentCh) {
      this.socketService.leaveChannel(currentCh._id);
    }

    this.activeRecipient.set(null);
    this.activeChannel.set(channel);
    
    // Join new channel room
    this.socketService.joinChannel(channel._id);

    this.loadMessages();
  }

  selectDM(member: any) {
    // Leave previous channel room if any
    const currentCh = this.activeChannel();
    if (currentCh) {
      this.socketService.leaveChannel(currentCh._id);
    }

    this.activeChannel.set(null);
    this.activeRecipient.set(member);
    this.loadMessages();
  }

  loadMessages() {
    const activeCh = this.activeChannel();
    const activeRec = this.activeRecipient();

    const params: any = {};
    if (activeCh) params.channelId = activeCh._id;
    else if (activeRec) params.recipientId = activeRec._id;
    else return;

    this.apiService.getChatMessages(params).subscribe({
      next: (res) => {
        if (res.success) this.chatMessages.set(res.data);
      }
    });
  }

  sendMessage() {
    const activeCh = this.activeChannel();
    const activeRec = this.activeRecipient();

    if (!this.messageInput) return;

    const payload: any = {
      messageText: this.messageInput,
    };

    if (activeCh) payload.channelId = activeCh._id;
    else if (activeRec) payload.recipientId = activeRec._id;

    this.apiService.sendChatMessage(payload).subscribe({
      next: (res) => {
        this.messageInput = '';
        // Real-time listener will append message if socket connects.
        // For fallback sync locally immediately
        if (res.success) {
          const indexExists = this.chatMessages().some(m => m._id === res.data._id);
          if (!indexExists) {
            this.chatMessages.set([...this.chatMessages(), res.data]);
          }
        }
      }
    });
  }

  openCreateChannelModal() {
    this.newChannelName = '';
    this.newChannelDesc = '';
    this.showCreateModal.set(true);
  }

  closeCreateChannelModal() {
    this.showCreateModal.set(false);
  }

  createChannel() {
    const payload = {
      name: this.newChannelName,
      description: this.newChannelDesc,
    };

    this.apiService.createChannel(payload).subscribe({
      next: (res) => {
        this.closeCreateChannelModal();
        this.loadChannelsList();
      }
    });
  }
}
