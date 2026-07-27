const express = require('express');
const router = express.Router();
const {
  getConversations,
  getConversationById,
  postConversationMessage,
  publicWebFormIntake,
  publicChatSession,
  publicChatMessage,
  convertToTicket,
  logCall,
  getSupportAnalytics,
  getSlaAndPriorityConfig,
} = require('../controllers/omnichannelController');
const { protect, requireTenant } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public Omnichannel Support Intake Endpoints
router.post('/public/web-form', publicWebFormIntake);
router.post('/public/chat/session', publicChatSession);
router.post('/public/chat/message', publicChatMessage);

// Protected Workspace Support Endpoints
router.use(protect);
router.use(requireTenant);

router.get('/conversations', authorize('super_admin', 'manager', 'employee', 'workspace_owner'), getConversations);
router.get('/conversations/:id', authorize('super_admin', 'manager', 'employee', 'workspace_owner', 'customer'), getConversationById);
router.post('/conversations/:id/messages', authorize('super_admin', 'manager', 'employee', 'workspace_owner', 'customer'), postConversationMessage);
router.post('/conversations/:id/convert-to-ticket', authorize('super_admin', 'manager', 'employee', 'workspace_owner'), convertToTicket);

router.post('/calls', authorize('super_admin', 'manager', 'employee', 'workspace_owner'), logCall);
router.get('/analytics', authorize('super_admin', 'manager', 'employee', 'workspace_owner'), getSupportAnalytics);
router.get('/sla-priority', authorize('super_admin', 'manager', 'employee', 'workspace_owner'), getSlaAndPriorityConfig);

module.exports = router;
