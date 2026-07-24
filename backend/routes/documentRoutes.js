const express = require('express');
const router = express.Router();
const {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  exportDocumentPdf,
  transitionDocument,
  recordInvoicePayment
} = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getDocuments)
  .post(createDocument);

router.route('/:id')
  .get(getDocumentById)
  .put(updateDocument);

router.get('/:id/pdf', exportDocumentPdf);
router.post('/:id/transition', transitionDocument);
router.post('/:id/payments', recordInvoicePayment);

module.exports = router;
