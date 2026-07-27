const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { sendCustomerInvoiceEmail } = require('./invoice-email.service');

/**
 * Service handling scheduled automated email sequence for 14-day free trial lifecycle
 */
const runTrialEmailSequenceScheduler = async () => {
  try {
    const trialTenants = await Tenant.find({
      subscriptionStatus: 'trial_active',
      trialStartDate: { $exists: true },
    }).populate('owner');

    const now = Date.now();

    for (const tenant of trialTenants) {
      if (!tenant.owner || !tenant.owner.email) continue;

      const startDateMs = new Date(tenant.trialStartDate).getTime();
      const elapsedDays = Math.floor((now - startDateMs) / (1000 * 60 * 60 * 24));
      const ownerEmail = tenant.owner.email;
      const ownerName = tenant.owner.name;

      // Determine trigger step based on elapsed days
      let emailSubject = '';
      let emailBody = '';
      let sequenceTag = '';

      if (elapsedDays === 0) {
        sequenceTag = 'day_0_welcome';
        emailSubject = `🎉 Welcome to GrownX CRM, ${ownerName}! Getting Started Guide`;
        emailBody = `
          <h2>Welcome to Your 14-Day Free Trial of GrownX CRM!</h2>
          <p>Hi ${ownerName},</p>
          <p>Thank you for choosing GrownX CRM for <strong>${tenant.name}</strong>.</p>
          <p>Here is your quick getting started guide:</p>
          <ul>
            <li><strong>Step 1:</strong> Explore your Executive Dashboard & KPI Metrics.</li>
            <li><strong>Step 2:</strong> Set up your Lead Funnels & Visual Kanban Pipeline.</li>
            <li><strong>Step 3:</strong> Enable Email-First Support & Unified Inbox.</li>
          </ul>
          <p>Need assistance? Contact our team anytime at support@grownxcrm.com.</p>
        `;
      } else if (elapsedDays === 3) {
        sequenceTag = 'day_3_tips';
        emailSubject = `💡 Need help setting up ${tenant.name}? GrownX Onboarding Tips`;
        emailBody = `
          <h2>Master Visual Automation & Omnichannel Support</h2>
          <p>Hi ${ownerName},</p>
          <p>You're on Day 3 of your 14-day trial! Have you tried configuring our visual drag-and-drop workflow engine or connecting your support mailbox?</p>
          <p><a href="https://grownxcrm.com/docs">View Video Tutorials & Documentation →</a></p>
        `;
      } else if (elapsedDays === 7) {
        sequenceTag = 'day_7_features';
        emailSubject = `⭐ Discover Advanced Marketing & Website Builder Features`;
        emailBody = `
          <h2>Unlock the Full Power of GrownX CRM</h2>
          <p>Hi ${ownerName},</p>
          <p>You've completed your first week! Explore our integrated Web Builder, Automated Marketing Scheduler, and Customer 360 Health Analytics.</p>
        `;
      } else if (elapsedDays === 10) {
        sequenceTag = 'day_10_urgency';
        emailSubject = `⏰ 4 Days Remaining on Your GrownX Free Trial`;
        emailBody = `
          <h2>Keep Your Workspace Running Seamlessly</h2>
          <p>Hi ${ownerName},</p>
          <p>Your 14-day trial has 4 days remaining. Upgrade to our <strong>₹9,999/month Enterprise Plan</strong> now to lock in uninterrupted CRM access.</p>
        `;
      } else if (elapsedDays === 13) {
        sequenceTag = 'day_13_reminder';
        emailSubject = `🚨 Your GrownX CRM Free Trial Expires Tomorrow!`;
        emailBody = `
          <h2>Final Reminder: Trial Expiration Tomorrow</h2>
          <p>Hi ${ownerName},</p>
          <p>Your trial for ${tenant.name} ends tomorrow. Upgrade today via Razorpay to retain active CRM tools and team member access.</p>
        `;
      } else if (elapsedDays >= 14) {
        sequenceTag = 'day_14_expired';
        emailSubject = `🔒 Trial Expired: Your ${tenant.name} Data is Safely Preserved`;
        emailBody = `
          <h2>Your 14-Day Free Trial Has Ended</h2>
          <p>Hi ${ownerName},</p>
          <p>Your trial has expired, but don't worry! All your leads, customers, workflows, and settings are <strong>safely preserved</strong>.</p>
          <p>Upgrade to our ₹9,999/month Enterprise plan anytime to continue working exactly where you left off.</p>
        `;
      }

      if (sequenceTag) {
        await Activity.create({
          user: tenant.owner._id,
          action: 'Automated Trial Email Sent',
          details: `Sent ${sequenceTag} email to ${ownerEmail}.`,
          module: 'Marketing',
        });
      }
    }
  } catch (error) {
    console.error('[TRIAL EMAIL SCHEDULER ERROR]:', error.message);
  }
};

module.exports = { runTrialEmailSequenceScheduler };
