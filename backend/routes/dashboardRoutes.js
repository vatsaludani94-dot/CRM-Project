const express = require('express');
const router = express.Router();
const { getDashboardData, searchGlobal } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('super_admin', 'workspace_owner', 'manager', 'employee'));

router.get('/', getDashboardData);
router.get('/search', searchGlobal);

module.exports = router;
