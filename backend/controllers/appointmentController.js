const Appointment = require('../models/Appointment');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

/**
 * @desc    Get all appointments (calendar list)
 * @route   GET /api/appointments
 * @access  Private
 */
const getAppointments = async (req, res) => {
  try {
    let query = {};
    
    // RBAC: Employees can see only appointments where they are host
    if (req.user.role === 'employee') {
      query.host = req.user._id;
    } else if (req.query.hostId) {
      query.host = req.query.hostId;
    }

    // Filter by date range (calendar views)
    if (req.query.startDate && req.query.endDate) {
      query.appointmentDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const appointments = await Appointment.find(query)
      .populate('customer', 'companyName contactPerson email')
      .populate('lead', 'company contactName email')
      .populate('host', 'name email role department')
      .sort({ appointmentDate: 1, startTime: 1 });

    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Create new appointment
 * @route   POST /api/appointments
 * @access  Private (Admin, Manager, Employee)
 */
const createAppointment = async (req, res) => {
  try {
    const { subject, description, appointmentDate, startTime, endTime, customerId, leadId, hostId } = req.body;
    
    const targetHost = hostId || req.user._id;

    const appointment = new Appointment({
      subject,
      description,
      appointmentDate: new Date(appointmentDate),
      startTime,
      endTime,
      customer: customerId || null,
      lead: leadId || null,
      host: targetHost,
    });

    await appointment.save();
    
    // Populate references
    await appointment.populate([
      { path: 'customer', select: 'companyName contactPerson' },
      { path: 'lead', select: 'company contactName' },
      { path: 'host', select: 'name email' }
    ]);

    // Log global activity
    await Activity.create({
      user: req.user._id,
      action: 'Appointment Created',
      details: `Appointment "${appointment.subject}" scheduled for ${appointment.appointmentDate.toDateString()} by ${req.user.name}`,
      module: 'System',
    });

    // Notify host if it is another user
    if (String(targetHost) !== String(req.user._id)) {
      const notification = await Notification.create({
        recipient: targetHost,
        sender: req.user._id,
        title: 'New Appointment Booked',
        message: `Meeting "${appointment.subject}" has been scheduled for you on ${appointment.appointmentDate.toDateString()} at ${appointment.startTime}`,
        type: 'System',
        link: '/dashboard', // will link to calendar
      });

      const io = req.app.get('io');
      if (io) {
        io.to(targetHost.toString()).emit('notification_received', notification);
      }
    }

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update appointment details/status
 * @route   PUT /api/appointments/:id
 * @access  Private
 */
const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // RBAC: Employees can only edit their own meetings
    if (req.user.role === 'employee' && String(appointment.host) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to modify this appointment' });
    }

    const fields = ['subject', 'description', 'appointmentDate', 'startTime', 'endTime', 'status', 'host', 'customerId', 'leadId'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'appointmentDate') {
          appointment[field] = new Date(req.body[field]);
        } else if (field === 'customerId') {
          appointment.customer = req.body[field] || null;
        } else if (field === 'leadId') {
          appointment.lead = req.body[field] || null;
        } else {
          appointment[field] = req.body[field];
        }
      }
    });

    await appointment.save();

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete appointment
 * @route   DELETE /api/appointments/:id
 * @access  Private
 */
const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // RBAC
    if (req.user.role === 'employee' && String(appointment.host) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this appointment' });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    await Activity.create({
      user: req.user._id,
      action: 'Appointment Deleted',
      details: `Meeting "${appointment.subject}" scheduled for ${appointment.appointmentDate.toDateString()} was cancelled.`,
      module: 'System',
    });

    res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
