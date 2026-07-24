const PDFDocument = require('pdfkit');

class PDFService {
  /**
   * Generates a Payslip PDF for a given payroll record
   * @param {Object} payroll - The populated payroll model from mongoose
   * @returns {Promise<Buffer>} - Resolves to the PDF buffer
   */
  static generatePayslip(payroll) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const employee = payroll.employee;
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const [year, monthNum] = payroll.month.split('-');
        const formattedMonth = `${monthNames[parseInt(monthNum, 10) - 1]} ${year}`;

        // 1. Header & Branding
        doc.rect(0, 0, 595, 120).fill('#0f172a'); // Slate 900 background
        doc.fill('#38bdf8').fontSize(22).font('Helvetica-Bold').text('Grownox Technologies', 50, 40);
        doc.fill('#94a3b8').fontSize(10).font('Helvetica').text('Enterprise SaaS Platform', 50, 68);
        
        doc.fill('#ffffff').fontSize(14).font('Helvetica-Bold').text('OFFICIAL PAYSLIP', 400, 45, { align: 'right' });
        doc.fontSize(10).font('Helvetica').fill('#94a3b8').text(`Period: ${formattedMonth}`, 400, 65, { align: 'right' });

        // Move cursor down
        doc.y = 150;

        // 2. Employee Info Section
        doc.fill('#1e293b').fontSize(12).font('Helvetica-Bold').text('EMPLOYEE DETAILS', 50, doc.y);
        doc.moveTo(50, doc.y + 15).lineTo(545, doc.y + 15).strokeColor('#e2e8f0').lineWidth(1).stroke();
        
        doc.y += 25;
        const startY = doc.y;

        doc.fontSize(10).font('Helvetica-Bold').fill('#64748b').text('Name:', 50, startY);
        doc.font('Helvetica').fill('#0f172a').text(employee.name, 150, startY);

        doc.font('Helvetica-Bold').fill('#64748b').text('Email:', 50, startY + 20);
        doc.font('Helvetica').fill('#0f172a').text(employee.email, 150, startY + 20);

        doc.font('Helvetica-Bold').fill('#64748b').text('Department:', 300, startY);
        doc.font('Helvetica').fill('#0f172a').text(employee.department || 'N/A', 400, startY);

        doc.font('Helvetica-Bold').fill('#64748b').text('Role:', 300, startY + 20);
        doc.font('Helvetica').fill('#0f172a').text(employee.role.toUpperCase().replace('_', ' '), 400, startY + 20);

        // 3. Earnings & Deductions Tables
        doc.y = startY + 60;
        const tableHeaderY = doc.y;

        doc.rect(50, tableHeaderY, 240, 25).fill('#f1f5f9');
        doc.rect(305, tableHeaderY, 240, 25).fill('#f1f5f9');

        doc.fill('#475569').fontSize(10).font('Helvetica-Bold').text('EARNINGS', 60, tableHeaderY + 8);
        doc.text('AMOUNT', 200, tableHeaderY + 8, { align: 'right', width: 80 });

        doc.text('DEDUCTIONS', 315, tableHeaderY + 8);
        doc.text('AMOUNT', 455, tableHeaderY + 8, { align: 'right', width: 80 });

        doc.y = tableHeaderY + 35;
        const row1Y = doc.y;

        doc.fill('#0f172a').font('Helvetica').fontSize(10).text('Base Salary', 60, row1Y);
        doc.text(`$${payroll.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 200, row1Y, { align: 'right', width: 80 });

        doc.text('Tax & Deductions', 315, row1Y);
        doc.text(`$${payroll.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 455, row1Y, { align: 'right', width: 80 });

        const row2Y = row1Y + 20;

        doc.text('Performance Bonus', 60, row2Y);
        doc.text(`$${payroll.bonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 200, row2Y, { align: 'right', width: 80 });

        doc.text('-', 315, row2Y);
        doc.text('$0.00', 455, row2Y, { align: 'right', width: 80 });

        doc.moveTo(50, row2Y + 20).lineTo(545, row2Y + 20).strokeColor('#e2e8f0').stroke();

        // 4. Totals Summary
        doc.y = row2Y + 30;
        const summaryY = doc.y;

        doc.font('Helvetica-Bold').fill('#64748b').text('Total Earnings:', 50, summaryY);
        const totalEarnings = payroll.baseSalary + payroll.bonus;
        doc.font('Helvetica').fill('#0f172a').text(`$${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 150, summaryY);

        doc.font('Helvetica-Bold').fill('#64748b').text('Total Deductions:', 50, summaryY + 20);
        doc.font('Helvetica').fill('#0f172a').text(`$${payroll.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 150, summaryY + 20);

        doc.rect(300, summaryY - 10, 245, 55).fill('#e0f2fe');
        doc.fill('#0369a1').fontSize(11).font('Helvetica-Bold').text('NET PAYOUT', 315, summaryY);
        doc.fontSize(16).fill('#0369a1').text(`$${payroll.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 315, summaryY + 16, { font: 'Helvetica-Bold' });

        doc.y = summaryY + 100;
        doc.fill('#475569').fontSize(10).font('Helvetica-Oblique').text('Note: This is an electronically generated payslip from Grownox Technologies and does not require a physical signature.', 50, doc.y, { align: 'center', width: 495 });

        doc.moveTo(50, 750).lineTo(545, 750).strokeColor('#cbd5e1').stroke();
        doc.fill('#94a3b8').fontSize(8).font('Helvetica').text('Grownox Technologies Corporate Services Inc. - Confidential', 50, 760, { align: 'center', width: 495 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a PDF Document for Proposals or Invoices
   * @param {Object} document - The populated Document mongoose model
   * @param {Object} workspaceIdentity - The resolved workspace identity
   * @returns {Promise<Buffer>} - Resolves to non-empty PDF buffer
   */
  static generateDocumentPdf(document, workspaceIdentity = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          if (!pdfBuffer || pdfBuffer.length === 0) {
            return reject(new Error('PDF generation produced empty buffer'));
          }
          resolve(pdfBuffer);
        });
        doc.on('error', (err) => reject(err));

        const wsName = workspaceIdentity.workspaceName || 'GrownX CRM Workspace';
        const wsEmail = workspaceIdentity.communicationEmail || 'contact@grownxcrm.com';
        const docType = (document.type || 'Proposal').toUpperCase();
        const docNum = document.documentNumber || `${docType.substring(0, 3)}-${document._id.toString().substring(18).toUpperCase()}`;

        // Header Background
        doc.rect(0, 0, 595, 120).fill('#0f172a');
        
        // Brand & Workspace Info
        doc.fill('#38bdf8').fontSize(20).font('Helvetica-Bold').text(wsName, 40, 35);
        doc.fill('#94a3b8').fontSize(9).font('Helvetica').text(`Communication Email: ${wsEmail}`, 40, 62);
        doc.fill('#94a3b8').fontSize(9).font('Helvetica').text(`Generated via GrownX SaaS OS Platform`, 40, 76);

        // Document Type & Number Badge
        doc.fill('#ffffff').fontSize(16).font('Helvetica-Bold').text(`${docType} DOCUMENT`, 380, 35, { align: 'right' });
        doc.fill('#f59e0b').fontSize(11).font('Helvetica-Bold').text(`Ref #: ${docNum}`, 380, 58, { align: 'right' });
        doc.fill('#cbd5e1').fontSize(9).font('Helvetica').text(`Status: ${document.status || 'Draft'}`, 380, 74, { align: 'right' });

        doc.y = 140;

        // Client Info Card
        const customerObj = document.customer || {};
        const leadObj = document.lead || {};
        const clientName = customerObj.companyName || leadObj.company || 'Client Account';
        const contactPerson = customerObj.contactPerson || leadObj.contactName || 'N/A';
        const clientEmail = customerObj.email || leadObj.email || 'N/A';
        const clientPhone = customerObj.phone || leadObj.phone || 'N/A';

        doc.rect(40, doc.y, 515, 75).fill('#f8fafc').strokeColor('#e2e8f0').lineWidth(1).stroke();
        
        const cardY = doc.y + 12;
        doc.fill('#0f172a').fontSize(11).font('Helvetica-Bold').text('CLIENT ACCOUNT INFORMATION', 55, cardY);
        
        doc.fontSize(9).font('Helvetica-Bold').fill('#475569').text('Company Name:', 55, cardY + 20);
        doc.font('Helvetica').fill('#0f172a').text(clientName, 140, cardY + 20);

        doc.font('Helvetica-Bold').fill('#475569').text('Contact Person:', 55, cardY + 36);
        doc.font('Helvetica').fill('#0f172a').text(contactPerson, 140, cardY + 36);

        doc.font('Helvetica-Bold').fill('#475569').text('Email:', 310, cardY + 20);
        doc.font('Helvetica').fill('#0284c7').text(clientEmail, 370, cardY + 20);

        doc.font('Helvetica-Bold').fill('#475569').text('Date Issued:', 310, cardY + 36);
        doc.font('Helvetica').fill('#0f172a').text(new Date(document.createdAt || Date.now()).toLocaleDateString(), 370, cardY + 36);

        // Line Items Table
        let tableY = doc.y + 95;
        doc.rect(40, tableY, 515, 22).fill('#1e293b');

        doc.fill('#ffffff').fontSize(9).font('Helvetica-Bold');
        doc.text('LINE ITEM DESCRIPTION', 50, tableY + 6);
        doc.text('QTY', 300, tableY + 6, { align: 'right', width: 40 });
        doc.text('UNIT PRICE', 360, tableY + 6, { align: 'right', width: 80 });
        doc.text('TOTAL AMOUNT', 450, tableY + 6, { align: 'right', width: 90 });

        tableY += 22;
        const lineItems = document.metadata?.lineItems || [];

        if (lineItems.length === 0) {
          doc.rect(40, tableY, 515, 24).fill('#ffffff').strokeColor('#f1f5f9').stroke();
          doc.fill('#64748b').fontSize(9).font('Helvetica-Oblique').text('Standard Service Retainer Agreement', 50, tableY + 7);
          doc.text('1', 300, tableY + 7, { align: 'right', width: 40 });
          doc.text(`$${(document.metadata?.netAmount || 0).toLocaleString()}`, 360, tableY + 7, { align: 'right', width: 80 });
          doc.text(`$${(document.metadata?.netAmount || 0).toLocaleString()}`, 450, tableY + 7, { align: 'right', width: 90 });
          tableY += 24;
        } else {
          lineItems.forEach((item, index) => {
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(40, tableY, 515, 22).fill(rowBg).strokeColor('#f1f5f9').stroke();
            
            doc.fill('#0f172a').fontSize(9).font('Helvetica').text(item.description || 'Service Item', 50, tableY + 6);
            doc.text((item.quantity || 1).toString(), 300, tableY + 6, { align: 'right', width: 40 });
            doc.text(`$${(item.unitPrice || 0).toLocaleString()}`, 360, tableY + 6, { align: 'right', width: 80 });
            doc.text(`$${(item.total || 0).toLocaleString()}`, 450, tableY + 6, { align: 'right', width: 90 });
            
            tableY += 22;
          });
        }

        // Totals & Financial Summary
        const summaryY = tableY + 15;
        const meta = document.metadata || {};
        const subtotal = meta.subtotalAmount || meta.netAmount || 0;
        const discountAmount = meta.discountAmount || 0;
        const taxAmount = meta.taxAmount || 0;
        const netAmount = meta.netAmount || 0;
        const amountPaid = meta.amountPaid || 0;
        const amountDue = meta.amountDue !== undefined ? meta.amountDue : Math.max(0, netAmount - amountPaid);
        const creditBalance = meta.creditBalance || Math.max(0, amountPaid - netAmount);

        // Left Note
        doc.fill('#64748b').fontSize(8).font('Helvetica').text('Payment Terms & Conditions:', 40, summaryY);
        doc.fill('#94a3b8').fontSize(8).text('Payment is due within 15 days of invoice date. Thank you for your business!', 40, summaryY + 12, { width: 250 });

        // Right Math Box
        const mathBoxX = 310;
        doc.rect(mathBoxX, summaryY, 245, document.type === 'Invoice' ? 100 : 75).fill('#f1f5f9').strokeColor('#e2e8f0').stroke();

        let curY = summaryY + 8;
        doc.fill('#475569').fontSize(9).font('Helvetica-Bold').text('Subtotal:', mathBoxX + 15, curY);
        doc.fill('#0f172a').text(`$${subtotal.toLocaleString()}`, mathBoxX + 120, curY, { align: 'right', width: 100 });

        if (discountAmount > 0) {
          curY += 14;
          doc.fill('#475569').fontSize(9).font('Helvetica-Bold').text('Discount:', mathBoxX + 15, curY);
          doc.fill('#dc2626').text(`-$${discountAmount.toLocaleString()}`, mathBoxX + 120, curY, { align: 'right', width: 100 });
        }

        if (taxAmount > 0) {
          curY += 14;
          doc.fill('#475569').fontSize(9).font('Helvetica-Bold').text('Tax:', mathBoxX + 15, curY);
          doc.fill('#0f172a').text(`+$${taxAmount.toLocaleString()}`, mathBoxX + 120, curY, { align: 'right', width: 100 });
        }

        curY += 16;
        doc.moveTo(mathBoxX + 10, curY).lineTo(mathBoxX + 235, curY).strokeColor('#cbd5e1').stroke();
        curY += 6;
        doc.fill('#0f172a').fontSize(11).font('Helvetica-Bold').text('NET TOTAL:', mathBoxX + 15, curY);
        doc.fill('#16a34a').fontSize(11).text(`$${netAmount.toLocaleString()}`, mathBoxX + 120, curY, { align: 'right', width: 100 });

        if (document.type === 'Invoice') {
          curY += 16;
          doc.fill('#475569').fontSize(9).font('Helvetica-Bold').text('Amount Paid:', mathBoxX + 15, curY);
          doc.fill('#0f172a').text(`$${amountPaid.toLocaleString()}`, mathBoxX + 120, curY, { align: 'right', width: 100 });

          curY += 14;
          doc.fill('#475569').fontSize(9).font('Helvetica-Bold').text('Amount Due:', mathBoxX + 15, curY);
          doc.fill(amountDue > 0 ? '#dc2626' : '#16a34a').text(`$${amountDue.toLocaleString()}`, mathBoxX + 120, curY, { align: 'right', width: 100 });

          if (creditBalance > 0) {
            curY += 14;
            doc.fill('#16a34a').fontSize(9).font('Helvetica-Bold').text('Customer Credit:', mathBoxX + 15, curY);
            doc.fill('#16a34a').text(`+$${creditBalance.toLocaleString()}`, mathBoxX + 120, curY, { align: 'right', width: 100 });
          }
        }

        // Footer
        doc.y = 750;
        doc.moveTo(40, 750).lineTo(555, 750).strokeColor('#e2e8f0').stroke();
        doc.fill('#94a3b8').fontSize(8).font('Helvetica').text(`${wsName} • ${wsEmail} • Official Software Generated Document`, 40, 760, { align: 'center', width: 515 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = PDFService;
