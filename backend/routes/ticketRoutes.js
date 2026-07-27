const express = require('express');
const router = express.Router();
const {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  assignTicket,
  resolveTicket,
  reopenTicket,
  addTicketComment,
  aiClarifyTicket,
  getTicketAISuggestions
} = require('../controllers/ticketController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.route('/')
  .get(getTickets)
  .post(createTicket);

router.route('/:id')
  .get(getTicketById)
  .put(authorize('super_admin', 'manager', 'employee'), updateTicket);

router.put('/:id/assign', authorize('super_admin', 'manager', 'employee'), assignTicket);
router.put('/:id/resolve', authorize('super_admin', 'manager', 'employee'), resolveTicket);
router.put('/:id/reopen', authorize('super_admin', 'manager', 'employee', 'customer'), reopenTicket);
router.post('/:id/comments', addTicketComment);
router.post('/:id/ai-clarify', aiClarifyTicket);

router.get('/:id/ai-suggestions', authorize('super_admin', 'manager', 'employee'), getTicketAISuggestions);

module.exports = router;
