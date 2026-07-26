const express = require('express');
const router = express.Router();
const {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowLogs,
  getCapabilityRegistry,
  parseWorkflowIntent,
} = require('../controllers/workflowController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/capabilities', authorize('super_admin', 'manager', 'employee', 'workspace_owner'), getCapabilityRegistry);
router.post('/parse-intent', authorize('super_admin', 'manager', 'workspace_owner'), parseWorkflowIntent);

router.route('/')
  .get(authorize('super_admin', 'manager', 'employee'), getWorkflows)
  .post(authorize('super_admin', 'manager'), createWorkflow);

router.route('/logs')
  .get(authorize('super_admin', 'manager', 'employee'), getWorkflowLogs);

router.route('/:id')
  .put(authorize('super_admin', 'manager'), updateWorkflow)
  .delete(authorize('super_admin', 'manager'), deleteWorkflow);

module.exports = router;
