const express = require('express');
const router = express.Router();
const { getEmployees, getEmployeePerformance, getLeaderboard, updateEmployee } = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('super_admin', 'manager', 'employee'));

router.get('/', getEmployees);
router.get('/leaderboard', getLeaderboard);
router.get('/:id/performance', getEmployeePerformance);
router.put('/:id', authorize('super_admin', 'manager'), updateEmployee);

module.exports = router;
