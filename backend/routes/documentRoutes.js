const express = require('express');
const router = express.Router();
const {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  exportDocumentPdf,
  transitionDocument,
  recordInvoicePayment,
  correctInvoicePayment,
  deleteInvoicePayment,
  sendProposalEmail,
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
router.post('/:id/send', sendProposalEmail);
router.post('/:id/payments', recordInvoicePayment);
router.put('/:id/payments/:paymentId', correctInvoicePayment);
router.delete('/:id/payments/:paymentId', deleteInvoicePayment);

module.exports = router;
