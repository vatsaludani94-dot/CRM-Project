const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Activity = require('../models/Activity');
const PDFService = require('../services/pdfService');

/**
 * @desc    Get payroll history list with filters
 * @route   GET /api/payroll
 * @access  Private (Admin, Manager, Employee)
 */
const getPayrolls = async (req, res) => {
  try {
    const { month, employeeId } = req.query;
    let query = {};

    // RBAC: Employees can only see their own payroll. Admins/Managers can filter.
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else {
      if (employeeId) query.employee = employeeId;
    }

    if (month) query.month = month;

    const payrolls = await Payroll.find(query)
      .populate('employee', 'name email department role status')
      .sort({ month: -1, createdAt: -1 });

    res.json({ success: true, count: payrolls.length, data: payrolls });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Create payroll record for an employee
 * @route   POST /api/payroll
 * @access  Private (Admin, Manager)
 */
const createPayroll = async (req, res) => {
  try {
    const { employeeId, month, baseSalary, bonus, deductions, status } = req.body;

    // Verify employee exists and is not customer
    const employee = await User.findById(employeeId);
    if (!employee || employee.role === 'customer') {
      return res.status(400).json({ success: false, error: 'Must assign payroll to a valid company employee' });
    }

    // Check if payroll already exists for this employee + month
    const payrollExists = await Payroll.findOne({ employee: employeeId, month });
    if (payrollExists) {
      return res.status(400).json({ success: false, error: `Payroll already configured for employee in month ${month}` });
    }

    const payroll = new Payroll({
      employee: employeeId,
      month,
      baseSalary,
      bonus: bonus || 0,
      deductions: deductions || 0,
      status: status || 'Draft',
    });

    await payroll.save();

    await Activity.create({
      user: req.user._id,
      action: 'Payroll Created',
      details: `Payroll for employee ${employee.name} for month ${month} created with net salary $${payroll.netSalary} by ${req.user.name}.`,
      module: 'Payroll',
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update payroll details
 * @route   PUT /api/payroll/:id
 * @access  Private (Admin, Manager)
 */
const updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll record not found' });
    }

    const { baseSalary, bonus, deductions, status } = req.body;

    if (baseSalary !== undefined) payroll.baseSalary = baseSalary;
    if (bonus !== undefined) payroll.bonus = bonus;
    if (deductions !== undefined) payroll.deductions = deductions;
    if (status !== undefined) payroll.status = status;

    await payroll.save();

    res.json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Download Payslip PDF
 * @route   GET /api/payroll/:id/download
 * @access  Private
 */
const downloadPayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate('employee', 'name email department role');
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll record not found' });
    }

    // RBAC check: Employees can only download their own payslip
    if (req.user.role === 'employee' && payroll.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized to download this employee payslip' });
    }

    // Generate PDF Buffer
    const pdfBuffer = await PDFService.generatePayslip(payroll);

    // Format clean filename: payslip-2026-06-john_sales.pdf
    const sanitizedName = payroll.employee.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `payslip-${payroll.month}-${sanitizedName}.pdf`;

    // Send headers for PDF file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    // Log Activity
    await Activity.create({
      user: req.user._id,
      action: 'Payslip Downloaded',
      details: `Payslip for employee ${payroll.employee.name} (Month: ${payroll.month}) downloaded.`,
      module: 'Payroll',
      ipAddress: req.ip,
    });
  } catch (error) {
    console.error('PDF Download Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPayrolls,
  createPayroll,
  updatePayroll,
  downloadPayslip,
};
