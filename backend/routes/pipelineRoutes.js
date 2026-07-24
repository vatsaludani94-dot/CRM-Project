const express = require('express');
const router = express.Router();
const { getStages, createStage, updateStage, deleteStage } = require('../controllers/pipelineController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/stages', getStages);
router.post('/stages', authorize('super_admin', 'workspace_owner', 'manager'), createStage);
router.put('/stages/:id', authorize('super_admin', 'workspace_owner', 'manager'), updateStage);
router.delete('/stages/:id', authorize('super_admin', 'workspace_owner', 'manager'), deleteStage);

module.exports = router;
