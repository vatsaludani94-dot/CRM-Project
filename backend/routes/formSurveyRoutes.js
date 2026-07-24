const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/formSurveyController');
const { protect } = require('../middleware/authMiddleware');

// Public form submission endpoints (do not require auth token)
router.post('/forms/:id/submit', submitForm);
router.post('/surveys/:id/submit', submitSurvey);

// Authenticated management endpoints
router.use(protect);

// Forms routes
router.get('/forms', getForms);
router.post('/forms', createForm);
router.put('/forms/:id', updateForm);
router.delete('/forms/:id', deleteForm);
router.get('/forms/:id/submissions', getFormSubmissions);

// Surveys routes
router.get('/surveys', getSurveys);
router.post('/surveys', createSurvey);
router.put('/surveys/:id', updateSurvey);
router.delete('/surveys/:id', deleteSurvey);
router.get('/surveys/:id/analytics', getSurveyAnalytics);

module.exports = router;
