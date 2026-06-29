const express = require('express');
const router = express.Router();
const {
  getDriveFolders,
  createFolder,
  getFolderContents,
  uploadFile,
  deleteFile,
} = require('../controllers/driveController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/folders', getDriveFolders);
router.post('/folders', createFolder);
router.get('/folders/:folderId', getFolderContents);
router.post('/files/upload', uploadFile);
router.delete('/files/:id', deleteFile);

module.exports = router;
