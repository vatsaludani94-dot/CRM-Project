const express = require('express');
const router = express.Router();
const {
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
  getWebsiteAssistantResponse
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Public route for website chatbot assistant
router.post('/website-assistant', getWebsiteAssistantResponse);

router.use(protect);

router.post('/classify', classifyText);
router.post('/priority', detectPriority);
router.post('/suggest-reply', suggestReply);
router.post('/score-lead', scoreLead);
router.post('/analyze-call', analyzeCall);
router.post('/social-reply', generateSocialReply);
router.post('/analyze-meeting', analyzeMeetingTranscript);
router.post('/assess-deal-risk', assessDealRisk);
router.get('/pipeline-forecast', getPipelineForecast);
router.get('/business-insights', getBusinessInsights);

module.exports = router;

