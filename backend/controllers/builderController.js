const Website = require('../models/Website');
const Funnel = require('../models/Funnel');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

// Website Controllers
const getWebsites = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const websites = await Website.find(tenantFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: websites.length, data: websites });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const createWebsite = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, template, seo, sections } = req.body;

    const subdomain = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    const defaultSections = sections || [
      { type: 'Hero', title: `Welcome to ${name}`, subtitle: 'Modern SaaS and Enterprise Automation platform.', content: { buttonText: 'Get Started' } },
      { type: 'Features', title: 'Enterprise Core Features', content: { list: ['Workflow Automation', 'Gmail Center', 'Collaboration Chat'] } },
      { type: 'Pricing', title: 'Simple, Flexible Pricing', content: { tiers: [{ name: 'Free', price: '$0' }, { name: 'Growth', price: '$49/mo' }, { name: 'Enterprise', price: '$199/mo' }] } },
      { type: 'Testimonials', title: 'Loved by Teams Worldwide', content: { list: [{ quote: 'GrownX changed how we track leads.', author: 'John Doe, SaaS CEO' }] } },
      { type: 'FAQ', title: 'Frequently Asked Questions', content: { items: [{ q: 'How does trial billing work?', a: 'You can trial any tier for 14 days without inputting cards.' }] } },
      { type: 'Contact', title: 'Get in Touch', content: { formLabel: 'Contact Sales' } },
      { type: 'Footer', title: `© ${new Date().getFullYear()} GrownX Technologies. All rights reserved.` }
    ];

    const website = await Website.create({
      name,
      template: template || 'SaaS',
      subdomain,
      seo: seo || { title: `${name} - Platform`, description: 'Built with GrownX Web Builder' },
      sections: defaultSections,
      tenant: tenantId,
    });

    res.status(201).json({ success: true, data: website });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const updateWebsite = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const updateData = { ...req.body };
    delete updateData.tenant;

    const website = await Website.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter },
      updateData,
      { new: true, runValidators: true }
    );
    if (!website) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }
    res.json({ success: true, data: website });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const publishWebsite = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { published, customDomain } = req.body;
    const website = await Website.findOne({ _id: req.params.id, ...tenantFilter });

    if (!website) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }

    website.published = published !== undefined ? published : true;
    if (customDomain !== undefined) {
      website.domain = customDomain.toLowerCase().trim();
    }

    await website.save();
    res.json({ success: true, data: website });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const deleteWebsite = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const website = await Website.findOneAndDelete({ _id: req.params.id, ...tenantFilter });
    if (!website) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }
    res.json({ success: true, message: 'Website deleted successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// Funnel Controllers
const getFunnels = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const funnels = await Funnel.find(tenantFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: funnels.length, data: funnels });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const createFunnel = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, template, steps } = req.body;

    const defaultSteps = steps || [
      { name: 'Opt-in Page', path: '/opt-in', content: { headline: 'Unlock Unlimited Sales Growth' } },
      { name: 'Booking Calendar', path: '/book-call', content: { headline: 'Schedule Your Growth Consultation' } },
      { name: 'Thank You', path: '/thank-you', content: { headline: 'You Are All Set!' } }
    ];

    const funnel = await Funnel.create({
      name,
      template: template || 'Lead Generation Funnel',
      steps: defaultSteps,
      tenant: tenantId,
    });

    res.status(201).json({ success: true, data: funnel });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const updateFunnel = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const updateData = { ...req.body };
    delete updateData.tenant;

    const funnel = await Funnel.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter },
      updateData,
      { new: true, runValidators: true }
    );
    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' });
    }
    res.json({ success: true, data: funnel });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const cloneFunnel = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const sourceFunnel = await Funnel.findOne({ _id: req.params.id, ...tenantFilter });
    if (!sourceFunnel) {
      return res.status(404).json({ success: false, error: 'Source funnel not found' });
    }

    const clonedFunnel = await Funnel.create({
      name: `${sourceFunnel.name} (Clone)`,
      template: sourceFunnel.template,
      steps: sourceFunnel.steps.map(step => ({
        name: step.name,
        path: step.path,
        content: step.content,
      })),
      stats: {
        visitors: 0,
        leads: 0,
        appointments: 0,
        conversionRate: 0,
        revenue: 0,
      },
      tenant: tenantId,
    });

    res.status(201).json({ success: true, data: clonedFunnel });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const trackFunnelMetric = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { metric, amount } = req.body;
    const funnel = await Funnel.findOne({ _id: req.params.id, ...tenantFilter });

    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' });
    }

    if (metric === 'visitors') funnel.stats.visitors += 1;
    else if (metric === 'leads') funnel.stats.leads += 1;
    else if (metric === 'appointments') funnel.stats.appointments += 1;
    else if (metric === 'revenue') funnel.stats.revenue += (amount || 0);

    const visitors = funnel.stats.visitors || 1;
    const leads = funnel.stats.leads || 0;
    funnel.stats.conversionRate = parseFloat(((leads / visitors) * 100).toFixed(2));

    await funnel.save();
    res.json({ success: true, data: funnel.stats });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const deleteFunnel = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const funnel = await Funnel.findOneAndDelete({ _id: req.params.id, ...tenantFilter });
    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' });
    }
    res.json({ success: true, message: 'Funnel deleted successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getWebsites,
  createWebsite,
  updateWebsite,
  publishWebsite,
  deleteWebsite,
  getFunnels,
  createFunnel,
  updateFunnel,
  cloneFunnel,
  trackFunnelMetric,
  deleteFunnel,
};
