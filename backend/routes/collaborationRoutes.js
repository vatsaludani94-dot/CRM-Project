const express = require('express');
const router = express.Router();
const {
  getChannels,
  createChannel,
  getChatMessages,
  sendChatMessage,
  getTeamMembers,
} = require('../controllers/collaborationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/channels', getChannels);
router.post('/channels', createChannel);
router.get('/messages', getChatMessages);
router.post('/messages', sendChatMessage);
router.get('/team', getTeamMembers);

module.exports = router;
