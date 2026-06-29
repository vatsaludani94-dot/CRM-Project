const express = require('express');
const router = express.Router();
const { getPayrolls, createPayroll, updatePayroll, downloadPayslip } = require('../controllers/payrollController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.route('/')
  .get(getPayrolls)
  .post(authorize('super_admin', 'manager'), createPayroll);

router.route('/:id')
  .put(authorize('super_admin', 'manager'), updatePayroll);

router.get('/:id/download', downloadPayslip); // download checks individual ownership inside controller

module.exports = router;
