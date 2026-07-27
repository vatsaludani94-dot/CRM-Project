/**
 * Practical SLA Engine for Support Tickets
 */

const DEFAULT_SLA_CONFIG = {
  Low: { firstResponseHours: 48, resolutionHours: 168 },
  Medium: { firstResponseHours: 24, resolutionHours: 72 },
  High: { firstResponseHours: 4, resolutionHours: 24 },
  Urgent: { firstResponseHours: 1, resolutionHours: 8 },
  Critical: { firstResponseHours: 1, resolutionHours: 8 },
};

/**
 * Calculates initial SLA due dates for a ticket based on priority and creation time
 */
const calculateInitialSla = (priority = 'Medium', createdAt = new Date()) => {
  const config = DEFAULT_SLA_CONFIG[priority] || DEFAULT_SLA_CONFIG['Medium'];
  const createdTime = new Date(createdAt).getTime();

  const firstResponseDueAt = new Date(createdTime + config.firstResponseHours * 60 * 60 * 1000);
  const resolutionDueAt = new Date(createdTime + config.resolutionHours * 60 * 60 * 1000);

  return {
    firstResponseDueAt,
    resolutionDueAt,
    slaStatus: 'On Track',
  };
};

/**
 * Evaluates current SLA status for a ticket
 */
const evaluateSlaStatus = (ticket) => {
  if (!ticket) return 'On Track';

  const now = new Date();

  // If ticket is already resolved/closed
  if (['Resolved', 'Closed'].includes(ticket.status)) {
    if (ticket.resolutionDueAt && ticket.resolvedAt && ticket.resolvedAt > ticket.resolutionDueAt) {
      return 'Breached';
    }
    return 'Completed';
  }

  // Check first response breach
  if (!ticket.firstRespondedAt && ticket.firstResponseDueAt && now > ticket.firstResponseDueAt) {
    return 'Breached';
  }

  // Check resolution breach
  if (ticket.resolutionDueAt && now > ticket.resolutionDueAt) {
    return 'Breached';
  }

  // Check if at risk (within 25% of due time)
  if (ticket.resolutionDueAt) {
    const totalTime = ticket.resolutionDueAt.getTime() - new Date(ticket.createdAt).getTime();
    const remaining = ticket.resolutionDueAt.getTime() - now.getTime();
    if (remaining > 0 && remaining <= totalTime * 0.25) {
      return 'At Risk';
    }
  }

  return 'On Track';
};

module.exports = {
  DEFAULT_SLA_CONFIG,
  calculateInitialSla,
  evaluateSlaStatus,
};
