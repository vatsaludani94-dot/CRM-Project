import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private getBaseUrl(): string {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    return `${window.location.protocol}//${window.location.host}/api`;
  }

  private baseUrl = this.getBaseUrl();

  constructor(private http: HttpClient) {}

  // 1. Dashboard & Global Search
  getDashboard(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboard`);
  }

  globalSearch(query: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboard/search?q=${encodeURIComponent(query)}`);
  }

  // 2. Customers
  getCustomers(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<any>(`${this.baseUrl}/customers`, { params: httpParams });
  }

  getCustomer(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/customers/${id}`);
  }

  getCustomer360(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/customers/${id}/360`);
  }

  createCustomer(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/customers`, data);
  }

  updateCustomer(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/customers/${id}`, data);
  }

  deleteCustomer(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/customers/${id}`);
  }

  addCustomerNote(customerId: string, content: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/customers/${customerId}/notes`, { content });
  }

  logCustomerActivity(customerId: string, activity: { type: string; description: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/customers/${customerId}/activities`, activity);
  }

  getCustomerTimeline(customerId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/customers/${customerId}/timeline`);
  }

  // 3. Leads & Pipeline Stages
  getLeads(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/leads`);
  }

  createLead(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leads`, data);
  }

  updateLead(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/leads/${id}`, data);
  }

  transitionLead(id: string, payload: { targetStageKey?: string; targetStageName?: string; lostReason?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leads/${id}/transition`, payload);
  }

  deleteLead(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/leads/${id}`);
  }

  addLeadNote(leadId: string, content: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leads/${leadId}/notes`, { content });
  }

  getLeadTimeline(leadId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/leads/${leadId}/timeline`);
  }

  getLeadScore(leadId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/leads/${leadId}/score`);
  }

  refreshLeadScore(leadId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leads/${leadId}/score/refresh`, {});
  }

  // Pipeline Stage Management API
  getPipelineStages(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/pipeline/stages`);
  }

  createPipelineStage(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/pipeline/stages`, data);
  }

  updatePipelineStage(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/pipeline/stages/${id}`, data);
  }

  deletePipelineStage(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/pipeline/stages/${id}`);
  }

  // 4. Tickets
  getTickets(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<any>(`${this.baseUrl}/tickets`, { params: httpParams });
  }

  getTicket(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/tickets/${id}`);
  }

  createTicket(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tickets`, data);
  }

  updateTicket(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/tickets/${id}`, data);
  }

  addTicketComment(ticketId: string, comment: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tickets/${ticketId}/comments`, { comment });
  }

  getTicketAISuggestions(ticketId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/tickets/${ticketId}/ai-suggestions`);
  }

  // 5. Employees
  getEmployees(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<any>(`${this.baseUrl}/employees`, { params: httpParams });
  }

  getEmployeePerformance(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/employees/${id}/performance`);
  }

  getLeaderboard(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/employees/leaderboard`);
  }

  updateEmployee(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/employees/${id}`, data);
  }

  // 6. Payroll
  getPayrolls(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<any>(`${this.baseUrl}/payroll`, { params: httpParams });
  }

  createPayroll(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/payroll`, data);
  }

  updatePayroll(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/payroll/${id}`, data);
  }

  getPayslipDownloadUrl(id: string): string {
    return `${this.baseUrl}/payroll/${id}/download`;
  }

  // 7. Notifications
  getNotifications(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/notifications`);
  }

  getUnreadCount(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/notifications/unread-count`);
  }

  markNotificationAsRead(id: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/notifications/${id}/read`, {});
  }

  markAllNotificationsAsRead(): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/notifications/read-all`, {});
  }

  // 8. Reports
  getReportExportUrl(module: 'customers' | 'leads' | 'tickets', format: 'csv' | 'pdf'): string {
    return `${this.baseUrl}/reports/${module}?format=${format}`;
  }

  // 9. Raw AI Tools
  classifyTicketAI(title: string, description: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/classify`, { title, description });
  }

  detectPriorityAI(title: string, description: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/priority`, { title, description });
  }

  scoreLeadAI(leadData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/score-lead`, leadData);
  }

  // 10. Appointments / Calendar
  getAppointments(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<any>(`${this.baseUrl}/appointments`, { params: httpParams });
  }

  createAppointment(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/appointments`, data);
  }

  updateAppointment(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/appointments/${id}`, data);
  }

  deleteAppointment(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/appointments/${id}`);
  }

  // 11. AI Caller & Social Automation
  analyzeCallTranscript(transcript: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/analyze-call`, { transcript });
  }

  generateSocialReply(platform: string, messageText: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/social-reply`, { platform, messageText });
  }

  // 12. Workflows
  getWorkflows(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/workflows`);
  }
  createWorkflow(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/workflows`, data);
  }
  updateWorkflow(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/workflows/${id}`, data);
  }
  deleteWorkflow(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/workflows/${id}`);
  }
  getWorkflowLogs(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/workflows/logs`);
  }

  // 13. Gmail Center
  getOAuthUrl(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/emails/oauth-url`);
  }
  connectGmail(email: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/emails/oauth-callback`, { email, code });
  }
  sendGmail(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/emails/send`, data);
  }
  getEmailHistory(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/emails/history`);
  }
  receiveMockEmail(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/emails/receive`, data);
  }
  trackEmailOpen(id: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/emails/track/${id}`, {});
  }

  // 14. Google Drive
  getDriveFolders(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/drive/folders`);
  }
  createDriveFolder(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/drive/folders`, data);
  }
  getFolderContents(folderId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/drive/folders/${folderId}`);
  }
  uploadDriveFile(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/drive/files/upload`, data);
  }
  deleteDriveFile(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/drive/files/${id}`);
  }

  // 15. Website & Funnel Builders
  getWebsites(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/builders/websites`);
  }
  createWebsite(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/builders/websites`, data);
  }
  updateWebsite(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/builders/websites/${id}`, data);
  }
  publishWebsite(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/builders/websites/${id}/publish`, data);
  }
  deleteWebsite(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/builders/websites/${id}`);
  }

  getFunnels(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/builders/funnels`);
  }
  createFunnel(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/builders/funnels`, data);
  }
  updateFunnel(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/builders/funnels/${id}`, data);
  }
  cloneFunnel(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/builders/funnels/${id}/clone`, {});
  }
  trackFunnelMetric(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/builders/funnels/${id}/metrics`, data);
  }
  deleteFunnel(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/builders/funnels/${id}`);
  }

  // 16. Forms & Surveys
  getForms(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/forms-surveys/forms`);
  }
  createForm(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/forms-surveys/forms`, data);
  }
  updateForm(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/forms-surveys/forms/${id}`, data);
  }
  deleteForm(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/forms-surveys/forms/${id}`);
  }
  submitForm(id: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/forms-surveys/forms/${id}/submit`, { formData: data });
  }
  getFormSubmissions(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/forms-surveys/forms/${id}/submissions`);
  }

  getSurveys(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/forms-surveys/surveys`);
  }
  createSurvey(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/forms-surveys/surveys`, data);
  }
  updateSurvey(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/forms-surveys/surveys/${id}`, data);
  }
  deleteSurvey(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/forms-surveys/surveys/${id}`);
  }
  submitSurvey(id: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/forms-surveys/surveys/${id}/submit`, data);
  }
  getSurveyAnalytics(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/forms-surveys/surveys/${id}/analytics`);
  }

  // 17. SMS Marketing
  getSmsCampaigns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/sms`);
  }
  createSmsCampaign(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/sms`, data);
  }
  updateSmsCampaign(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/sms/${id}`, data);
  }
  deleteSmsCampaign(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/sms/${id}`);
  }
  sendSmsCampaign(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/sms/${id}/send`, {});
  }

  // 18. Collaboration Chat
  getChannels(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/collaboration/channels`);
  }
  createChannel(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/collaboration/channels`, data);
  }
  getChatMessages(params: any): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(k => {
      if (params[k]) httpParams = httpParams.set(k, params[k]);
    });
    return this.http.get<any>(`${this.baseUrl}/collaboration/messages`, { params: httpParams });
  }
  sendChatMessage(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/collaboration/messages`, data);
  }
  getTeamMembers(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/collaboration/team`);
  }

  // 19. Documents & Invoicing
  getDocuments(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<any>(`${this.baseUrl}/documents`, { params: httpParams });
  }
  getDocument(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/documents/${id}`);
  }
  createDocument(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/documents`, data);
  }
  updateDocument(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/documents/${id}`, data);
  }
  getDocumentPdfDownloadUrl(id: string): string {
    return `${this.baseUrl}/documents/${id}/pdf`;
  }
  transitionDocument(id: string, targetStatus: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/documents/${id}/transition`, { targetStatus });
  }
  recordInvoicePayment(id: string, payload: { amount: number; paymentMethod?: string; transactionRef?: string; notes?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/documents/${id}/payments`, payload);
  }
  correctInvoicePayment(id: string, paymentId: string, payload: { amount?: number; paymentMethod?: string; transactionRef?: string; notes?: string; reason: string }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/documents/${id}/payments/${paymentId}`, payload);
  }
  deleteInvoicePayment(id: string, paymentId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/documents/${id}/payments/${paymentId}`);
  }
  sendProposalEmail(id: string, payload: { recipientEmail: string; recipientName?: string; cc?: string[]; subject?: string; message?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/documents/${id}/send`, payload);
  }
  getMe(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/auth/me`);
  }
  getWorkspaceSettings(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/workspace/settings`);
  }
  updateWorkspaceSettings(data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/workspace/settings`, data);
  }

  // 20. Task Management
  getTasks(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<any>(`${this.baseUrl}/tasks`, { params: httpParams });
  }
  createTask(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tasks`, data);
  }
  updateTask(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/tasks/${id}`, data);
  }
  deleteTask(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/tasks/${id}`);
  }
  addTaskComment(id: string, text: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tasks/${id}/comments`, { text });
  }

  // 21. Advanced AI Integrations
  analyzeMeetingTranscript(transcript: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/analyze-meeting`, { transcript });
  }
  assessDealRisk(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/assess-deal-risk`, data);
  }
  getPipelineForecast(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ai/pipeline-forecast`);
  }
  getBusinessInsights(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ai/business-insights`);
  }

  askWebsiteAssistant(question: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/website-assistant`, { question });
  }
}

