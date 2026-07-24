const Form = require('../models/Form');
const FormSubmission = require('../models/FormSubmission');
const Survey = require('../models/Survey');
const SurveySubmission = require('../models/SurveySubmission');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

// FORMS
const getForms = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const forms = await Form.find(tenantFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: forms.length, data: forms });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const createForm = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, fields, themeSettings, submissionAction } = req.body;
    const form = await Form.create({
      name,
      fields,
      themeSettings,
      submissionAction: submissionAction || 'Create Lead',
      tenant: tenantId,
    });
    res.status(201).json({ success: true, data: form });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const updateForm = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const updateData = { ...req.body };
    delete updateData.tenant;

    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter },
      updateData,
      { new: true, runValidators: true }
    );
    if (!form) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }
    res.json({ success: true, data: form });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const deleteForm = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const form = await Form.findOneAndDelete({ _id: req.params.id, ...tenantFilter });
    if (!form) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const submitForm = async (req, res) => {
  try {
    const { formData } = req.body;
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }

    const formTenantId = form.tenant;
    let createdEntityId = null;
    const emailKey = Object.keys(formData).find(k => k.toLowerCase().includes('email')) || 'Email';
    const phoneKey = Object.keys(formData).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('number')) || 'Phone';
    const nameKey = Object.keys(formData).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('person')) || 'Name';
    const messageKey = Object.keys(formData).find(k => k.toLowerCase().includes('message') || k.toLowerCase().includes('text') || k.toLowerCase().includes('subject')) || 'Message';

    const entityName = formData[nameKey] || 'Web Form Contact';
    const entityEmail = formData[emailKey] || `contact_${Date.now()}@test.com`;
    const entityPhone = formData[phoneKey] || '555-0199';

    if (form.submissionAction === 'Create Lead') {
      const notesArr = req.user ? [{ content: `Submitted form: ${form.name}. Raw data: ${JSON.stringify(formData)}`, createdBy: req.user._id }] : [];
      const lead = await Lead.create({
        company: entityName,
        contactName: entityName,
        email: entityEmail,
        phone: entityPhone,
        leadSource: 'Web Form',
        stage: 'New',
        notes: notesArr,
        tenant: formTenantId,
      });
      createdEntityId = lead._id;
    } else if (form.submissionAction === 'Create Customer') {
      const customer = await Customer.create({
        companyName: `${entityName} (Company)`,
        contactPerson: entityName,
        email: entityEmail,
        phone: entityPhone,
        status: 'Active',
        tenant: formTenantId,
      });
      createdEntityId = customer._id;
    } else if (form.submissionAction === 'Create Ticket') {
      const ticket = await Ticket.create({
        title: `Web Form Ticket: ${formData[messageKey] ? formData[messageKey].substring(0, 30) : 'Support Request'}`,
        description: `Raw data submitted: ${JSON.stringify(formData)}`,
        status: 'Open',
        priority: 'Medium',
        tenant: formTenantId,
      });
      createdEntityId = ticket._id;
    }

    const submission = await FormSubmission.create({
      form: form._id,
      data: formData,
      createdEntityId,
      tenant: formTenantId,
    });

    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    console.error('submitForm Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

const getFormSubmissions = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const submissions = await FormSubmission.find({ form: req.params.id, ...tenantFilter })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// SURVEYS
const getSurveys = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const surveys = await Survey.find(tenantFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: surveys.length, data: surveys });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const createSurvey = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, type, questions } = req.body;
    const survey = await Survey.create({
      name,
      type,
      questions,
      tenant: tenantId,
    });
    res.status(201).json({ success: true, data: survey });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const updateSurvey = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const updateData = { ...req.body };
    delete updateData.tenant;

    const survey = await Survey.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter },
      updateData,
      { new: true, runValidators: true }
    );
    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }
    res.json({ success: true, data: survey });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const deleteSurvey = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const survey = await Survey.findOneAndDelete({ _id: req.params.id, ...tenantFilter });
    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }
    res.json({ success: true, message: 'Survey deleted successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const submitSurvey = async (req, res) => {
  try {
    const { respondentEmail, answers, score, npsScore } = req.body;
    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const submission = await SurveySubmission.create({
      survey: survey._id,
      respondentEmail,
      answers,
      score: score || 0,
      npsScore: npsScore !== undefined ? npsScore : undefined,
      tenant: survey.tenant,
    });

    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getSurveyAnalytics = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const surveyId = req.params.id;
    const submissions = await SurveySubmission.find({ survey: surveyId, ...tenantFilter });

    let promoter = 0, detractor = 0, passive = 0;
    let totalScore = 0;
    let npsCount = 0;

    submissions.forEach(sub => {
      if (sub.npsScore !== undefined) {
        npsCount++;
        if (sub.npsScore >= 9) promoter++;
        else if (sub.npsScore <= 6) detractor++;
        else passive++;
      }
      totalScore += sub.score || 0;
    });

    const npsScoreCalculated = npsCount > 0 ? Math.round(((promoter - detractor) / npsCount) * 100) : 0;
    const avgScore = submissions.length > 0 ? (totalScore / submissions.length).toFixed(2) : 0;

    res.json({
      success: true,
      analytics: {
        totalSubmissions: submissions.length,
        npsScore: npsScoreCalculated,
        npsBreakdown: { promoter, passive, detractor },
        averageQuizScore: parseFloat(avgScore),
      },
      submissions
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getForms,
  createForm,
  updateForm,
  deleteForm,
  submitForm,
  getFormSubmissions,
  getSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  submitSurvey,
  getSurveyAnalytics,
};
