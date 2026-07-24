const nodemailer = require('nodemailer');

// Create reusable Nodemailer transporter using SMTP credentials or Ethereal fallback
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development Fallback Transporter (logs email content to console gracefully when SMTP credentials not provided)
  return {
    sendMail: async (mailOptions) => {
      console.log('\n======================================================');
      console.log('📧 [DEV EMAIL SERVICE SIMULATOR]');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('------------------------------------------------------');
      console.log(mailOptions.text || 'HTML Content Sent');
      console.log('======================================================\n');
      return { messageId: `dev-simulated-${Date.now()}` };
    },
  };
};

const getFromAddress = () => {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'grownxcrm@gmail.com';
  return `"GrownX CRM" <${fromEmail}>`;
};

/**
 * Send 6-Digit Password Reset OTP Email
 */
const sendOtpEmail = async (userEmail, otpCode) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: getFromAddress(),
    to: userEmail,
    subject: 'Your 6-Digit Password Reset Verification OTP - GrownX CRM',
    text: `Your password reset OTP is ${otpCode}. This code is valid for 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1c1917; margin: 0; font-size: 24px;">GrownX CRM</h2>
          <p style="color: #44403c; font-size: 14px; margin-top: 4px;">Account Recovery & Security</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #44403c; font-size: 14px; margin-bottom: 16px;">You requested to reset your account password. Use the 6-digit verification code below:</p>
          <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #1c1917; background: #f5f5f4; padding: 16px; border-radius: 8px; display: inline-block; margin: 12px 0;">
            ${otpCode}
          </div>
          <p style="color: #574c43; font-size: 12px; margin-top: 16px;">This OTP will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send 6-Digit Workspace Registration Verification Email
 */
const sendRegistrationVerificationEmail = async (userEmail, code) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: getFromAddress(),
    to: userEmail,
    subject: 'Verify Your Email to Create Your GrownX CRM Workspace',
    text: `Your workspace registration verification code is ${code}. This code is valid for 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1c1917; margin: 0; font-size: 24px;">GrownX CRM</h2>
          <p style="color: #44403c; font-size: 14px; margin-top: 4px;">Workspace Registration Email Verification</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #44403c; font-size: 14px; margin-bottom: 16px;">Thank you for registering a new GrownX CRM workspace! Please use the 6-digit verification code below to verify your email address:</p>
          <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #b45309; background: #fffbeb; border: 1px solid #fef3c7; padding: 16px; border-radius: 8px; display: inline-block; margin: 12px 0;">
            ${code}
          </div>
          <p style="color: #574c43; font-size: 12px; margin-top: 16px;">This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Workspace Invitation Email
 */
const sendInvitationEmail = async (invitedEmail, companyName, invitationToken, inviterName) => {
  const transporter = createTransporter();
  const inviteUrl = `${process.env.ALLOWED_ORIGINS || 'http://localhost:4200'}/accept-invitation?token=${invitationToken}`;

  const mailOptions = {
    from: getFromAddress(),
    to: invitedEmail,
    subject: `You have been invited to join ${companyName} on GrownX CRM`,
    text: `${inviterName || 'A team owner'} invited you to join ${companyName} on GrownX CRM. Accept invitation link: ${inviteUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1c1917; margin: 0; font-size: 24px;">GrownX CRM</h2>
          <p style="color: #44403c; font-size: 14px; margin-top: 4px;">Workspace Team Invitation</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #44403c; font-size: 14px; margin-bottom: 16px;"><strong>${inviterName || 'Workspace Admin'}</strong> invited you to join the team workspace for <strong>${companyName}</strong>.</p>
          <div style="margin: 24px 0;">
            <a href="${inviteUrl}" style="background: #1c1917; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 14px;">Accept Invitation & Join Team →</a>
          </div>
          <p style="color: #574c43; font-size: 12px; margin-top: 16px;">This invitation is valid for <strong>7 days</strong>.</p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Customer Purchase Invoice & License Download Link Email
 */
const sendCustomerInvoiceEmail = async ({ email, name, planName, amount, currency, paymentId, licenseKey }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: `Official Purchase Invoice & Software License Key - GrownX CRM (${planName})`,
    text: `Thank you for your purchase of GrownX CRM ${planName}. License Key: ${licenseKey}. Payment ID: ${paymentId}.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-b: 2px solid #e7e5e4; padding-bottom: 16px; margin-bottom: 24px;">
          <div>
            <h1 style="color: #1c1917; margin: 0; font-size: 26px;">GrownX CRM</h1>
            <p style="color: #b45309; font-size: 12px; font-weight: bold; margin-top: 2px;">COMMERCIAL SOFTWARE LICENSE</p>
          </div>
          <div style="text-align: right;">
            <p style="color: #44403c; font-size: 12px; margin: 0;">Date: ${new Date().toLocaleDateString('en-IN')}</p>
            <p style="color: #1c1917; font-size: 12px; font-weight: bold; margin: 2px 0 0 0;">Payment ID: ${paymentId}</p>
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #1c1917; margin-top: 0;">Hi ${name},</h3>
          <p style="color: #44403c; font-size: 14px; leading-height: 1.6;">Thank you for purchasing <strong>GrownX CRM (${planName})</strong>! Your payment has been successfully processed and verified.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
              <tr style="background: #f5f5f4; text-align: left;">
                <th style="padding: 10px; border-bottom: 1px solid #e7e5e4;">Product Item</th>
                <th style="padding: 10px; border-bottom: 1px solid #e7e5e4; text-align: right;">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px 10px; border-bottom: 1px solid #e7e5e4; font-weight: bold; color: #1c1917;">GrownX CRM - ${planName} (Lifetime Standalone License)</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #e7e5e4; text-align: right; font-weight: bold; color: #1c1917;">₹${amount} ${currency}</td>
              </tr>
            </tbody>
          </table>

          <div style="background: #1c1917; color: #ffffff; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #d6d3d1; margin: 0 0 6px 0;">YOUR OFFICIAL LICENSE KEY</p>
            <p style="font-size: 20px; font-weight: 900; font-family: monospace; letter-spacing: 2px; color: #f59e0b; margin: 0;">${licenseKey}</p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://crm-project-wheat-seven.vercel.app/dashboard" style="background: #b45309; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 14px;">Access & Download Software Package →</a>
          </div>
        </div>

        <div style="text-align: center; color: #574c43; font-size: 12px; line-height: 1.5;">
          <p style="margin: 4px 0;">GrownX Technologies • Support Email: <a href="mailto:grownxcrm@gmail.com" style="color: #b45309;">grownxcrm@gmail.com</a></p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Sales Alert Receipt Email to Owner
 */
const sendOwnerSalesAlertEmail = async ({ buyerName, buyerEmail, planName, amount, currency, paymentId, licenseKey }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: getFromAddress(),
    to: process.env.SMTP_USER || 'grownxcrm@gmail.com',
    subject: `🚨 NEW SALE ALERT: ₹${amount} Received for ${planName} from ${buyerName}`,
    text: `New sale completed! Buyer: ${buyerName} (${buyerEmail}). Plan: ${planName}. Amount: ₹${amount}. Payment ID: ${paymentId}. License: ${licenseKey}.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1c1917; color: #ffffff; border-radius: 16px; padding: 32px;">
        <div style="border-b: 1px solid #44403c; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #f59e0b; margin: 0;">🎉 New Sale Payment Received!</h2>
          <p style="color: #a8a29e; font-size: 13px; margin-top: 4px;">GrownX CRM Commercial Store Notification</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #a8a29e;">Customer Name:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #ffffff; text-align: right;">${buyerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a8a29e;">Customer Email:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #38bdf8; text-align: right;">${buyerEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a8a29e;">Plan Purchased:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #f59e0b; text-align: right;">${planName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a8a29e;">Amount Paid:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #4ade80; text-align: right; font-size: 18px;">₹${amount} ${currency}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a8a29e;">Payment ID:</td>
            <td style="padding: 8px 0; font-family: monospace; color: #d6d3d1; text-align: right;">${paymentId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a8a29e;">License Key Generated:</td>
            <td style="padding: 8px 0; font-family: monospace; color: #f59e0b; text-align: right; font-weight: bold;">${licenseKey}</td>
          </tr>
        </table>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Generic Outbound CRM Email Sender with Custom Workspace Identity support
 */
const sendOutboundEmail = async ({ to, subject, html, text, attachments, fromName, fromEmail }) => {
  const transporter = createTransporter();
  
  const senderEmail = fromEmail || process.env.SMTP_FROM || process.env.SMTP_USER || 'grownxcrm@gmail.com';
  const senderName = fromName || 'GrownX CRM';
  const fromFormatted = `"${senderName}" <${senderEmail}>`;

  const mailOptions = {
    from: fromFormatted,
    to,
    subject,
    text: text || (html ? html.replace(/<[^>]*>?/gm, '') : ''),
    html: html || `<p>${text}</p>`,
    attachments: attachments || [],
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] Message sent to ${to}. ID: ${result.messageId}`);
    return result;
  } catch (err) {
    console.error(`[EMAIL SERVICE ERROR] Failed to deliver email to ${to}:`, err.message);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
};

module.exports = {
  sendOtpEmail,
  sendRegistrationVerificationEmail,
  sendInvitationEmail,
  sendCustomerInvoiceEmail,
  sendOwnerSalesAlertEmail,
  sendOutboundEmail,
};
