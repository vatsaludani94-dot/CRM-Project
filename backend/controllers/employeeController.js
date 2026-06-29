const User = require('../models/User');
const Lead = require('../models/Lead');
const Ticket = require('../models/Ticket');
const Activity = require('../models/Activity');

/**
 * @desc    Get employee directory list
 * @route   GET /api/employees
 * @access  Private (Admin, Manager, Employee)
 */
const getEmployees = async (req, res) => {
  try {
    const { department, status } = req.query;
    let query = { role: { $in: ['employee', 'manager'] } }; // exclude customers

    if (department) query.department = department;
    if (status) query.status = status;

    const employees = await User.find(query).select('-password').sort({ name: 1 });

    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get detailed performance metrics for an employee
 * @route   GET /api/employees/:id/performance
 * @access  Private (Admin, Manager, Employee)
 */
const getEmployeePerformance = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const employee = await User.findById(employeeId).select('-password');
    
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // 1. Calculate assigned vs converted leads
    const totalLeads = await Lead.countDocuments({ assignedEmployee: employeeId });
    const convertedLeads = await Lead.countDocuments({ assignedEmployee: employeeId, stage: 'Converted' });
    const lostLeads = await Lead.countDocuments({ assignedEmployee: employeeId, stage: 'Lost' });

    // 2. Calculate resolved tickets
    const assignedTickets = await Ticket.countDocuments({ assignedEmployee: employeeId });
    const resolvedTickets = await Ticket.countDocuments({ assignedEmployee: employeeId, status: { $in: ['Resolved', 'Closed'] } });

    // 3. Productivity Score Calculation (0 to 100)
    // Formula: (Converted Leads * 20 + Resolved Tickets * 10) capped at 100, or a ratio
    let leadRatio = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    let ticketRatio = assignedTickets > 0 ? (resolvedTickets / assignedTickets) * 100 : 0;
    
    let productivityScore = 50; // base score if no tasks
    if (totalLeads > 0 || assignedTickets > 0) {
      const leadWeight = totalLeads > 0 ? 0.6 : 0;
      const ticketWeight = assignedTickets > 0 ? 0.4 : 0;
      const totalWeight = leadWeight + ticketWeight;

      productivityScore = Math.round(
        ((leadRatio * leadWeight) + (ticketRatio * ticketWeight)) / (totalWeight || 1)
      );
    }

    // Ensure it's between 10 and 100
    productivityScore = Math.max(10, Math.min(100, productivityScore));

    res.json({
      success: true,
      data: {
        employee: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          department: employee.department,
          status: employee.status
        },
        metrics: {
          leadsAssigned: totalLeads,
          leadsConverted: convertedLeads,
          leadsLost: lostLeads,
          ticketsAssigned: assignedTickets,
          ticketsResolved: resolvedTickets,
          productivityIndex: productivityScore, // Percentage representing output quality
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get Employee Productivity Leaderboard
 * @route   GET /api/employees/leaderboard
 * @access  Private (Admin, Manager, Employee)
 */
const getLeaderboard = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee', status: 'active' }).select('name email department');
    const leaderboard = [];

    for (let emp of employees) {
      const leadsConverted = await Lead.countDocuments({ assignedEmployee: emp._id, stage: 'Converted' });
      const ticketsResolved = await Ticket.countDocuments({ assignedEmployee: emp._id, status: { $in: ['Resolved', 'Closed'] } });
      const totalRevenue = await Lead.aggregate([
        { $match: { assignedEmployee: emp._id, stage: 'Converted' } },
        { $group: { _id: null, total: { $sum: '$expectedRevenue' } } }
      ]);

      const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
      const score = (leadsConverted * 150) + (ticketsResolved * 50) + Math.round(revenue / 1000);

      leaderboard.push({
        _id: emp._id,
        name: emp.name,
        department: emp.department,
        leadsConverted,
        ticketsResolved,
        revenueGenerated: revenue,
        overallScore: score || 0
      });
    }

    // Sort descending by score
    leaderboard.sort((a, b) => b.overallScore - a.overallScore);

    res.json({ success: true, data: leaderboard.slice(0, 10) }); // Top 10
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update employee details or department
 * @route   PUT /api/employees/:id
 * @access  Private (Admin, Manager)
 */
const updateEmployee = async (req, res) => {
  try {
    const { department, status, role } = req.body;
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    if (department) employee.department = department;
    if (status) employee.status = status;
    if (role && req.user.role === 'super_admin') employee.role = role;

    await employee.save();

    await Activity.create({
      user: req.user._id,
      action: 'Employee Updated',
      details: `Employee ${employee.name} status updated to ${employee.status}, department ${employee.department} by ${req.user.name}.`,
      module: 'Employee',
      ipAddress: req.ip,
    });

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getEmployees,
  getEmployeePerformance,
  getLeaderboard,
  updateEmployee,
};
