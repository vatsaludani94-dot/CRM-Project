const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

/**
 * Utility to convert JSON array to CSV string
 */
const convertToCSV = (data, headers) => {
  const headerRow = headers.join(',') + '\n';
  const rows = data.map(row => 
    headers.map(header => {
      const val = row[header] !== undefined ? row[header] : '';
      // Escape commas and quotes
      const stringified = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const escaped = stringified.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  ).join('\n');
  return headerRow + rows;
};

/**
 * @desc    Export Customer Report
 * @route   GET /api/reports/customers
 * @access  Private (Admin, Manager)
 */
const exportCustomerReport = async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const customers = await Customer.find().populate('assignedEmployee', 'name');

    if (format === 'csv') {
      const headers = ['customerCode', 'companyName', 'contactPerson', 'email', 'phone', 'industry', 'status', 'revenueGenerated', 'assignedEmployee'];
      const data = customers.map(c => ({
        customerCode: c.customerCode,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        email: c.email,
        phone: c.phone,
        industry: c.industry,
        status: c.status,
        revenueGenerated: c.revenueGenerated,
        assignedEmployee: c.assignedEmployee ? c.assignedEmployee.name : 'Unassigned'
      }));

      const csvString = convertToCSV(data, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="customer_report.csv"');
      return res.send(csvString);
    } else if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="customer_report.pdf"');
      doc.pipe(res);

      // Report Header
      doc.fillColor('#0f172a').fontSize(16).text('Grownox Technologies - Customer Directory Report', 30, 30);
      doc.fontSize(8).fillColor('#64748b').text(`Generated on: ${new Date().toLocaleString()}`, 30, 50);

      // Table Header
      let y = 80;
      doc.rect(30, y, 780, 20).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('CODE', 35, y + 6, { width: 60 });
      doc.text('COMPANY NAME', 100, y + 6, { width: 150 });
      doc.text('CONTACT PERSON', 260, y + 6, { width: 110 });
      doc.text('EMAIL', 380, y + 6, { width: 150 });
      doc.text('INDUSTRY', 540, y + 6, { width: 90 });
      doc.text('STATUS', 640, y + 6, { width: 50 });
      doc.text('REVENUE', 700, y + 6, { width: 100, align: 'right' });

      // Rows
      y += 20;
      doc.font('Helvetica').fillColor('#334155');
      customers.forEach((c, index) => {
        if (y > 500) {
          doc.addPage();
          y = 30;
          doc.rect(30, y, 780, 20).fill('#1e293b');
          doc.fillColor('#ffffff').font('Helvetica-Bold');
          doc.text('CODE', 35, y + 6, { width: 60 });
          doc.text('COMPANY NAME', 100, y + 6, { width: 150 });
          doc.text('CONTACT PERSON', 260, y + 6, { width: 110 });
          doc.text('EMAIL', 380, y + 6, { width: 150 });
          doc.text('INDUSTRY', 540, y + 6, { width: 90 });
          doc.text('STATUS', 640, y + 6, { width: 50 });
          doc.text('REVENUE', 700, y + 6, { width: 100, align: 'right' });
          y += 20;
          doc.font('Helvetica').fillColor('#334155');
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(30, y, 780, 18).fill('#f8fafc');
        }

        doc.fillColor('#0f172a');
        doc.text(c.customerCode, 35, y + 5, { width: 60 });
        doc.text(c.companyName, 100, y + 5, { width: 150 });
        doc.text(c.contactPerson, 260, y + 5, { width: 110 });
        doc.text(c.email, 380, y + 5, { width: 150 });
        doc.text(c.industry, 540, y + 5, { width: 90 });
        doc.text(c.status, 640, y + 5, { width: 50 });
        doc.text(`$${c.revenueGenerated.toLocaleString()}`, 700, y + 5, { width: 100, align: 'right' });
        y += 18;
      });

      doc.end();
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Export Lead Report
 * @route   GET /api/reports/leads
 * @access  Private (Admin, Manager)
 */
const exportLeadReport = async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const leads = await Lead.find().populate('assignedEmployee', 'name');

    if (format === 'csv') {
      const headers = ['company', 'contactName', 'email', 'phone', 'leadSource', 'expectedRevenue', 'stage', 'aiScore', 'assignedEmployee'];
      const data = leads.map(l => ({
        company: l.company,
        contactName: l.contactName,
        email: l.email,
        phone: l.phone,
        leadSource: l.leadSource,
        expectedRevenue: l.expectedRevenue,
        stage: l.stage,
        aiScore: `${l.aiScore}%`,
        assignedEmployee: l.assignedEmployee ? l.assignedEmployee.name : 'Unassigned'
      }));

      const csvString = convertToCSV(data, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads_report.csv"');
      return res.send(csvString);
    } else if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="leads_report.pdf"');
      doc.pipe(res);

      doc.fillColor('#0f172a').fontSize(16).text('Grownox Technologies - Sales Lead Report', 30, 30);
      doc.fontSize(8).fillColor('#64748b').text(`Generated on: ${new Date().toLocaleString()}`, 30, 50);

      let y = 80;
      doc.rect(30, y, 780, 20).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('COMPANY', 35, y + 6, { width: 120 });
      doc.text('CONTACT', 160, y + 6, { width: 110 });
      doc.text('EMAIL', 280, y + 6, { width: 140 });
      doc.text('SOURCE', 430, y + 6, { width: 80 });
      doc.text('STAGE', 520, y + 6, { width: 80 });
      doc.text('AI SCORE', 610, y + 6, { width: 60 });
      doc.text('ASSIGNED AGENT', 680, y + 6, { width: 100 });

      y += 20;
      doc.font('Helvetica').fillColor('#334155');
      leads.forEach((l, index) => {
        if (y > 500) {
          doc.addPage();
          y = 30;
          doc.rect(30, y, 780, 20).fill('#1e293b');
          doc.fillColor('#ffffff').font('Helvetica-Bold');
          doc.text('COMPANY', 35, y + 6, { width: 120 });
          doc.text('CONTACT', 160, y + 6, { width: 110 });
          doc.text('EMAIL', 280, y + 6, { width: 140 });
          doc.text('SOURCE', 430, y + 6, { width: 80 });
          doc.text('STAGE', 520, y + 6, { width: 80 });
          doc.text('AI SCORE', 610, y + 6, { width: 60 });
          doc.text('ASSIGNED AGENT', 680, y + 6, { width: 100 });
          y += 20;
          doc.font('Helvetica').fillColor('#334155');
        }

        if (index % 2 === 0) {
          doc.rect(30, y, 780, 18).fill('#f8fafc');
        }

        doc.fillColor('#0f172a');
        doc.text(l.company, 35, y + 5, { width: 120 });
        doc.text(l.contactName, 160, y + 5, { width: 110 });
        doc.text(l.email, 280, y + 5, { width: 140 });
        doc.text(l.leadSource, 430, y + 5, { width: 80 });
        doc.text(l.stage, 520, y + 5, { width: 80 });
        doc.text(`${l.aiScore}%`, 610, y + 5, { width: 60 });
        doc.text(l.assignedEmployee ? l.assignedEmployee.name : 'Unassigned', 680, y + 5, { width: 100 });
        y += 18;
      });

      doc.end();
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Export Support Ticket Report
 * @route   GET /api/reports/tickets
 * @access  Private (Admin, Manager)
 */
const exportTicketReport = async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const tickets = await Ticket.find().populate('customer', 'companyName').populate('assignedEmployee', 'name');

    if (format === 'csv') {
      const headers = ['ticketCode', 'title', 'category', 'priority', 'status', 'customer', 'assignedEmployee'];
      const data = tickets.map(t => ({
        ticketCode: t.ticketCode,
        title: t.title,
        category: t.category,
        priority: t.priority,
        status: t.status,
        customer: t.customer ? t.customer.companyName : 'N/A',
        assignedEmployee: t.assignedEmployee ? t.assignedEmployee.name : 'Unassigned'
      }));

      const csvString = convertToCSV(data, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="tickets_report.csv"');
      return res.send(csvString);
    } else if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="tickets_report.pdf"');
      doc.pipe(res);

      doc.fillColor('#0f172a').fontSize(16).text('Grownox Technologies - Support Ticketing Report', 30, 30);
      doc.fontSize(8).fillColor('#64748b').text(`Generated on: ${new Date().toLocaleString()}`, 30, 50);

      let y = 80;
      doc.rect(30, y, 780, 20).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('CODE', 35, y + 6, { width: 70 });
      doc.text('TICKET TITLE', 110, y + 6, { width: 220 });
      doc.text('CATEGORY', 340, y + 6, { width: 110 });
      doc.text('PRIORITY', 460, y + 6, { width: 70 });
      doc.text('STATUS', 540, y + 6, { width: 70 });
      doc.text('CLIENT COMPANY', 620, y + 6, { width: 100 });
      doc.text('ASSIGNEE', 730, y + 6, { width: 70 });

      y += 20;
      doc.font('Helvetica').fillColor('#334155');
      tickets.forEach((t, index) => {
        if (y > 500) {
          doc.addPage();
          y = 30;
          doc.rect(30, y, 780, 20).fill('#1e293b');
          doc.fillColor('#ffffff').font('Helvetica-Bold');
          doc.text('CODE', 35, y + 6, { width: 70 });
          doc.text('TICKET TITLE', 110, y + 6, { width: 220 });
          doc.text('CATEGORY', 340, y + 6, { width: 110 });
          doc.text('PRIORITY', 460, y + 6, { width: 70 });
          doc.text('STATUS', 540, y + 6, { width: 70 });
          doc.text('CLIENT COMPANY', 620, y + 6, { width: 100 });
          doc.text('ASSIGNEE', 730, y + 6, { width: 70 });
          y += 20;
          doc.font('Helvetica').fillColor('#334155');
        }

        if (index % 2 === 0) {
          doc.rect(30, y, 780, 18).fill('#f8fafc');
        }

        doc.fillColor('#0f172a');
        doc.text(t.ticketCode, 35, y + 5, { width: 70 });
        doc.text(t.title, 110, y + 5, { width: 220 });
        doc.text(t.category, 340, y + 5, { width: 110 });
        doc.text(t.priority, 460, y + 5, { width: 70 });
        doc.text(t.status, 540, y + 5, { width: 70 });
        doc.text(t.customer ? t.customer.companyName : 'N/A', 620, y + 5, { width: 100 });
        doc.text(t.assignedEmployee ? t.assignedEmployee.name : 'Unassigned', 730, y + 5, { width: 70 });
        y += 18;
      });

      doc.end();
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  exportCustomerReport,
  exportLeadReport,
  exportTicketReport,
};
