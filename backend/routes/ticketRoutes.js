const express = require('express');
const router = express.Router();
const {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addTicketComment,
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

router.post('/:id/comments', addTicketComment);

router.get('/:id/ai-suggestions', authorize('super_admin', 'manager', 'employee'), getTicketAISuggestions);

module.exports = router;
