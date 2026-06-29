import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Task Directory</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Orchestrate internal operations deliverables, comments threads, and deadlines.</p>
        </div>
        
        <div class="flex gap-2">
          <!-- Views selectors -->
          <div class="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1 text-[10px] font-black uppercase">
            <button (click)="setViewMode('list')" [class.bg-white]="viewMode() === 'list'" [class.dark:bg-slate-700]="viewMode() === 'list'" class="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-300">List</button>
            <button (click)="setViewMode('kanban')" [class.bg-white]="viewMode() === 'kanban'" [class.dark:bg-slate-700]="viewMode() === 'kanban'" class="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-300">Kanban</button>
          </div>
          <button (click)="openCreateModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5">
            <span class="material-icons text-sm">add_task</span> Add Task
          </button>
        </div>
      </div>

      <!-- View Mode: List -->
      <div *ngIf="viewMode() === 'list'" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm p-6 overflow-hidden animate-fadeIn">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            <thead>
              <tr class="text-left text-slate-400 font-bold uppercase tracking-wider">
                <th class="pb-3">Task Title</th>
                <th class="pb-3">Assigned To</th>
                <th class="pb-3">Due Date</th>
                <th class="pb-3">Priority</th>
                <th class="pb-3">Status</th>
                <th class="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
              <tr *ngFor="let task of tasks()" class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td class="py-4">
                  <div class="space-y-1">
                    <span class="font-bold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-indigo-500" (click)="openTaskDetails(task)">
                      {{ task.title }}
                    </span>
                    <p class="text-[10px] text-slate-400 font-semibold" *ngIf="task.parentTask">Subtask of: {{ task.parentTask.title }}</p>
                  </div>
                </td>
                <td class="py-4 text-slate-600 dark:text-slate-300">{{ task.assignedTo?.name || 'Unassigned' }}</td>
                <td class="py-4 text-slate-400">{{ task.dueDate | date:'mediumDate' }}</td>
                <td class="py-4">
                  <span [ngClass]="{
                    'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400': task.priority === 'Critical',
                    'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400': task.priority === 'High',
                    'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400': task.priority === 'Medium',
                    'bg-slate-100 text-slate-655 dark:bg-slate-700 dark:text-slate-400': task.priority === 'Low'
                  }" class="px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase">
                    {{ task.priority }}
                  </span>
                </td>
                <td class="py-4">
                  <span [ngClass]="{
                    'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400': task.status === 'Completed',
                    'bg-blue-105 text-blue-600 dark:bg-blue-950 dark:text-blue-400': task.status === 'In Progress',
                    'bg-slate-100 text-slate-600 dark:bg-slate-700': task.status === 'Pending',
                    'bg-pink-100 text-pink-600 dark:bg-pink-950': task.status === 'Blocked'
                  }" class="px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase">
                    {{ task.status }}
                  </span>
                </td>
                <td class="py-4">
                  <select (change)="updateTaskStatus(task._id, $event)" class="bg-slate-50 dark:bg-slate-700 border dark:border-slate-700 text-[10px] rounded-lg px-2 py-1 text-slate-800 dark:text-white focus:outline-none">
                    <option value="Pending" [selected]="task.status === 'Pending'">Pending</option>
                    <option value="In Progress" [selected]="task.status === 'In Progress'">In Progress</option>
                    <option value="Completed" [selected]="task.status === 'Completed'">Completed</option>
                    <option value="Blocked" [selected]="task.status === 'Blocked'">Blocked</option>
                  </select>
                </td>
              </tr>
              <tr *ngIf="tasks().length === 0">
                <td colspan="6" class="text-center py-12 text-slate-400 font-bold">No tasks currently scheduled.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- View Mode: Kanban -->
      <div *ngIf="viewMode() === 'kanban'" class="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
        
        <!-- Column 1: Pending -->
        <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 space-y-4 min-h-[400px]">
          <h4 class="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Pending ({{ getTaskByStatus('Pending').length }})</h4>
          <div *ngFor="let task of getTaskByStatus('Pending')" (click)="openTaskDetails(task)" class="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 cursor-pointer shadow-sm space-y-3">
            <h5 class="font-bold text-slate-800 dark:text-white text-xs">{{ task.title }}</h5>
            <div class="flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>{{ task.dueDate | date:'mediumDate' }}</span>
              <span class="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase">{{ task.priority }}</span>
            </div>
          </div>
        </div>

        <!-- Column 2: In Progress -->
        <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 space-y-4 min-h-[400px]">
          <h4 class="font-extrabold text-xs text-slate-400 uppercase tracking-widest">In Progress ({{ getTaskByStatus('In Progress').length }})</h4>
          <div *ngFor="let task of getTaskByStatus('In Progress')" (click)="openTaskDetails(task)" class="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 cursor-pointer shadow-sm space-y-3">
            <h5 class="font-bold text-slate-800 dark:text-white text-xs">{{ task.title }}</h5>
            <div class="flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>{{ task.dueDate | date:'mediumDate' }}</span>
              <span class="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase">{{ task.priority }}</span>
            </div>
          </div>
        </div>

        <!-- Column 3: Blocked -->
        <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 space-y-4 min-h-[400px]">
          <h4 class="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Blocked ({{ getTaskByStatus('Blocked').length }})</h4>
          <div *ngFor="let task of getTaskByStatus('Blocked')" (click)="openTaskDetails(task)" class="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 cursor-pointer shadow-sm space-y-3">
            <h5 class="font-bold text-slate-800 dark:text-white text-xs">{{ task.title }}</h5>
            <div class="flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>{{ task.dueDate | date:'mediumDate' }}</span>
              <span class="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase">{{ task.priority }}</span>
            </div>
          </div>
        </div>

        <!-- Column 4: Completed -->
        <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 space-y-4 min-h-[400px]">
          <h4 class="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Completed ({{ getTaskByStatus('Completed').length }})</h4>
          <div *ngFor="let task of getTaskByStatus('Completed')" (click)="openTaskDetails(task)" class="bg-white dark:bg-slate-900/60 p-4 rounded-xl border dark:border-slate-700 cursor-pointer shadow-sm space-y-3">
            <h5 class="font-bold text-slate-400 dark:text-slate-400 text-xs line-through">{{ task.title }}</h5>
            <div class="flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>{{ task.dueDate | date:'mediumDate' }}</span>
              <span class="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded uppercase">Completed</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Modal: Create Task -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 border dark:border-slate-700 p-6 rounded-2xl w-full max-w-sm space-y-4 text-xs animate-fadeIn">
          <h3 class="text-sm font-extrabold text-slate-800 dark:text-white">Create Task</h3>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Task Title</label>
            <input type="text" [(ngModel)]="newTitle" placeholder="Draft quotation proposal" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
            <textarea [(ngModel)]="newDesc" rows="3" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority</label>
              <select [(ngModel)]="newPriority" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Due Date</label>
              <input type="date" [(ngModel)]="newDueDate" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white">
            </div>
          </div>
          <div class="flex gap-2 pt-2">
            <button (click)="closeCreateModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 py-2.5 rounded-xl font-bold transition-colors">Cancel</button>
            <button (click)="createTask()" [disabled]="!newTitle" class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold transition-all">Create Task</button>
          </div>
        </div>
      </div>

      <!-- Modal: Task Details (Comments & Subtasks) -->
      <div *ngIf="selectedTask()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 border dark:border-slate-700 p-6 rounded-2xl w-full max-w-lg space-y-6 text-xs animate-fadeIn text-slate-700 dark:text-slate-200 flex flex-col h-[500px]">
          
          <div class="flex justify-between items-center border-b pb-3 shrink-0">
            <div>
              <h3 class="text-sm font-extrabold text-slate-800 dark:text-white">{{ selectedTask().title }}</h3>
              <p class="text-[10px] text-slate-400 mt-0.5">Priority: {{ selectedTask().priority }} • Status: {{ selectedTask().status }}</p>
            </div>
            <button (click)="selectedTask.set(null)" class="text-slate-400 hover:text-slate-600">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto space-y-6 pr-2">
            
            <!-- Description -->
            <div class="space-y-2">
              <p class="text-[10px] font-black uppercase text-slate-400">Description</p>
              <p class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl text-xs dark:text-slate-300 leading-relaxed">
                {{ selectedTask().description || 'No description provided.' }}
              </p>
            </div>

            <!-- Comments Section -->
            <div class="space-y-3">
              <p class="text-[10px] font-black uppercase text-slate-400">Comments Thread</p>
              
              <div class="space-y-3">
                <div *ngFor="let comment of selectedTask().comments" class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl space-y-1.5">
                  <div class="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>{{ comment.author?.name || 'Representative' }}</span>
                    <span>{{ comment.createdAt | date:'shortTime' }}</span>
                  </div>
                  <p class="text-xs dark:text-slate-300 leading-relaxed">{{ comment.text }}</p>
                </div>
              </div>

              <!-- Comment composer -->
              <div class="flex gap-2 pt-2">
                <input type="text" [(ngModel)]="newCommentText" placeholder="Post a comment..." class="flex-1 bg-slate-50 dark:bg-slate-950 border dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-white">
                <button (click)="postComment()" class="bg-indigo-600 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl transition-all">Post</button>
              </div>
            </div>

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
export class TasksComponent implements OnInit {
  private apiService = inject(ApiService);

  tasks = signal<any[]>([]);
  viewMode = signal<string>('list'); // 'list' or 'kanban'

  // Modal create fields
  showCreateModal = signal<boolean>(false);
  newTitle = '';
  newDesc = '';
  newPriority = 'Medium';
  newDueDate = '';

  // Task details modal fields
  selectedTask = signal<any | null>(null);
  newCommentText = '';

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.apiService.getTasks().subscribe({
      next: (res) => {
        if (res.success) this.tasks.set(res.data);
      }
    });
  }

  setViewMode(mode: string) {
    this.viewMode.set(mode);
  }

  getTaskByStatus(status: string): any[] {
    return this.tasks().filter(t => t.status === status);
  }

  openCreateModal() {
    this.newTitle = '';
    this.newDesc = '';
    this.newPriority = 'Medium';
    this.newDueDate = new Date().toISOString().slice(0, 10);
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  createTask() {
    const payload = {
      title: this.newTitle,
      description: this.newDesc,
      priority: this.newPriority,
      dueDate: this.newDueDate,
    };

    this.apiService.createTask(payload).subscribe({
      next: (res) => {
        this.closeCreateModal();
        this.loadTasks();
      }
    });
  }

  updateTaskStatus(id: string, event: any) {
    const status = event.target.value;
    this.apiService.updateTask(id, { status }).subscribe({
      next: () => this.loadTasks()
    });
  }

  openTaskDetails(task: any) {
    this.selectedTask.set(task);
  }

  postComment() {
    const task = this.selectedTask();
    if (!task || !this.newCommentText) return;

    this.apiService.addTaskComment(task._id, this.newCommentText).subscribe({
      next: (res) => {
        this.newCommentText = '';
        
        // Reload details by reloading tasks list and setting selected task
        this.apiService.getTasks().subscribe({
          next: (allTasksRes) => {
            if (allTasksRes.success) {
              this.tasks.set(allTasksRes.data);
              const updated = allTasksRes.data.find((t: any) => t._id === task._id);
              if (updated) this.selectedTask.set(updated);
            }
          }
        });
      }
    });
  }
}
