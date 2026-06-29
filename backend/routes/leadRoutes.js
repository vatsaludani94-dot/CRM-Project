const express = require('express');
const router = Router = express.Router();
const { getLeads, createLead, updateLead, deleteLead, addLeadNote } = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('super_admin', 'manager', 'employee'));

router.route('/')
  .get(getLeads)
  .post(createLead);

router.route('/:id')
  .put(updateLead)
  .delete(deleteLead);

router.post('/:id/notes', addLeadNote);

module.exports = router;
