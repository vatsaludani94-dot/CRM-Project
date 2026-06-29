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

        // Draw Table headers
        doc.rect(50, tableHeaderY, 240, 25).fill('#f1f5f9');
        doc.rect(305, tableHeaderY, 240, 25).fill('#f1f5f9');

        doc.fill('#475569').fontSize(10).font('Helvetica-Bold').text('EARNINGS', 60, tableHeaderY + 8);
        doc.text('AMOUNT', 200, tableHeaderY + 8, { align: 'right', width: 80 });

        doc.text('DEDUCTIONS', 315, tableHeaderY + 8);
        doc.text('AMOUNT', 455, tableHeaderY + 8, { align: 'right', width: 80 });

        // Table Rows
        doc.y = tableHeaderY + 35;
        const row1Y = doc.y;

        // Base Salary
        doc.fill('#0f172a').font('Helvetica').fontSize(10).text('Base Salary', 60, row1Y);
        doc.text(`$${payroll.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 200, row1Y, { align: 'right', width: 80 });

        // Deductions
        doc.text('Tax & Deductions', 315, row1Y);
        doc.text(`$${payroll.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 455, row1Y, { align: 'right', width: 80 });

        const row2Y = row1Y + 20;

        // Bonus
        doc.text('Performance Bonus', 60, row2Y);
        doc.text(`$${payroll.bonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 200, row2Y, { align: 'right', width: 80 });

        // Empty right cell
        doc.text('-', 315, row2Y);
        doc.text('$0.00', 455, row2Y, { align: 'right', width: 80 });

        // Add line separator
        doc.moveTo(50, row2Y + 20).lineTo(545, row2Y + 20).strokeColor('#e2e8f0').stroke();

        // 4. Totals Summary
        doc.y = row2Y + 30;
        const summaryY = doc.y;

        doc.font('Helvetica-Bold').fill('#64748b').text('Total Earnings:', 50, summaryY);
        const totalEarnings = payroll.baseSalary + payroll.bonus;
        doc.font('Helvetica').fill('#0f172a').text(`$${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 150, summaryY);

        doc.font('Helvetica-Bold').fill('#64748b').text('Total Deductions:', 50, summaryY + 20);
        doc.font('Helvetica').fill('#0f172a').text(`$${payroll.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 150, summaryY + 20);

        // Highlight Net Salary
        doc.rect(300, summaryY - 10, 245, 55).fill('#e0f2fe'); // Sky 100 bg
        doc.fill('#0369a1').fontSize(11).font('Helvetica-Bold').text('NET PAYOUT', 315, summaryY);
        doc.fontSize(16).fill('#0369a1').text(`$${payroll.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 315, summaryY + 16, { font: 'Helvetica-Bold' });

        // 5. Signature and footer
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
}

module.exports = PDFService;
