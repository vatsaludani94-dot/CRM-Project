const CustomerHealth = require('../models/CustomerHealth');
const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');
const Task = require('../models/Task');
const Document = require('../models/Document');
const { calculateCustomerHealth } = require('../services/customerHealthService');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

/**
 * @desc Get Customer Retention & Health Success Dashboard metrics
 * @route GET /api/retention/dashboard
 * @access Private (Admin, Manager, Employee)
 */
const getRetentionDashboard = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);

    // Fetch all customers for tenant
    const customers = await Customer.find(tenantFilter).select('_id companyName contactPerson email phone status assignedEmployee revenueGenerated createdAt updatedAt');

    // Recalculate health for customers if needed
    const healthPromises = customers.map(c => calculateCustomerHealth(c._id, tenantId));
    await Promise.all(healthPromises);

    // Fetch all health records
    const healthRecords = await CustomerHealth.find(tenantFilter).populate('customer', 'companyName contactPerson email phone status revenueGenerated customerCode');

    let healthyCount = 0;
    let stableCount = 0;
    let atRiskCount = 0;
    let criticalCount = 0;

    let inactiveCount = 0;
    let openTicketsCount = 0;
    let overduePaymentsCount = 0;
    let followUpRequiredCount = 0;

    const atRiskCustomers = [];
    const priorityActions = [];

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const h of healthRecords) {
      if (!h.customer) continue;

      if (h.healthStatus === 'Healthy') healthyCount++;
      else if (h.healthStatus === 'Stable') stableCount++;
      else if (h.healthStatus === 'At Risk') {
        atRiskCount++;
        atRiskCustomers.push(h);
      } else if (h.healthStatus === 'Critical') {
        criticalCount++;
        atRiskCustomers.push(h);
      }

      if (h.lastInteractionAt && h.lastInteractionAt < thirtyDaysAgo) {
        inactiveCount++;
        priorityActions.push({
          id: `inact-${h.customer._id}`,
          customerId: h.customer._id,
          customerName: h.customer.companyName,
          actionType: 'Inactivity',
          message: `No interaction for over 30 days. Last active: ${new Date(h.lastInteractionAt).toLocaleDateString()}`,
          severity: 'high',
          nextAction: 'Send Email'
        });
      }

      if (h.openTickets > 0) {
        openTicketsCount += h.openTickets;
        priorityActions.push({
          id: `tkt-${h.customer._id}`,
          customerId: h.customer._id,
          customerName: h.customer.companyName,
          actionType: 'Support Issue',
          message: `${h.openTickets} open support issue(s) pending resolution`,
          severity: h.healthStatus === 'Critical' ? 'critical' : 'medium',
          nextAction: 'Open Support Ticket'
        });
      }

      if (h.overdueInvoices > 0) {
        overduePaymentsCount += h.overdueInvoices;
        priorityActions.push({
          id: `inv-${h.customer._id}`,
          customerId: h.customer._id,
          customerName: h.customer.companyName,
          actionType: 'Overdue Payment',
          message: `${h.overdueInvoices} overdue invoice(s) outstanding`,
          severity: 'high',
          nextAction: 'View Invoice'
        });
      }

      if (h.riskFactors && h.riskFactors.some(r => r.factor.includes('follow-up'))) {
        followUpRequiredCount++;
      }
    }

    res.json({
      success: true,
      data: {
        distribution: {
          total: healthRecords.length,
          healthy: healthyCount,
          stable: stableCount,
          atRisk: atRiskCount,
          critical: criticalCount
        },
        metrics: {
          inactiveCount,
          openTicketsCount,
          overduePaymentsCount,
          followUpRequiredCount
        },
        atRiskCustomers,
        priorityActions: priorityActions.slice(0, 10) // top 10 priority actions
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Get Segmented Customer Health List
 * @route GET /api/retention/customers
 * @access Private
 */
const getSegmentedCustomers = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { healthStatus, segment, search, assignedEmployee } = req.query;

    let healthQuery = { ...tenantFilter };

    if (healthStatus) {
      healthQuery.healthStatus = healthStatus;
    }

    let records = await CustomerHealth.find(healthQuery)
      .populate({
        path: 'customer',
        populate: { path: 'assignedEmployee', select: 'name email role department' }
      })
      .sort({ healthScore: 1 });

    // Filter by customer search query or segment
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(r => 
        r.customer && (
          r.customer.companyName.toLowerCase().includes(q) ||
          r.customer.contactPerson.toLowerCase().includes(q) ||
          r.customer.email.toLowerCase().includes(q)
        )
      );
    }

    if (assignedEmployee) {
      records = records.filter(r => r.customer && r.customer.assignedEmployee && r.customer.assignedEmployee._id.toString() === assignedEmployee);
    }

    if (segment) {
      if (segment === 'high_value') {
        records = records.filter(r => r.totalRevenue >= 5000);
      } else if (segment === 'at_risk') {
        records = records.filter(r => ['At Risk', 'Critical'].includes(r.healthStatus));
      } else if (segment === 'inactive') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        records = records.filter(r => r.lastInteractionAt && new Date(r.lastInteractionAt) < thirtyDaysAgo);
      } else if (segment === 'open_tickets') {
        records = records.filter(r => r.openTickets > 0);
      } else if (segment === 'overdue_payments') {
        records = records.filter(r => r.overdueInvoices > 0);
      }
    }

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Recalculate customer health on demand
 * @route POST /api/customers/:id/health/recalculate
 * @access Private
 */
const recalculateHealth = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const health = await calculateCustomerHealth(req.params.id, tenantId);
    if (!health) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Create Customer Follow-Up Task / Action
 * @route POST /api/customers/:id/followup
 * @access Private
 */
const createCustomerFollowUp = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const { title, description, dueDate, priority } = req.body;

    const customer = await Customer.findOne({ _id: req.params.id, ...tenantFilter });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const task = await Task.create({
      title: title || `Follow-up with ${customer.companyName}`,
      description: description || 'Scheduled customer retention & satisfaction follow-up',
      customer: customer._id,
      assignedEmployee: req.user._id,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: priority || 'Medium',
      status: 'Pending',
      tenant: tenantId
    });

    customer.activities.push({
      type: 'Note',
      description: `Follow-up task scheduled: "${task.title}" (Due: ${new Date(task.dueDate).toLocaleDateString()})`,
      performedBy: req.user._id,
      date: new Date()
    });
    await customer.save();

    // Recalculate Health
    await calculateCustomerHealth(customer._id, tenantId);

    res.status(201).json({
      success: true,
      message: 'Customer follow-up task created successfully',
      data: task
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getRetentionDashboard,
  getSegmentedCustomers,
  recalculateHealth,
  createCustomerFollowUp
};
