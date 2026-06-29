const EmailMessage = require('../models/EmailMessage');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');

// Mock OAuth URL generation
const getOAuthUrl = (req, res) => {
  res.json({
    success: true,
    url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=mock_client_id&redirect_uri=http://localhost:4200/email-center/callback&response_type=code&scope=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
  });
};

// Mock OAuth callback code exchange
const handleOAuthCallback = async (req, res) => {
  try {
    const { code, email } = req.body;
    
    // Simulate updating user record with connected Gmail tokens
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.gmailOAuth = {
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      emailSyncActive: true,
      connectedEmail: email || 'user@grownox.com',
    };
    await user.save();

    res.json({ success: true, data: user.gmailOAuth });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Send email (outgoing)
const sendEmail = async (req, res) => {
  try {
    const { subject, body, to, cc, bcc, customerId, leadId } = req.body;
    const user = await User.findById(req.user._id);

    const fromAddress = user.gmailOAuth?.connectedEmail || user.email;

    const email = await EmailMessage.create({
      subject,
      body,
      from: fromAddress,
      to,
      cc: cc || [],
      bcc: bcc || [],
      direction: 'outgoing',
      customer: customerId || undefined,
      lead: leadId || undefined,
      threadId: 'thread_' + Math.random().toString(36).substring(7),
      messageId: 'msg_' + Math.random().toString(36).substring(7),
      tenant: req.user.tenant,
    });

    // Log to Customer activities
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (customer) {
        customer.activities.push({
          type: 'Email',
          description: `Sent Email: "${subject}" to ${to}`,
          performedBy: req.user._id,
        });
        await customer.save();
      }
    }

    res.status(201).json({ success: true, data: email });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Track email opens (simulating pixel request)
const trackEmailOpen = async (req, res) => {
  try {
    const email = await EmailMessage.findById(req.params.id);
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email record not found' });
    }

    if (!email.tracking.opened) {
      email.tracking.opened = true;
      email.tracking.openedAt = new Date();
      await email.save();

      // Log in Customer timeline too if exists
      if (email.customer) {
        const customer = await Customer.findById(email.customer);
        if (customer) {
          customer.activities.push({
            type: 'Email',
            description: `Email Opened: "${email.subject}" by recipient.`,
            performedBy: req.user._id,
          });
          await customer.save();
        }
      }
    }

    res.json({ success: true, data: email });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Receive mock incoming email (optionally auto-creates leads)
const receiveIncomingEmail = async (req, res) => {
  try {
    const { from, to, subject, body, autoCreateLead } = req.body;

    const email = await EmailMessage.create({
      subject,
      body,
      from,
      to,
      direction: 'incoming',
      threadId: 'thread_' + Math.random().toString(36).substring(7),
      messageId: 'msg_' + Math.random().toString(36).substring(7),
      tenant: req.user.tenant,
    });

    let createdLead = null;
    if (autoCreateLead) {
      // Auto-create lead
      createdLead = await Lead.create({
        name: from.split('@')[0] || 'Incoming Email Lead',
        email: from,
        source: 'Email',
        stage: 'New',
        notes: `Automatically created from incoming email with subject: ${subject}`,
        tenant: req.user.tenant,
      });

      email.lead = createdLead._id;
      await email.save();
    }

    res.status(201).json({ success: true, data: email, createdLead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get email history for the workspace
const getEmailHistory = async (req, res) => {
  try {
    const emails = await EmailMessage.find({ tenant: req.user.tenant })
      .populate('customer', 'companyName contactPerson')
      .populate('lead', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: emails.length, data: emails });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getOAuthUrl,
  handleOAuthCallback,
  sendEmail,
  trackEmailOpen,
  receiveIncomingEmail,
  getEmailHistory,
};
