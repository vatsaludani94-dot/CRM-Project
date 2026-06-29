const express = require('express');
const router = express.Router();
const {
  getSmsCampaigns,
  createSmsCampaign,
  updateSmsCampaign,
  deleteSmsCampaign,
  sendSmsCampaign,
} = require('../controllers/smsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getSmsCampaigns)
  .post(createSmsCampaign);

router.route('/:id')
  .put(updateSmsCampaign)
  .delete(deleteSmsCampaign);

router.post('/:id/send', sendSmsCampaign);

module.exports = router;
