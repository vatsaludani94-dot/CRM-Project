const express = require('express');
const router = express.Router();
const {
  getRetentionDashboard,
  getSegmentedCustomers,
  recalculateHealth,
  createCustomerFollowUp
} = require('../controllers/retentionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', getRetentionDashboard);
router.get('/customers', getSegmentedCustomers);
router.post('/customers/:id/health/recalculate', recalculateHealth);
router.post('/customers/:id/followup', createCustomerFollowUp);

module.exports = router;
