const express = require('express');
const router = express.Router();
const { getAppointments, createAppointment, updateAppointment, deleteAppointment } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // protect all calendar routes

router.route('/')
  .get(getAppointments)
  .post(createAppointment);

router.route('/:id')
  .put(updateAppointment)
  .delete(deleteAppointment);

module.exports = router;
