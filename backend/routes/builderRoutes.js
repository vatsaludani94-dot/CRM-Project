const express = require('express');
const router = express.Router();
const {
  getWebsites,
  createWebsite,
  updateWebsite,
  publishWebsite,
  deleteWebsite,
  getFunnels,
  createFunnel,
  updateFunnel,
  cloneFunnel,
  trackFunnelMetric,
  deleteFunnel,
} = require('../controllers/builderController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Websites routes
router.get('/websites', getWebsites);
router.post('/websites', createWebsite);
router.put('/websites/:id', updateWebsite);
router.put('/websites/:id/publish', publishWebsite);
router.delete('/websites/:id', deleteWebsite);

// Funnels routes
router.get('/funnels', getFunnels);
router.post('/funnels', createFunnel);
router.put('/funnels/:id', updateFunnel);
router.post('/funnels/:id/clone', cloneFunnel);
router.put('/funnels/:id/metrics', trackFunnelMetric);
router.delete('/funnels/:id', deleteFunnel);

module.exports = router;
