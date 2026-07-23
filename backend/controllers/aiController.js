const AIService = require('../services/aiService');
const { getTenantFilter } = require('../utils/tenantScope');

/**
 * @desc    Test Ticket Classification
 * @route   POST /api/ai/classify
 * @access  Private
 */
const classifyText = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }

    const category = await AIService.classifyTicket(title, description);
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Test Priority Detection
 * @route   POST /api/ai/priority
 * @access  Private
 */
const detectPriority = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }

    const priority = await AIService.detectPriority(title, description);
    res.json({ success: true, priority });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Test Reply Suggestions
 * @route   POST /api/ai/suggest-reply
 * @access  Private
 */
const suggestReply = async (req, res) => {
  try {
    const { title, description, category, customerName } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ success: false, error: 'Title, description, and category are required' });
    }

    const suggestions = await AIService.suggestReplies(title, description, category, customerName || 'Customer');
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Test Lead Scoring
 * @route   POST /api/ai/score-lead
 * @access  Private
 */
const scoreLead = async (req, res) => {
  try {
    const { company, contactName, leadSource, expectedRevenue, stage, notesCount } = req.body;
    if (!company || !stage) {
      return res.status(400).json({ success: false, error: 'Company and stage are required' });
    }

    const score = await AIService.scoreLead({
      company,
      contactName,
      leadSource: leadSource || 'Website',
      expectedRevenue: expectedRevenue || 0,
      stage,
      notesCount: notesCount || 0
    });

    res.json({ success: true, score });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Analyze Call Transcript (Sentiment, Summary, Action Items)
 * @route   POST /api/ai/analyze-call
 * @access  Private
 */
const analyzeCall = async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, error: 'Transcript is required' });
    }

    const analysis = await AIService.analyzeCallTranscript(transcript);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Generate AI reply to WhatsApp/Instagram message
 * @route   POST /api/ai/social-reply
 * @access  Private
 */
const generateSocialReply = async (req, res) => {
  try {
    const { platform, messageText } = req.body;
    if (!platform || !messageText) {
      return res.status(400).json({ success: false, error: 'Platform and messageText are required' });
    }

    const reply = await AIService.generateSocialAutoReply(platform, messageText);
    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Analyze meeting transcript
 * @route   POST /api/ai/analyze-meeting
 * @access  Private
 */
const analyzeMeetingTranscript = async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, error: 'Transcript is required' });
    }
    const analysis = await AIService.analyzeMeeting(transcript);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Assess risk of a specific deal/lead
 * @route   POST /api/ai/assess-deal-risk
 * @access  Private
 */
const assessDealRisk = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { leadId, name, stage, expectedRevenue, daysInactive } = req.body;
    let leadData = { name, stage, expectedRevenue, daysInactive };

    if (leadId) {
      const Lead = require('../models/Lead');
      const lead = await Lead.findOne({ _id: leadId, ...tenantFilter });
      if (lead) {
        leadData = {
          name: lead.contactName || lead.company,
          stage: lead.stage,
          expectedRevenue: lead.expectedRevenue,
          daysInactive: daysInactive || 10,
          notes: lead.notes,
        };
      }
    }

    const assessment = await AIService.detectDealRisk(leadData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Generate pipeline sales forecasting (tenant scoped)
 * @route   GET /api/ai/pipeline-forecast
 * @access  Private
 */
const getPipelineForecast = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const Lead = require('../models/Lead');
    const leads = await Lead.find({ stage: { $ne: 'Lost' }, ...tenantFilter });
    
    const leadCount = leads.length;
    const totalRevenue = leads.reduce((sum, l) => sum + (l.expectedRevenue || 0), 0);

    const forecast = await AIService.generatePipelineForecast(leadCount, totalRevenue);
    res.json({ success: true, data: forecast });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Generate executive dashboard insights (tenant scoped)
 * @route   GET /api/ai/business-insights
 * @access  Private
 */
const getBusinessInsights = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const Lead = require('../models/Lead');
    const Customer = require('../models/Customer');
    const Ticket = require('../models/Ticket');

    const activeLeads = await Lead.countDocuments({ stage: { $nin: ['Converted', 'Lost'] }, ...tenantFilter });
    const openTickets = await Ticket.countDocuments({ status: { $nin: ['Resolved', 'Closed'] }, ...tenantFilter });
    const customers = await Customer.find(tenantFilter);
    const totalRevenue = customers.reduce((sum, c) => sum + (c.revenueGenerated || 0), 0);

    const totalLeads = await Lead.countDocuments(tenantFilter);
    const convertedLeads = await Lead.countDocuments({ stage: 'Converted', ...tenantFilter });
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 42;

    const insights = await AIService.generateBusinessInsights({
      activeLeads,
      totalRevenue,
      openTickets,
      conversionRate
    });

    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

const getWebsiteAssistantResponse = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    const fs = require('fs');
    const path = require('path');
    
    let userGuide = '';
    const possiblePaths = [
      path.join(__dirname, '..', 'USER_GUIDE.md'),
      path.join(__dirname, '..', '..', 'USER_GUIDE.md'),
      path.join(process.cwd(), 'USER_GUIDE.md'),
      path.join(process.cwd(), '..', 'USER_GUIDE.md'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        userGuide = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!userGuide) {
      userGuide = "GrownX CRM is a multi-tenant CRM SaaS platform developed by GrownX Technologies. It features visual workflow builders, Gmail sync, Google Drive sync, website builders, funnel trackers, forms, surveys, SMS marketing, team chat channels, documents, proposals, AI meeting summary, and pipeline forecasting.";
    }

    if (AIService.hasApiKey()) {
      const prompt = `Question from a website visitor: "${question}". Answer this question accurately based on the user guide context below.
      
      User Guide Context:
      ${userGuide}
      
      Respond directly and helpfully. Keep the answer under 120 words. If the question is outside the scope of GrownX CRM or not mentioned in the guide, answer using normal CRM/business knowledge.`;
      
      const systemInstruction = "You are the helpful AI Help Assistant on the GrownX CRM public website. You have full knowledge of the GrownX CRM User Guide and features. Provide professional, friendly, and concise answers.";
      
      const response = await AIService.callGemini(prompt, systemInstruction);
      if (response) {
        return res.json({ success: true, answer: response });
      }
    }

    const q = question.toLowerCase();
    let answer = '';

    if (q.includes('payroll')) {
      answer = 'Yes, employees can view their personal assigned payroll statement payslips and download them as formal PDFs, while administrators and managers can configure base salary, bonuses, deductions, and release payments.';
    } else if (q.includes('role') || q.includes('credential') || q.includes('login') || q.includes('password')) {
      answer = 'GrownX CRM supports key user roles: Super Admin, Workspace Owner, Manager, Employee, and Customer.';
    } else if (q.includes('start') || q.includes('run') || q.includes('install') || q.includes('local')) {
      answer = 'To run locally: 1. Start your local MongoDB server. 2. Navigate to the backend folder and run `npm run seed` and `npm run dev`. 3. Navigate to frontend/angular-app and run `npm start` (serves on http://localhost:4200). You can also run the dev launcher `start-dev.bat` in the root folder.';
    } else if (q.includes('workflow') || q.includes('automation')) {
      answer = 'GrownX CRM features a visual HubSpot-like Workflow Builder where you can connect triggers (e.g. Lead Created, Ticket Created) to actions (e.g. Send Email, Create Task, Webhooks) and delays.';
    } else if (q.includes('price') || q.includes('pricing') || q.includes('plan')) {
      answer = 'GrownX CRM offers 3 tiers: Free Plan ($0/forever with basic Kanban and 1 workflow), Growth Plan ($49/user/month with Gmail sync and document repository), and Enterprise Plan ($199/user/month with custom subdomains, white-labeling, and advanced AI forecasting).';
    } else if (q.includes('drive') || q.includes('folder')) {
      answer = 'Our Google Drive integration automatically provisions a root folder for each customer (containing Contracts, Invoices, and Proposals subfolders) upon customer creation or lead conversion, with browser file previews and uploads.';
    } else if (q.includes('gmail') || q.includes('email')) {
      answer = 'Yes, our Gmail Integration Center supports Google OAuth authentication, syncs incoming/outgoing messages to Customer 360 timelines, supports template snippets, and tracks email opens using pixels.';
    } else if (q.includes('whatsapp') || q.includes('instagram') || q.includes('social')) {
      answer = 'GrownX CRM has built-in AI Auto-Responders for WhatsApp and Instagram. It can read incoming chats and auto-generate replies based on platform-specific rules and chosen tones (professional, playful, urgent).';
    } else if (q.includes('call') || q.includes('phone') || q.includes('transcription')) {
      answer = 'Our AI Caller Analysis integrates with calling systems (like Twilio) to record calls, transcribe audio transcripts, and extract conversation sentiments, executive summaries, and action checklists into Customer 360 profiles.';
    } else {
      answer = 'GrownX CRM is a premium SaaS ecosystem containing an enterprise CRM, marketing automation, visual workflow builder, website builder, funnel builder, AI sales assistant, and Slack-style chat channels. How can I assist you further?';
    }

    res.json({ success: true, answer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  classifyText,
  detectPriority,
  suggestReply,
  scoreLead,
  analyzeCall,
  generateSocialReply,
  analyzeMeetingTranscript,
  assessDealRisk,
  getPipelineForecast,
  getBusinessInsights,
  getWebsiteAssistantResponse,
};
