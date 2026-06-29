const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Existing Models
const User = require('../models/User');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Ticket = require('../models/Ticket');
const Payroll = require('../models/Payroll');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Appointment = require('../models/Appointment');

// SaaS & Feature Expansion Models
const Tenant = require('../models/Tenant');
const Workflow = require('../models/Workflow');
const WorkflowLog = require('../models/WorkflowLog');
const EmailMessage = require('../models/EmailMessage');
const DriveFolder = require('../models/DriveFolder');
const DriveFile = require('../models/DriveFile');
const Website = require('../models/Website');
const Funnel = require('../models/Funnel');
const Form = require('../models/Form');
const FormSubmission = require('../models/FormSubmission');
const Survey = require('../models/Survey');
const SurveySubmission = require('../models/SurveySubmission');
const SmsCampaign = require('../models/SmsCampaign');
const Task = require('../models/Task');
const Channel = require('../models/Channel');
const ChatMessage = require('../models/ChatMessage');
const Document = require('../models/Document');

const seedData = async () => {
  try {
    console.log('Seeding GrownX CRM expanded demo database started...');
    
    // Clear all existing collections
    await Tenant.deleteMany({});
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Lead.deleteMany({});
    await Ticket.deleteMany({});
    await Payroll.deleteMany({});
    await Activity.deleteMany({});
    await Notification.deleteMany({});
    await Appointment.deleteMany({});
    await Workflow.deleteMany({});
    await WorkflowLog.deleteMany({});
    await EmailMessage.deleteMany({});
    await DriveFolder.deleteMany({});
    await DriveFile.deleteMany({});
    await Website.deleteMany({});
    await Funnel.deleteMany({});
    await Form.deleteMany({});
    await FormSubmission.deleteMany({});
    await Survey.deleteMany({});
    await SurveySubmission.deleteMany({});
    await SmsCampaign.deleteMany({});
    await Task.deleteMany({});
    await Channel.deleteMany({});
    await ChatMessage.deleteMany({});
    await Document.deleteMany({});
    
    console.log('Cleared all collections.');

    // 1. Create the 6 Demo Organizations (SaaS Tenants)
    const tenants = await Tenant.create([
      {
        name: 'GrownX Technologies',
        subdomain: 'grownox',
        plan: 'enterprise',
        status: 'active',
        whiteLabelSettings: {
          logo: '/assets/grownox-logo.png',
          customDomain: 'grownox.com',
          primaryColor: '#6366f1',
          secondaryColor: '#0f172a'
        }
      },
      {
        name: 'Stark Industries',
        subdomain: 'stark',
        plan: 'enterprise',
        status: 'active',
        whiteLabelSettings: {
          logo: '/assets/stark-logo.png',
          customDomain: 'starkindustries.com',
          primaryColor: '#ef4444',
          secondaryColor: '#1e293b'
        }
      },
      {
        name: 'Acme Technologies',
        subdomain: 'acme',
        plan: 'growth',
        status: 'active',
        whiteLabelSettings: {
          logo: '/assets/acme-logo.png',
          customDomain: 'acmetechnologies.com',
          primaryColor: '#10b981',
          secondaryColor: '#0f172a'
        }
      },
      {
        name: 'Wayne Enterprises',
        subdomain: 'wayne',
        plan: 'enterprise',
        status: 'active',
        whiteLabelSettings: {
          logo: '/assets/wayne-logo.png',
          customDomain: 'waynecorp.com',
          primaryColor: '#3b82f6',
          secondaryColor: '#111827'
        }
      },
      {
        name: 'Oceanic Logistics',
        subdomain: 'oceanic',
        plan: 'free',
        status: 'active',
        whiteLabelSettings: {
          logo: '/assets/oceanic-logo.png',
          customDomain: 'oceaniclogistics.com',
          primaryColor: '#f59e0b',
          secondaryColor: '#1e293b'
        }
      },
      {
        name: 'Nova Healthcare',
        subdomain: 'nova',
        plan: 'enterprise',
        status: 'active',
        whiteLabelSettings: {
          logo: '/assets/nova-logo.png',
          customDomain: 'novahealthcare.com',
          primaryColor: '#ec4899',
          secondaryColor: '#0f172a'
        }
      }
    ]);

    const grownxTenant = tenants[0];
    const starkTenant = tenants[1];
    const acmeTenant = tenants[2];
    const wayneTenant = tenants[3];
    const oceanicTenant = tenants[4];
    const novaTenant = tenants[5];

    console.log('Created the 6 Demo Organizations (Tenants) successfully.');

    // 2. Create Default Users (linked to the GrownX Technologies Tenant)
    const salt = await bcrypt.genSalt(10);

    const users = await User.create([
      {
        name: 'Grownox Super Admin',
        email: 'admin@grownox.com',
        password: 'admin123',
        role: 'super_admin',
        department: 'Management',
        status: 'active',
        tenant: grownxTenant._id,
        googleDriveLinked: true,
        gmailOAuth: {
          accessToken: 'mock_admin_access_token',
          refreshToken: 'mock_admin_refresh_token',
          emailSyncActive: true,
          connectedEmail: 'admin@grownox.com',
        }
      },
      {
        name: 'Sarah Sales Manager',
        email: 'manager@grownox.com',
        password: 'manager123',
        role: 'manager',
        department: 'Sales',
        status: 'active',
        tenant: grownxTenant._id,
      },
      {
        name: 'John Sales Rep',
        email: 'employee@grownox.com',
        password: 'employee123',
        role: 'employee',
        department: 'Sales',
        status: 'active',
        tenant: grownxTenant._id,
      },
      {
        name: 'Alice HR & Support Representative',
        email: 'alice@grownox.com',
        password: 'employee123',
        role: 'employee',
        department: 'Customer Support',
        status: 'active',
        tenant: grownxTenant._id,
      },
      {
        name: 'Robert Customer User',
        email: 'customer@grownox.com',
        password: 'customer123',
        role: 'customer',
        department: 'None',
        status: 'active',
        tenant: grownxTenant._id,
      },
      {
        name: 'Marcus Company Owner',
        email: 'owner@grownox.com',
        password: 'owner123',
        role: 'manager',
        department: 'Management',
        status: 'active',
        tenant: grownxTenant._id,
      }
    ]);

    const admin = users[0];
    const manager = users[1];
    const employeeSales = users[2];
    const employeeSupport = users[3];
    const customerUser = users[4];
    const owner = users[5];

    console.log('Created the 6 Demo Users linked to GrownX Technologies.');

    // 3. Create Customer Profiles (linked to the main GrownX Technologies workspace)
    const customers = await Customer.create([
      {
        customerCode: 'CUST-STARK',
        companyName: 'Stark Industries',
        contactPerson: 'Pepper Potts',
        email: 'pepper@starkindustries.com',
        phone: '+1 555 300 1000',
        address: { street: '10880 Malibu Point', city: 'Malibu', state: 'CA', zipCode: '90265', country: 'USA' },
        industry: 'Defense & Aerospace',
        assignedEmployee: employeeSales._id,
        status: 'VIP',
        revenueGenerated: 350000,
        tenant: grownxTenant._id,
        notes: [
          { content: 'Interested in AI-based workflow nodes and security sync.', createdBy: owner._id }
        ],
        activities: [
          { type: 'Lead Converted', description: 'Stark Industries converted from pipeline into VIP Customer.', performedBy: employeeSales._id }
        ],
        leadHistory: [
          { stage: 'New', changedBy: employeeSales._id },
          { stage: 'Converted', changedBy: employeeSales._id }
        ]
      },
      {
        customerCode: 'CUST-ACME',
        companyName: 'Acme Technologies',
        contactPerson: 'Arthur Dent',
        email: 'arthur@acmetechnologies.com',
        phone: '+1 555 123 4567',
        address: { street: '42 Galaxy Way', city: 'Boston', state: 'MA', zipCode: '02108', country: 'USA' },
        industry: 'Software & Technology',
        assignedEmployee: employeeSales._id,
        status: 'Active',
        revenueGenerated: 125000,
        tenant: grownxTenant._id,
        notes: [
          { content: 'Reviewing proposal for custom webhook automations.', createdBy: manager._id }
        ],
        activities: [
          { type: 'Lead Converted', description: 'Acme Technologies converted after quote approval.', performedBy: employeeSales._id }
        ],
        leadHistory: [
          { stage: 'New', changedBy: employeeSales._id },
          { stage: 'Converted', changedBy: employeeSales._id }
        ]
      },
      {
        customerCode: 'CUST-WAYNE',
        companyName: 'Wayne Enterprises',
        contactPerson: 'Lucius Fox',
        email: 'fox@waynecorp.com',
        phone: '+1 555 400 2000',
        address: { street: '1007 Mountain Drive', city: 'Gotham', state: 'NJ', zipCode: '07001', country: 'USA' },
        industry: 'Conglomerate & Technology',
        assignedEmployee: owner._id,
        status: 'VIP',
        revenueGenerated: 480000,
        tenant: grownxTenant._id,
        notes: [
          { content: 'Wants multi-tenant isolation configuration checked.', createdBy: owner._id }
        ],
        activities: [
          { type: 'Lead Converted', description: 'Wayne Enterprises deal successfully closed.', performedBy: owner._id }
        ],
        leadHistory: [
          { stage: 'New', changedBy: owner._id },
          { stage: 'Converted', changedBy: owner._id }
        ]
      },
      {
        customerCode: 'CUST-OCEANIC',
        companyName: 'Oceanic Logistics',
        contactPerson: 'Jack Shephard',
        email: 'jack@oceaniclogistics.com',
        phone: '+1 555 815 0108',
        address: { street: '23 Airport Road', city: 'Los Angeles', state: 'CA', zipCode: '90001', country: 'USA' },
        industry: 'Transportation & Shipping',
        assignedEmployee: employeeSales._id,
        status: 'Active',
        revenueGenerated: 85000,
        tenant: grownxTenant._id,
        notes: [],
        activities: [],
        leadHistory: []
      },
      {
        customerCode: 'CUST-NOVA',
        companyName: 'Nova Healthcare',
        contactPerson: 'Helen Cho',
        email: 'cho@novahealthcare.com',
        phone: '+82 2 1234 5678',
        address: { street: '15 Medical Valley', city: 'Seoul', country: 'South Korea' },
        industry: 'Healthcare & Pharma',
        assignedEmployee: admin._id,
        status: 'VIP',
        revenueGenerated: 600000,
        tenant: grownxTenant._id,
        notes: [],
        activities: [],
        leadHistory: []
      }
    ]);

    console.log('Created customer profiles for Stark, Acme, Wayne, Oceanic, and Nova.');

    // 4. Create Leads (Active Deals in the Kanban Pipeline)
    const leads = await Lead.create([
      {
        company: 'Stark Industries',
        contactName: 'Pepper Potts',
        email: 'pepper@starkindustries.com',
        phone: '+1 555 300 1000',
        leadSource: 'Referral',
        expectedRevenue: 300000,
        stage: 'Interested',
        assignedEmployee: employeeSales._id,
        aiScore: 92,
        tenant: grownxTenant._id,
        notes: [{ content: 'High interest in server licensing.', createdBy: employeeSales._id }]
      },
      {
        company: 'Wayne Enterprises',
        contactName: 'Lucius Fox',
        email: 'fox@waynecorp.com',
        phone: '+1 555 400 2000',
        leadSource: 'Partner',
        expectedRevenue: 180000,
        stage: 'Negotiation',
        assignedEmployee: employeeSales._id,
        aiScore: 85,
        tenant: grownxTenant._id,
        notes: [{ content: 'Discussing terms for security pipelines.', createdBy: owner._id }]
      },
      {
        company: 'Oceanic Logistics',
        contactName: 'Jack Shephard',
        email: 'jack@oceaniclogistics.com',
        phone: '+1 555 815 0108',
        leadSource: 'Website',
        expectedRevenue: 95000,
        stage: 'Contacted',
        assignedEmployee: employeeSales._id,
        aiScore: 65,
        tenant: grownxTenant._id,
      },
      {
        company: 'Nova Healthcare',
        contactName: 'Helen Cho',
        email: 'cho@novahealthcare.com',
        phone: '+82 2 1234 5678',
        leadSource: 'Email Campaign',
        expectedRevenue: 450000,
        stage: 'Proposal Sent',
        assignedEmployee: owner._id,
        aiScore: 80,
        tenant: grownxTenant._id,
      }
    ]);

    console.log('Created active leads and deals.');

    // 5. Create Support Tickets
    const tickets = await Ticket.create([
      {
        ticketCode: 'TKT-10823',
        title: 'Unable to process payment updates',
        description: 'System throws 500 error when clicking on credit card verification step during onboarding.',
        category: 'Billing & Payments',
        priority: 'High',
        status: 'In Progress',
        customer: customers[1]._id, // Acme
        assignedEmployee: employeeSupport._id,
        tenant: grownxTenant._id,
      },
      {
        ticketCode: 'TKT-29801',
        title: 'Server downtime alert in EU-Central',
        description: 'Critical database latency spikes. API response time is above 4000ms.',
        category: 'Database & Infrastructure',
        priority: 'Critical',
        status: 'Open',
        customer: customers[0]._id, // Stark
        tenant: grownxTenant._id,
      },
      {
        ticketCode: 'TKT-70491',
        title: 'Custom report export CSV missing columns',
        description: 'Exporting Customer Report leaves out the assignedEmployee column.',
        category: 'Reporting & Analytics',
        priority: 'Low',
        status: 'Resolved',
        customer: customers[2]._id, // Wayne
        assignedEmployee: employeeSupport._id,
        tenant: grownxTenant._id,
      }
    ]);

    console.log('Created support tickets.');

    // 6. Create Payroll History
    await Payroll.create([
      {
        employee: employeeSales._id,
        month: '2026-05',
        baseSalary: 4500,
        bonus: 1250,
        deductions: 350,
        status: 'Paid',
        paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        tenant: grownxTenant._id,
      },
      {
        employee: employeeSupport._id,
        month: '2026-05',
        baseSalary: 4200,
        bonus: 300,
        deductions: 200,
        status: 'Paid',
        paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        tenant: grownxTenant._id,
      }
    ]);

    // 7. Create Appointments
    await Appointment.create([
      {
        subject: 'Q3 License Review',
        description: 'Sync with Arthur Dent to discuss multi-year licenses.',
        appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        startTime: '10:00',
        endTime: '11:00',
        status: 'Scheduled',
        customer: customers[1]._id,
        host: employeeSales._id,
      },
      {
        subject: 'Nova Tech Integration Sync',
        description: 'Technical call to assist with setting up webhooks.',
        appointmentDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        startTime: '14:30',
        endTime: '15:30',
        status: 'Scheduled',
        customer: customers[4]._id,
        host: owner._id,
      }
    ]);

    // 8. Create Visual Workflows
    const workflowWelcome = await Workflow.create({
      name: 'Welcome Sequence Workflow',
      trigger: 'Lead Created',
      isActive: true,
      tenant: grownxTenant._id,
      steps: [
        { type: 'Delay', config: { delayDuration: 1, delayUnit: 'minutes' } },
        { type: 'Action', config: { actionType: 'Send Email', emailSubject: 'Welcome to GrownX!', emailBody: 'Hi there, welcome!' } }
      ]
    });

    // 9. Create Website & Funnel Templates
    await Website.create([
      {
        name: 'GrownX Main Corporate Website',
        subdomain: 'grownox',
        domain: 'grownox.com',
        published: true,
        template: 'SaaS',
        seo: { title: 'GrownX Technologies', description: 'CRM SaaS Suite', keywords: 'CRM' },
        tenant: grownxTenant._id,
        sections: [
          {
            type: 'Hero',
            title: 'Visual Automation Built for Scale',
            subtitle: 'Close deals faster with a visual workflow builder, Gmail OAuth sync, and documents management.',
            content: { buttonText: 'Start Free Trial', buttonLink: '/register' }
          }
        ]
      }
    ]);

    await Funnel.create([
      {
        name: 'Enterprise Leads Funnel',
        template: 'Lead Generation Funnel',
        tenant: grownxTenant._id,
        steps: [
          { name: 'Optin landing page', path: '/optin' },
          { name: 'Onboarding survey', path: '/survey' }
        ],
        stats: { visitors: 2500, leads: 520, appointments: 110, conversionRate: 20.8, revenue: 15400 }
      }
    ]);

    // 10. Forms and Surveys
    const contactForm = await Form.create({
      name: 'Corporate Intake Form',
      tenant: grownxTenant._id,
      submissionAction: 'Create Lead',
      fields: [
        { type: 'Text', label: 'Company Name', required: true },
        { type: 'Email', label: 'Email Address', required: true }
      ]
    });

    await FormSubmission.create({
      form: contactForm._id,
      tenant: grownxTenant._id,
      data: { 'Company Name': 'Stark Industries', 'Email Address': 'pepper@starkindustries.com' }
    });

    const survey = await Survey.create({
      name: 'Customer Satisfaction Q2',
      type: 'Feedback',
      tenant: grownxTenant._id,
      questions: [
        { type: 'Rating (1-5)', text: 'How do you rate GrownX CRM support?' }
      ]
    });

    await SurveySubmission.create({
      survey: survey._id,
      respondentEmail: 'pepper@starkindustries.com',
      tenant: grownxTenant._id,
      answers: [{ questionIndex: 0, questionText: 'How do you rate GrownX CRM support?', answerText: '5' }]
    });

    // 11. Chat Channels
    const generalChannel = await Channel.create({
      name: 'general',
      description: 'GrownX general channel',
      members: [admin._id, manager._id, employeeSales._id, employeeSupport._id, owner._id],
      tenant: grownxTenant._id
    });

    await ChatMessage.create([
      { channel: generalChannel._id, sender: admin._id, messageText: 'Welcome to the GrownX Technologies command channel!', tenant: grownxTenant._id }
    ]);

    // 12. Documents
    await Document.create([
      {
        name: 'Service SLA: Stark Industries Implementation',
        type: 'Proposal',
        status: 'Approved',
        customer: customers[0]._id, // Stark
        tenant: grownxTenant._id,
        metadata: { subtotalAmount: 350000, taxRate: 5, taxAmount: 17500, netAmount: 367500, aiSummary: 'SLA for Stark custom systems integration.' }
      }
    ]);

    // 13. Drive Folder
    const rootFolder = await DriveFolder.create({
      name: 'Stark Industries (CUST-STARK)',
      type: 'Customer',
      referenceId: customers[0]._id,
      tenant: grownxTenant._id
    });
    
    await DriveFolder.create({
      name: 'Contracts',
      type: 'Customer',
      referenceId: customers[0]._id,
      parentFolder: rootFolder._id,
      tenant: grownxTenant._id
    });

    // 14. Tasks
    await Task.create({
      title: 'Review Acme contract integration webhooks',
      description: 'Setup standard callback checks.',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      priority: 'High',
      status: 'In Progress',
      assignedTo: employeeSales._id,
      customer: customers[1]._id,
      tenant: grownxTenant._id
    });

    console.log('Database seeding successfully completed with 6 demo organizations!');
    
  } catch (error) {
    console.error('Error seeding database: ', error);
    process.exit(1);
  }
};

// If run directly
if (require.main === module) {
  const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus';
  mongoose
    .connect(dbUri)
    .then(() => {
      console.log('Connected to MongoDB for seeding.');
      return seedData();
    })
    .then(() => {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB after seeding.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedData;
