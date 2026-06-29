const Form = require('../models/Form');
const FormSubmission = require('../models/FormSubmission');
const Survey = require('../models/Survey');
const SurveySubmission = require('../models/SurveySubmission');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');

// FORMS
const getForms = async (req, res) => {
  try {
    const forms = await Form.find({ tenant: req.user.tenant }).sort({ createdAt: -1 });
    res.json({ success: true, count: forms.length, data: forms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createForm = async (req, res) => {
  try {
    const { name, fields, themeSettings, submissionAction } = req.body;
    const form = await Form.create({
      name,
      fields,
      themeSettings,
      submissionAction: submissionAction || 'Create Lead',
      tenant: req.user.tenant,
    });
    res.status(201).json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateForm = async (req, res) => {
  try {
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );
    if (!form) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }
    res.json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteForm = async (req, res) => {
  try {
    const form = await Form.findOneAndDelete({ _id: req.params.id, tenant: req.user.tenant });
    if (!form) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const submitForm = async (req, res) => {
  try {
    const { formData } = req.body; // e.g. { Name: "Alice", Email: "alice@gmail.com", Phone: "12345" }
    const form = await Form.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!form) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }

    // Capture entities creation
    let createdEntityId = null;
    const emailKey = Object.keys(formData).find(k => k.toLowerCase().includes('email')) || 'Email';
    const phoneKey = Object.keys(formData).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('number')) || 'Phone';
    const nameKey = Object.keys(formData).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('person')) || 'Name';
    const messageKey = Object.keys(formData).find(k => k.toLowerCase().includes('message') || k.toLowerCase().includes('text') || k.toLowerCase().includes('subject')) || 'Message';

    const entityName = formData[nameKey] || 'Web Form Contact';
    const entityEmail = formData[emailKey] || `contact_${Date.now()}@test.com`;
    const entityPhone = formData[phoneKey] || '';

    if (form.submissionAction === 'Create Lead') {
      const lead = await Lead.create({
        name: entityName,
        email: entityEmail,
        phone: entityPhone,
        source: 'Web Form',
        stage: 'New',
        notes: `Submitted form: ${form.name}. Raw data: ${JSON.stringify(formData)}`,
        tenant: req.user.tenant,
      });
      createdEntityId = lead._id;
    } else if (form.submissionAction === 'Create Customer') {
      const customer = await Customer.create({
        companyName: `${entityName} (Company)`,
        contactPerson: entityName,
        email: entityEmail,
        phone: entityPhone,
        status: 'Active',
        tenant: req.user.tenant,
      });
      createdEntityId = customer._id;
    } else if (form.submissionAction === 'Create Ticket') {
      const ticket = await Ticket.create({
        title: `Web Form Ticket: ${formData[messageKey] ? formData[messageKey].substring(0, 30) : 'Support Request'}`,
        description: `Raw data submitted: ${JSON.stringify(formData)}`,
        status: 'Open',
        priority: 'Medium',
        tenant: req.user.tenant,
      });
      createdEntityId = ticket._id;
    }

    const submission = await FormSubmission.create({
      form: form._id,
      data: formData,
      createdEntityId,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getFormSubmissions = async (req, res) => {
  try {
    const submissions = await FormSubmission.find({ form: req.params.id, tenant: req.user.tenant })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// SURVEYS
const getSurveys = async (req, res) => {
  try {
    const surveys = await Survey.find({ tenant: req.user.tenant }).sort({ createdAt: -1 });
    res.json({ success: true, count: surveys.length, data: surveys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createSurvey = async (req, res) => {
  try {
    const { name, type, questions } = req.body;
    const survey = await Survey.create({
      name,
      type,
      questions,
      tenant: req.user.tenant,
    });
    res.status(201).json({ success: true, data: survey });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateSurvey = async (req, res) => {
  try {
    const survey = await Survey.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );
    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }
    res.json({ success: true, data: survey });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findOneAndDelete({ _id: req.params.id, tenant: req.user.tenant });
    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }
    res.json({ success: true, message: 'Survey deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const submitSurvey = async (req, res) => {
  try {
    const { respondentEmail, answers, score, npsScore } = req.body;
    const survey = await Survey.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const submission = await SurveySubmission.create({
      survey: survey._id,
      respondentEmail,
      answers,
      score: score || 0,
      npsScore: npsScore !== undefined ? npsScore : undefined,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getSurveyAnalytics = async (req, res) => {
  try {
    const surveyId = req.params.id;
    const submissions = await SurveySubmission.find({ survey: surveyId, tenant: req.user.tenant });

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
    res.status(500).json({ success: false, error: err.message });
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
