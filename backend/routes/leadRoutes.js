const express = require('express');
const router = Router = express.Router();
const {
  getLeads,
  createLead,
  updateLead,
  transitionLead,
  deleteLead,
  addLeadNote,
  getLeadTimeline,
  getLeadScore,
  refreshLeadScore
} = require('../controllers/leadController');
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

router.post('/:id/transition', transitionLead);
router.post('/:id/notes', addLeadNote);
router.get('/:id/timeline', getLeadTimeline);
router.get('/:id/score', getLeadScore);
router.post('/:id/score/refresh', refreshLeadScore);

module.exports = router;
