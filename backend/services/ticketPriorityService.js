const Document = require('../models/Document');
const Customer = require('../models/Customer');
const CustomerHealth = require('../models/CustomerHealth');

/**
 * Deterministic & Explainable Priority Engine for Support Tickets
 * Evaluates Keyword Signals, Customer Revenue, Customer Health, and Overdue Invoices
 */
const evaluateTicketPriority = async ({ title = '', description = '', customerId = null, tenantId = null, requestedPriority = null }) => {
  const text = `${title} ${description}`.toLowerCase();
  const drivers = [];

  // If user/agent manually specifies an explicit priority, respect manual override
  if (requestedPriority && ['Low', 'Medium', 'High', 'Urgent', 'Critical'].includes(requestedPriority)) {
    drivers.push(`Manual Priority Override applied by agent/user`);
    return {
      priority: requestedPriority === 'Critical' ? 'Urgent' : requestedPriority,
      priorityExplanation: `Priority explicitly assigned as ${requestedPriority} via manual override.`,
      priorityDrivers: drivers,
    };
  }

  let calculatedPriority = 'Medium';

  // 1. Keyword Signal Analysis
  const urgentKeywords = ['broken', 'down', 'urgent', 'cannot access', 'payment failed', 'billing error', 'security issue', 'production down', 'outage', 'crash', 'emergency'];
  const highKeywords = ['error', 'fail', 'failed', 'issue', 'bug', 'cannot', 'stuck', 'refund'];
  const lowKeywords = ['question', 'how to', 'feature request', 'documentation', 'feedback', 'inquiry'];

  const matchedUrgent = urgentKeywords.filter((kw) => text.includes(kw));
  const matchedHigh = highKeywords.filter((kw) => text.includes(kw));
  const matchedLow = lowKeywords.filter((kw) => text.includes(kw));

  if (matchedUrgent.length > 0) {
    calculatedPriority = 'Urgent';
    drivers.push(`Contains critical operational keyword(s): "${matchedUrgent.join('", "')}"`);
  } else if (matchedHigh.length > 0) {
    calculatedPriority = 'High';
    drivers.push(`Contains high-impact issue keyword(s): "${matchedHigh.join('", "')}"`);
  } else if (matchedLow.length > 0) {
    calculatedPriority = 'Low';
    drivers.push(`Contains general inquiry keyword(s): "${matchedLow.join('", "')}"`);
  }

  // 2. Customer Context Analysis (if linked to a customer)
  if (customerId && tenantId) {
    try {
      const customer = await Customer.findOne({ _id: customerId, tenant: tenantId });
      if (customer) {
        // High Revenue Customer Check
        if (customer.revenueGenerated && customer.revenueGenerated >= 50000) {
          drivers.push(`High-value Enterprise customer account (₹${customer.revenueGenerated.toLocaleString()})`);
          if (calculatedPriority === 'Medium') calculatedPriority = 'High';
        }

        // Customer Health Score Check
        const health = await CustomerHealth.findOne({ customer: customerId, tenant: tenantId });
        if (health && (health.status === 'At_Risk' || health.status === 'Critical')) {
          drivers.push(`Customer account health status is ${health.status.replace('_', ' ')} (${health.score}/100)`);
          if (calculatedPriority === 'Medium' || calculatedPriority === 'Low') calculatedPriority = 'High';
          else if (calculatedPriority === 'High') calculatedPriority = 'Urgent';
        }

        // Overdue Invoice Check
        const overdueInvoices = await Document.find({
          customer: customerId,
          tenant: tenantId,
          type: 'Invoice',
          paymentStatus: { $in: ['Unpaid', 'Overdue'] },
        });

        if (overdueInvoices.length > 0) {
          drivers.push(`Customer has ${overdueInvoices.length} pending/overdue invoice(s)`);
        }
      }
    } catch (err) {
      console.error('[PRIORITY ENGINE ERROR]', err.message);
    }
  }

  if (drivers.length === 0) {
    drivers.push('Standard ticket request with no critical signals detected');
  }

  const priorityExplanation = `Evaluated as ${calculatedPriority} Priority based on ${drivers.length} operational factor(s): ${drivers.join('; ')}.`;

  return {
    priority: calculatedPriority,
    priorityExplanation,
    priorityDrivers: drivers,
  };
};

module.exports = {
  evaluateTicketPriority,
};
