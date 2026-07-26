const express = require('express');
const router = express.Router();
const {
  previewAudience,
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendTestEmail,
  sendCampaignNow,
  scheduleCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  unsubscribeRecipientToken,
  getMarketingAnalytics,
} = require('../controllers/marketingController');
const { protect, requireTenant } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public Unsubscribe Endpoint
router.get('/unsubscribe/:token', unsubscribeRecipientToken);

// Protected Marketing API Endpoints
router.use(protect);
router.use(requireTenant);

router.post('/audience/preview', authorize('super_admin', 'manager', 'employee', 'workspace_owner'), previewAudience);
router.get('/analytics', authorize('super_admin', 'manager', 'employee', 'workspace_owner'), getMarketingAnalytics);

router.route('/campaigns')
  .get(authorize('super_admin', 'manager', 'employee', 'workspace_owner'), getCampaigns)
  .post(authorize('super_admin', 'manager', 'employee', 'workspace_owner'), createCampaign);

router.route('/campaigns/:id')
  .get(authorize('super_admin', 'manager', 'employee', 'workspace_owner'), getCampaignById)
  .put(authorize('super_admin', 'manager', 'employee', 'workspace_owner'), updateCampaign)
  .delete(authorize('super_admin', 'manager', 'workspace_owner'), deleteCampaign);

router.post('/campaigns/:id/test', authorize('super_admin', 'manager', 'employee', 'workspace_owner'), sendTestEmail);
router.post('/campaigns/:id/send', authorize('super_admin', 'manager', 'workspace_owner'), sendCampaignNow);
router.post('/campaigns/:id/schedule', authorize('super_admin', 'manager', 'workspace_owner'), scheduleCampaign);
router.post('/campaigns/:id/pause', authorize('super_admin', 'manager', 'workspace_owner'), pauseCampaign);
router.post('/campaigns/:id/resume', authorize('super_admin', 'manager', 'workspace_owner'), resumeCampaign);
router.post('/campaigns/:id/cancel', authorize('super_admin', 'manager', 'workspace_owner'), cancelCampaign);

module.exports = router;
