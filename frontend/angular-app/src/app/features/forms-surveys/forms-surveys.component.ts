import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface FormField {
  type: 'Text' | 'Email' | 'Phone' | 'Number' | 'File Upload' | 'Dropdown' | 'Radio' | 'Checkbox' | 'Signature';
  label: string;
  placeholder?: string;
  required: boolean;
  options: string[];
}

interface SurveyQuestion {
  type: 'Text' | 'Multiple Choice' | 'NPS (0-10)' | 'Rating (1-5)' | 'Quiz Option';
  text: string;
  choices: string[];
  correctAnswer?: string;
  scoreValue?: number;
}

@Component({
  selector: 'app-forms-surveys',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 text-[#1c1917] tracking-tight">Forms & Surveys</h1>
          <p class="text-sm text-[#574c43] mt-1">Design signature-ready client forms, deploy NPS surveys, and audit customer satisfaction feedback.</p>
        </div>
        
        <div class="flex gap-2">
          <button (click)="setView('forms_list')" [class.bg-indigo-600]="activeView() === 'forms_list' || activeView() === 'form_builder'" class="bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md">
            Manage Forms
          </button>
          <button (click)="setView('surveys_list')" [class.bg-indigo-600]="activeView() === 'surveys_list' || activeView() === 'survey_analytics'" class="bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md">
            Manage Surveys
          </button>
        </div>
      </div>

      <!-- View: Forms list -->
      <div *ngIf="activeView() === 'forms_list'" class="space-y-6 animate-fadeIn">
        <div class="flex justify-between items-center bg-white bg-white px-6 py-4 rounded-xl border border-slate-205 border-[#e7e5e4]/60 shadow-sm">
          <h4 class="font-extrabold text-sm text-slate-700 text-[#1c1917] uppercase tracking-wider">Active Web Forms</h4>
          <button (click)="startNewForm()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1">
            <span class="material-icons text-sm">add</span> Create Form
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div *ngFor="let fm of forms()" class="bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div class="space-y-2">
              <span class="text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2.5 py-1 rounded-md">{{ fm.submissionAction }} Action</span>
              <h3 class="text-md font-bold text-slate-800 text-[#1c1917] pt-2">{{ fm.name }}</h3>
              <p class="text-xs text-[#44403c]">Total Fields configured: {{ fm.fields?.length || 0 }}</p>
            </div>
            
            <div class="flex gap-2 pt-2 border-t border-slate-100 border-[#e7e5e4]">
              <button (click)="openFormSimulator(fm)" class="flex-1 bg-slate-105 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 text-[#44403c] text-xs font-bold py-2 rounded-xl transition-all">
                Test / Fill
              </button>
              <button (click)="deleteForm(fm._id)" class="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-xl transition-colors">
                <span class="material-icons text-sm">delete</span>
              </button>
            </div>
          </div>
          <div *ngIf="forms().length === 0" class="col-span-3 text-center py-12 text-[#44403c] font-semibold">No web forms available. Click Create Form.</div>
        </div>
      </div>

      <!-- View: Form Builder -->
      <div *ngIf="activeView() === 'form_builder'" class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
        <div class="lg:col-span-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col min-h-[500px] relative">
          
          <div class="flex justify-between items-center w-full border-b border-slate-800 pb-4 mb-6">
            <input type="text" [(ngModel)]="formName" placeholder="Form Name" class="bg-transparent border-b border-slate-700 text-lg font-bold text-white focus:outline-none focus:border-indigo-500 py-1">
            <select [(ngModel)]="formSubmissionAction" class="bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-white">
              <option value="Create Lead">Submission Action: Create Lead</option>
              <option value="Create Customer">Submission Action: Create Customer</option>
              <option value="Create Ticket">Submission Action: Create Ticket</option>
            </select>
          </div>

          <!-- Fields list visual preview -->
          <div class="space-y-4 max-w-md mx-auto w-full py-4 bg-white text-slate-900 p-6 rounded-2xl shadow-lg min-h-[300px]">
            <p class="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Live Form Preview</p>
            
            <div *ngFor="let field of formFields(); let idx = index" class="p-3 border border-slate-100 hover:border-indigo-500 rounded-xl relative group cursor-pointer" (click)="selectedFieldIdx.set(idx)">
              <button (click)="removeFormField(idx)" class="absolute top-1/2 -translate-y-1/2 -right-8 text-rose-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="material-icons text-sm">remove_circle</span>
              </button>
              
              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700">{{ field.label }} <span *ngIf="field.required" class="text-rose-500">*</span></label>
                <div class="w-full bg-slate-50 border border-slate-200 rounded-lg h-9 px-3 flex items-center text-xs text-[#44403c]">
                  {{ field.placeholder || ('Placeholder for ' + field.type) }}
                </div>
              </div>
            </div>

            <div *ngIf="formFields().length === 0" class="text-center py-12 text-[#44403c] text-xs">
              No fields added. Click buttons below to construct the web form.
            </div>
          </div>

          <!-- Add field selectors -->
          <div class="flex flex-wrap gap-2.5 pt-8 justify-center">
            <button (click)="addFormField('Text')" class="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl uppercase">Text</button>
            <button (click)="addFormField('Email')" class="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl uppercase">Email</button>
            <button (click)="addFormField('Phone')" class="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl uppercase">Phone</button>
            <button (click)="addFormField('Dropdown')" class="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl uppercase">Dropdown</button>
            <button (click)="addFormField('Checkbox')" class="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl uppercase">Checkbox</button>
            <button (click)="addFormField('Signature')" class="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl uppercase">Signature</button>
          </div>

          <div class="absolute bottom-4 right-4">
            <button (click)="saveFormLayout()" [disabled]="!formName" class="bg-indigo-600 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all">
              Save Web Form
            </button>
          </div>
        </div>

        <!-- Right Panel: Field Details configuration -->
        <div class="lg:col-span-4 bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 class="text-sm font-extrabold text-slate-800 text-[#1c1917] flex items-center gap-2">
            <span class="material-icons text-indigo-500">settings</span> Field Details
          </h3>

          <div *ngIf="selectedFieldIdx() === null" class="text-center py-16 text-[#44403c] text-xs">
            Select a field in the form preview container to edit labels, placeholders, and validation flags.
          </div>

          <div *ngIf="selectedFieldIdx() !== null" class="space-y-4 text-xs animate-fadeIn">
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Field Label / Name</label>
              <input type="text" [(ngModel)]="getSelectedField()!.label" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Placeholder Text</label>
              <input type="text" [(ngModel)]="getSelectedField()!.placeholder" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
            </div>
            <div class="flex items-center gap-2.5 pt-2">
              <input type="checkbox" [(ngModel)]="getSelectedField()!.required" id="fieldRequired" class="rounded border-slate-700 text-indigo-600 h-4 w-4 bg-slate-950">
              <label for="fieldRequired" class="font-bold text-[#44403c] cursor-pointer">Required Field</label>
            </div>
          </div>
        </div>
      </div>

      <!-- View: Surveys list -->
      <div *ngIf="activeView() === 'surveys_list'" class="space-y-6 animate-fadeIn">
        <div class="flex justify-between items-center bg-white bg-white px-6 py-4 rounded-xl border border-slate-200 border-[#e7e5e4]/60 shadow-sm">
          <h4 class="font-extrabold text-sm text-slate-700 text-[#1c1917] uppercase tracking-wider">Active NPS & Quizzes</h4>
          <button (click)="startNewSurvey()" class="bg-indigo-600 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1">
            <span class="material-icons text-sm">add</span> Create Survey
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div *ngFor="let sv of surveys()" class="bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div class="space-y-2">
              <span class="text-[9px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-500 dark:text-violet-400 px-2.5 py-1 rounded-md">{{ sv.type }}</span>
              <h3 class="text-md font-bold text-slate-800 text-[#1c1917] pt-2">{{ sv.name }}</h3>
              <p class="text-xs text-[#44403c]">Total Questions: {{ sv.questions?.length || 0 }}</p>
            </div>
            
            <div class="flex gap-2 pt-2 border-t border-slate-100 border-[#e7e5e4]">
              <button (click)="openSurveyAnalytics(sv)" class="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 text-[#44403c] text-xs font-bold py-2 rounded-xl transition-all">
                Analytics Report
              </button>
              <button (click)="deleteSurvey(sv._id)" class="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-xl transition-colors">
                <span class="material-icons text-sm">delete</span>
              </button>
            </div>
          </div>
          <div *ngIf="surveys().length === 0" class="col-span-3 text-center py-12 text-[#44403c] font-semibold">No active surveys found. Click Create Survey.</div>
        </div>
      </div>

      <!-- View: Survey Analytics Report -->
      <div *ngIf="activeView() === 'survey_analytics' && selectedSurvey()" class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
        
        <!-- Left Panel: NPS/Quiz KPI Dials -->
        <div class="lg:col-span-8 bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm space-y-6">
          <div class="flex justify-between items-center border-b border-slate-100 border-[#e7e5e4] pb-4">
            <div class="flex items-center gap-3">
              <button (click)="setView('surveys_list')" class="text-[#44403c] hover:text-white">
                <span class="material-icons">arrow_back</span>
              </button>
              <h3 class="text-md font-extrabold text-slate-800 text-[#1c1917]">{{ selectedSurvey().name }} Report</h3>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            
            <!-- NPS score dial -->
            <div class="bg-slate-50 bg-white p-6 rounded-xl border border-[#e7e5e4]">
              <p class="text-[10px] font-black uppercase text-[#44403c] tracking-wider">Net Promoter Score</p>
              <h4 class="text-4xl font-black text-indigo-500 mt-2">{{ surveyAnalytics()?.npsScore || 0 }}</h4>
              <p class="text-[9px] text-[#44403c] mt-1">Scale (-100 to 100)</p>
            </div>

            <!-- Total submissions -->
            <div class="bg-slate-50 bg-white p-6 rounded-xl border border-[#e7e5e4]">
              <p class="text-[10px] font-black uppercase text-[#44403c] tracking-wider">Total Responses</p>
              <h4 class="text-4xl font-black text-slate-800 text-[#1c1917] mt-2">{{ surveyAnalytics()?.totalSubmissions || 0 }}</h4>
              <p class="text-[9px] text-[#44403c] mt-1">Submissions synced</p>
            </div>

            <!-- Quiz Average score -->
            <div class="bg-slate-50 bg-white p-6 rounded-xl border border-[#e7e5e4]">
              <p class="text-[10px] font-black uppercase text-[#44403c] tracking-wider">Average Quiz Score</p>
              <h4 class="text-4xl font-black text-emerald-500 mt-2">{{ surveyAnalytics()?.averageQuizScore || 0 }}</h4>
              <p class="text-[9px] text-[#44403c] mt-1">Correct answers average</p>
            </div>

          </div>

          <!-- NPS Breakdown chart logs -->
          <div class="bg-slate-50 bg-white p-6 rounded-xl border border-[#e7e5e4] space-y-3">
            <h5 class="text-xs font-bold text-slate-800 text-[#1c1917] uppercase tracking-wider">Promoters & Detractors breakdown</h5>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between font-bold">
                <span class="text-emerald-400">Promoters (9-10):</span>
                <span>{{ surveyAnalytics()?.npsBreakdown?.promoter || 0 }} responses</span>
              </div>
              <div class="flex justify-between font-bold">
                <span class="text-amber-400">Passives (7-8):</span>
                <span>{{ surveyAnalytics()?.npsBreakdown?.passive || 0 }} responses</span>
              </div>
              <div class="flex justify-between font-bold">
                <span class="text-rose-500">Detractors (0-6):</span>
                <span>{{ surveyAnalytics()?.npsBreakdown?.detractor || 0 }} responses</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Mock respondent simulator submission -->
        <div class="lg:col-span-4 bg-white bg-white border border-slate-200 border-[#e7e5e4]/60 p-6 rounded-2xl shadow-sm space-y-4 text-xs font-semibold">
          <h4 class="font-extrabold text-sm text-slate-800 text-[#1c1917] uppercase tracking-wider mb-2">Simulate Survey Response</h4>
          <p class="text-[#44403c]">Generate a mock survey submission to verify charts calculation formulas.</p>
          
          <div class="space-y-3 pt-2">
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Respondent Email Address</label>
              <input type="email" [(ngModel)]="mockSurveyEmail" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">NPS Rating Score (0-10)</label>
              <input type="number" min="0" max="10" [(ngModel)]="mockSurveyNps" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Correct Quiz answers score</label>
              <input type="number" [(ngModel)]="mockSurveyQuizScore" class="w-full bg-slate-50 bg-white border border-slate-200 border-[#e7e5e4] rounded-xl px-3 py-2 text-slate-800 text-[#1c1917]">
            </div>
          </div>

          <button (click)="simulateSurveySubmission()" class="w-full bg-indigo-600 hover:bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md mt-4">
            Submit Survey Mock
          </button>
        </div>
      </div>

      <!-- View: Survey Builder -->
      <div *ngIf="activeView() === 'survey_builder'" class="lg:col-span-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col min-h-[500px] relative max-w-4xl mx-auto text-xs">
        
        <div class="flex justify-between items-center w-full border-b border-slate-800 pb-4 mb-6">
          <input type="text" [(ngModel)]="surveyName" placeholder="Survey Name" class="bg-transparent border-b border-slate-700 text-lg font-bold text-white focus:outline-none focus:border-indigo-500 py-1">
          <select [(ngModel)]="surveyType" class="bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-white">
            <option value="Customer Satisfaction">Customer Satisfaction (CSAT)</option>
            <option value="NPS">Net Promoter Score (NPS)</option>
            <option value="Feedback">Feedback Form</option>
            <option value="Quizzes">Quiz Questionnaire</option>
          </select>
        </div>

        <div class="space-y-4 max-w-md mx-auto w-full py-4 bg-white text-slate-900 p-6 rounded-2xl shadow-lg min-h-[300px]">
          <p class="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Survey Question Setup</p>

          <div *ngFor="let q of surveyQuestions(); let idx = index" class="p-3 border border-slate-100 rounded-xl relative group">
            <button (click)="removeSurveyQuestion(idx)" class="absolute top-3 right-3 text-rose-500 hover:text-rose-400">
              <span class="material-icons text-sm">remove_circle</span>
            </button>
            <p class="font-bold text-slate-700">Q{{ idx + 1 }}: {{ q.text }}</p>
            <p class="text-[10px] text-[#44403c] uppercase mt-0.5">Type: {{ q.type }}</p>
          </div>

          <div *ngIf="surveyQuestions().length === 0" class="text-center py-12 text-[#44403c]">
            No questions configured yet. Type a question below.
          </div>
        </div>

        <!-- Add Question Form -->
        <div class="space-y-4 border-t border-slate-800 pt-6 mt-6 max-w-lg mx-auto w-full">
          <p class="font-bold text-[#1c1917]">Add Question Details</p>
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Question Text</label>
              <input type="text" [(ngModel)]="newQText" placeholder="How likely are you to recommend us?" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">Question Type</label>
              <select [(ngModel)]="newQType" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white">
                <option value="Text">Free Text Answer</option>
                <option value="Multiple Choice">Multiple Choice Option</option>
                <option value="NPS (0-10)">NPS (0 to 10 Scale)</option>
                <option value="Rating (1-5)">Star Rating (1 to 5)</option>
                <option value="Quiz Option">Quiz Question (Scored)</option>
              </select>
            </div>
            <button (click)="addSurveyQuestion()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-all uppercase">
              Add Question
            </button>
          </div>
        </div>

        <div class="absolute bottom-4 right-4">
          <button (click)="saveSurveyLayout()" [disabled]="!surveyName || surveyQuestions().length === 0" class="bg-indigo-600 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg transition-all">
            Save Survey Structure
          </button>
        </div>
      </div>

      <!-- View: Active Form submission test simulator -->
      <div *ngIf="activeView() === 'form_simulator' && activeSimForm()" class="max-w-md mx-auto bg-white bg-white border border-[#e7e5e4] p-6 rounded-2xl shadow-sm space-y-6 text-xs font-semibold animate-fadeIn">
        <div class="flex justify-between items-center border-b pb-3">
          <h3 class="text-sm font-extrabold text-slate-800 text-[#1c1917]">Form: {{ activeSimForm().name }}</h3>
          <button (click)="setView('forms_list')" class="text-[#44403c] hover:text-slate-600">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- Render fields -->
        <div class="space-y-4">
          <div *ngFor="let field of activeSimForm().fields">
            <label class="block text-[10px] font-bold text-[#44403c] uppercase mb-1">{{ field.label }} <span *ngIf="field.required" class="text-rose-500">*</span></label>
            <input type="text" [(ngModel)]="simFormAnswers[field.label]" placeholder="{{ field.placeholder }}" class="w-full bg-slate-50 bg-white border border-slate-205 border-[#e7e5e4] rounded-xl px-3 py-2.5 text-slate-900 text-[#1c1917]">
          </div>
        </div>

        <button (click)="submitFormAnswers()" class="w-full bg-indigo-600 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md">
          Submit Test Form
        </button>
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
export class FormsSurveysComponent implements OnInit {
  private apiService = inject(ApiService);

  activeView = signal<string>('forms_list'); // 'forms_list' | 'form_builder' | 'surveys_list' | 'survey_builder' | 'survey_analytics' | 'form_simulator'
  forms = signal<any[]>([]);
  surveys = signal<any[]>([]);

  // Form builder inputs
  formName = '';
  formSubmissionAction = 'Create Lead';
  formFields = signal<FormField[]>([]);
  selectedFieldIdx = signal<number | null>(null);

  // Survey builder inputs
  surveyName = '';
  surveyType = 'Customer Satisfaction';
  surveyQuestions = signal<SurveyQuestion[]>([]);
  newQText = '';
  newQType: 'Text' | 'Multiple Choice' | 'NPS (0-10)' | 'Rating (1-5)' | 'Quiz Option' = 'Text';

  // Survey Analytics state
  selectedSurvey = signal<any | null>(null);
  surveyAnalytics = signal<any | null>(null);
  mockSurveyEmail = 'client@grownox.com';
  mockSurveyNps = 9;
  mockSurveyQuizScore = 10;

  // Form submission simulator state
  activeSimForm = signal<any | null>(null);
  simFormAnswers: { [key: string]: string } = {};

  ngOnInit() {
    this.loadForms();
    this.loadSurveys();
  }

  setView(view: string) {
    this.activeView.set(view);
  }

  loadForms() {
    this.apiService.getForms().subscribe({
      next: (res) => {
        if (res.success) this.forms.set(res.data);
      }
    });
  }

  loadSurveys() {
    this.apiService.getSurveys().subscribe({
      next: (res) => {
        if (res.success) this.surveys.set(res.data);
      }
    });
  }

  startNewForm() {
    this.formName = '';
    this.formSubmissionAction = 'Create Lead';
    this.formFields.set([]);
    this.selectedFieldIdx.set(null);
    this.setView('form_builder');
  }

  addFormField(type: 'Text' | 'Email' | 'Phone' | 'Dropdown' | 'Checkbox' | 'Signature') {
    const f: FormField = {
      type,
      label: `Field Label (${type})`,
      placeholder: `Enter ${type.toLowerCase()}`,
      required: false,
      options: []
    };
    this.formFields.set([...this.formFields(), f]);
    this.selectedFieldIdx.set(this.formFields().length - 1);
  }

  removeFormField(idx: number) {
    const cur = this.formFields();
    cur.splice(idx, 1);
    this.formFields.set([...cur]);
    this.selectedFieldIdx.set(null);
  }

  getSelectedField(): FormField | null {
    const idx = this.selectedFieldIdx();
    if (idx === null) return null;
    return this.formFields()[idx];
  }

  saveFormLayout() {
    const payload = {
      name: this.formName,
      fields: this.formFields(),
      submissionAction: this.formSubmissionAction,
    };
    this.apiService.createForm(payload).subscribe({
      next: (res) => {
        this.loadForms();
        this.setView('forms_list');
      }
    });
  }

  openFormSimulator(form: any) {
    this.activeSimForm.set(form);
    this.simFormAnswers = {};
    form.fields.forEach((f: any) => {
      this.simFormAnswers[f.label] = '';
    });
    this.setView('form_simulator');
  }

  submitFormAnswers() {
    const form = this.activeSimForm();
    if (!form) return;

    this.apiService.submitForm(form._id, this.simFormAnswers).subscribe({
      next: (res) => {
        alert(`Form successfully submitted! Automated CRM entity created (${form.submissionAction})`);
        this.setView('forms_list');
      }
    });
  }

  deleteForm(id: string) {
    if (confirm('Delete this form template?')) {
      this.apiService.deleteForm(id).subscribe({
        next: () => this.loadForms()
      });
    }
  }

  // SURVEYS CONTROLS
  startNewSurvey() {
    this.surveyName = '';
    this.surveyType = 'Customer Satisfaction';
    this.surveyQuestions.set([]);
    this.setView('survey_builder');
  }

  addSurveyQuestion() {
    if (!this.newQText) return;
    const q: SurveyQuestion = {
      type: this.newQType,
      text: this.newQText,
      choices: this.newQType === 'Multiple Choice' ? ['Option A', 'Option B', 'Option C'] : []
    };
    this.surveyQuestions.set([...this.surveyQuestions(), q]);
    this.newQText = '';
  }

  removeSurveyQuestion(idx: number) {
    const cur = this.surveyQuestions();
    cur.splice(idx, 1);
    this.surveyQuestions.set([...cur]);
  }

  saveSurveyLayout() {
    const payload = {
      name: this.surveyName,
      type: this.surveyType,
      questions: this.surveyQuestions()
    };
    this.apiService.createSurvey(payload).subscribe({
      next: (res) => {
        this.loadSurveys();
        this.setView('surveys_list');
      }
    });
  }

  openSurveyAnalytics(survey: any) {
    this.selectedSurvey.set(survey);
    this.apiService.getSurveyAnalytics(survey._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.surveyAnalytics.set(res.analytics);
          this.setView('survey_analytics');
        }
      }
    });
  }

  simulateSurveySubmission() {
    const survey = this.selectedSurvey();
    if (!survey) return;

    const payload = {
      respondentEmail: this.mockSurveyEmail,
      answers: survey.questions.map((q: any, i: number) => ({
        questionIndex: i,
        questionText: q.text,
        answerText: q.type === 'NPS (0-10)' ? String(this.mockSurveyNps) : 'Excellent service!'
      })),
      npsScore: this.mockSurveyNps,
      score: this.mockSurveyQuizScore
    };

    this.apiService.submitSurvey(survey._id, payload).subscribe({
      next: () => {
        // Refresh analytics view
        this.openSurveyAnalytics(survey);
      }
    });
  }

  deleteSurvey(id: string) {
    if (confirm('Delete this survey?')) {
      this.apiService.deleteSurvey(id).subscribe({
        next: () => this.loadSurveys()
      });
    }
  }
}
