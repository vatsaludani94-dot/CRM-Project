const CustomerHealth = require('../models/CustomerHealth');
const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');
const EmailMessage = require('../models/EmailMessage');
const Document = require('../models/Document');
const Task = require('../models/Task');

/**
 * @desc Calculate and upsert explainable Customer Health Score (0-100)
 */
const calculateCustomerHealth = async (customerId, tenantId) => {
  try {
    const tenantFilter = { tenant: tenantId };

    const customer = await Customer.findOne({ _id: customerId, ...tenantFilter });
    if (!customer) return null;

    // Fetch customer resources
    const tickets = await Ticket.find({ customer: customerId, ...tenantFilter });
    const emails = await EmailMessage.find({ customer: customerId, ...tenantFilter });
    const documents = await Document.find({ customer: customerId, ...tenantFilter });
    const tasks = await Task.find({ customer: customerId, ...tenantFilter });

    const openTicketsList = tickets.filter(t => ['Open', 'Assigned', 'In Progress', 'Waiting for Customer'].includes(t.status));
    const urgentOpenTickets = openTicketsList.filter(t => ['Critical', 'High'].includes(t.priority));
    const resolvedTickets = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status));

    // Overdue invoices calculation (invoices with amountDue > 0 and createdAt older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let overdueInvoicesCount = 0;
    let totalRevenue = customer.revenueGenerated || 0;
    let lastPaymentDate = null;

    documents.forEach(doc => {
      if (doc.type === 'Invoice') {
        const due = doc.metadata?.amountDue !== undefined ? doc.metadata.amountDue : (doc.metadata?.netAmount || 0);
        if (due > 0 && doc.status !== 'Paid' && doc.createdAt < thirtyDaysAgo) {
          overdueInvoicesCount++;
        }
        if (doc.metadata?.paymentHistory && doc.metadata.paymentHistory.length > 0) {
          doc.metadata.paymentHistory.forEach(p => {
            if (p.date && (!lastPaymentDate || new Date(p.date) > new Date(lastPaymentDate))) {
              lastPaymentDate = p.date;
            }
          });
        }
      }
    });

    // Determine last interaction date across activities, emails, tickets, tasks
    const dates = [];
    if (customer.updatedAt) dates.push(new Date(customer.updatedAt));
    if (customer.activities && customer.activities.length > 0) {
      customer.activities.forEach(a => dates.push(new Date(a.date || a.createdAt)));
    }
    emails.forEach(e => dates.push(new Date(e.createdAt)));
    tickets.forEach(t => dates.push(new Date(t.updatedAt || t.createdAt)));
    tasks.forEach(tk => dates.push(new Date(tk.updatedAt || tk.createdAt)));

    const lastInteractionAt = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(customer.createdAt);
    const daysSinceInteraction = Math.floor((Date.now() - lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate Explainable Health Score (Base: 80)
    let score = 80;
    const positiveFactors = [];
    const riskFactors = [];

    // Factor 1: Recency of Interaction
    if (daysSinceInteraction <= 7) {
      score += 15;
      positiveFactors.push({ factor: 'Recent interaction within last 7 days', impact: 15 });
    } else if (daysSinceInteraction > 30) {
      score -= 25;
      riskFactors.push({ factor: `No interaction for ${daysSinceInteraction} days`, impact: -25 });
    } else if (daysSinceInteraction > 14) {
      score -= 10;
      riskFactors.push({ factor: `No interaction for ${daysSinceInteraction} days`, impact: -10 });
    }

    // Factor 2: Open & Urgent Support Issues
    if (urgentOpenTickets.length > 0) {
      score -= 25;
      riskFactors.push({ factor: `${urgentOpenTickets.length} urgent/critical support issue(s) unresolved`, impact: -25 });
    } else if (openTicketsList.length > 0) {
      score -= 15;
      riskFactors.push({ factor: `${openTicketsList.length} unresolved support ticket(s)`, impact: -15 });
    } else if (resolvedTickets.length > 0) {
      score += 10;
      positiveFactors.push({ factor: 'All support tickets successfully resolved', impact: 10 });
    }

    // Factor 3: Financial & Invoice Payments
    if (overdueInvoicesCount > 0) {
      score -= 20;
      riskFactors.push({ factor: `${overdueInvoicesCount} overdue invoice(s) outstanding`, impact: -20 });
    } else {
      score += 15;
      positiveFactors.push({ factor: 'All invoices paid on time with zero overdue balance', impact: 15 });
    }

    if (totalRevenue >= 5000) {
      score += 10;
      positiveFactors.push({ factor: `High account value ($${totalRevenue.toLocaleString()} lifetime revenue)`, impact: 10 });
    }

    // Factor 4: Follow-up Scheduling
    const pendingTasks = tasks.filter(t => t.status !== 'Completed');
    if (pendingTasks.length === 0 && daysSinceInteraction > 14) {
      score -= 10;
      riskFactors.push({ factor: 'No follow-up task or meeting scheduled', impact: -10 });
    }

    // Clamp score to range [0, 100]
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Derive Health Status
    let healthStatus = 'Healthy';
    if (score >= 80) healthStatus = 'Healthy';
    else if (score >= 60) healthStatus = 'Stable';
    else if (score >= 40) healthStatus = 'At Risk';
    else healthStatus = 'Critical';

    // Sub-scores breakdown
    const recencyScore = daysSinceInteraction <= 7 ? 30 : (daysSinceInteraction <= 14 ? 20 : (daysSinceInteraction <= 30 ? 10 : 0));
    const supportScore = urgentOpenTickets.length > 0 ? 0 : (openTicketsList.length > 0 ? 10 : 30);
    const paymentScore = overdueInvoicesCount > 0 ? 0 : 25;
    const engagementScore = Math.min(15, (customer.activities ? customer.activities.length : 0) + emails.length);

    // Check existing health record
    let existingHealth = await CustomerHealth.findOne({ customer: customerId, tenant: tenantId });
    const previousStatus = existingHealth ? existingHealth.healthStatus : null;
    const previousScore = existingHealth ? existingHealth.healthScore : null;

    if (!existingHealth) {
      existingHealth = new CustomerHealth({
        customer: customerId,
        tenant: tenantId,
        history: []
      });
    }

    existingHealth.healthScore = score;
    existingHealth.healthStatus = healthStatus;
    existingHealth.lastInteractionAt = lastInteractionAt;
    existingHealth.lastPaymentAt = lastPaymentDate || existingHealth.lastPaymentAt;

    existingHealth.totalRevenue = totalRevenue;
    existingHealth.totalInteractions = (customer.activities ? customer.activities.length : 0) + emails.length + tickets.length;
    existingHealth.openTickets = openTicketsList.length;
    existingHealth.overdueInvoices = overdueInvoicesCount;
    existingHealth.recentActivityCount = dates.filter(d => d >= fourteenDaysAgo).length;

    existingHealth.engagementScore = engagementScore;
    existingHealth.paymentScore = paymentScore;
    existingHealth.supportScore = supportScore;
    existingHealth.recencyScore = recencyScore;

    existingHealth.riskFactors = riskFactors;
    existingHealth.positiveFactors = positiveFactors;
    existingHealth.calculatedAt = new Date();

    if (previousScore === null || previousScore !== score) {
      existingHealth.history.push({
        score,
        status: healthStatus,
        changedAt: new Date(),
        reason: `Health score calculated as ${score}/100 (${healthStatus})`
      });
    }

    await existingHealth.save();

    // Side Effects on status change
    if (previousStatus && previousStatus !== healthStatus) {
      customer.activities.push({
        type: 'System',
        description: `Customer health status updated from ${previousStatus} to ${healthStatus} (Score: ${score}/100)`,
        date: new Date()
      });
      await customer.save();

      try {
        const { triggerWorkflowEvents } = require('../controllers/workflowController');
        await triggerWorkflowEvents('customer.health_changed', 'Customer', customerId, tenantId);
        if (healthStatus === 'At Risk') {
          await triggerWorkflowEvents('customer.became_at_risk', 'Customer', customerId, tenantId);
        } else if (healthStatus === 'Critical') {
          await triggerWorkflowEvents('customer.became_critical', 'Customer', customerId, tenantId);
        }
      } catch (wfErr) {
        console.error('Workflow trigger error on health status change:', wfErr.message);
      }
    }

    return existingHealth;
  } catch (error) {
    console.error('Error calculating customer health:', error.message);
    throw error;
  }
};

module.exports = {
  calculateCustomerHealth
};
