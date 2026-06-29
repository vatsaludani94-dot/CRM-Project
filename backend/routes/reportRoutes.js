const express = require('express');
const router = express.Router();
const { exportCustomerReport, exportLeadReport, exportTicketReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('super_admin', 'manager')); // Restricted to Admin/Manager roles

router.get('/customers', exportCustomerReport);
router.get('/leads', exportLeadReport);
router.get('/tickets', exportTicketReport);

module.exports = router;
