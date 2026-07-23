const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  getCustomer360,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerNote,
  logCustomerActivity
} = require('../controllers/customerController');
const { protect, requireTenant } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(requireTenant);

// Directory CRUD
router.route('/')
  .get(authorize('super_admin', 'manager', 'employee'), getCustomers)
  .post(authorize('super_admin', 'manager', 'employee'), createCustomer);

router.route('/:id')
  .get(getCustomerById) // individual access includes customer role checks inside controller
  .put(authorize('super_admin', 'manager', 'employee'), updateCustomer)
  .delete(authorize('super_admin', 'manager'), deleteCustomer);

// Customer 360 & timelines
router.get('/:id/360', getCustomer360);

// Customer Profile actions
router.post('/:id/notes', authorize('super_admin', 'manager', 'employee'), addCustomerNote);
router.post('/:id/activities', authorize('super_admin', 'manager', 'employee'), logCustomerActivity);

module.exports = router;
