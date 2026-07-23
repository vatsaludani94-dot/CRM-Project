const Appointment = require('../models/Appointment');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

/**
 * @desc    Get all appointments (calendar list)
 * @route   GET /api/appointments
 * @access  Private
 */
const getAppointments = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    let query = { ...tenantFilter };
    
    if (req.user.role === 'employee') {
      query.host = req.user._id;
    } else if (req.query.hostId) {
      query.host = req.query.hostId;
    }

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
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Create new appointment
 * @route   POST /api/appointments
 * @access  Private (Admin, Manager, Employee)
 */
const createAppointment = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const { subject, description, appointmentDate, startTime, endTime, customerId, leadId, hostId } = req.body;
    
    const targetHost = hostId || req.user._id;

    if (targetHost) {
      const hostUser = await User.findOne({ _id: targetHost, ...tenantFilter });
      if (!hostUser) {
        return res.status(400).json({ success: false, error: 'Assigned host does not belong to your workspace' });
      }
    }

    if (customerId) {
      const cust = await Customer.findOne({ _id: customerId, ...tenantFilter });
      if (!cust) {
        return res.status(400).json({ success: false, error: 'Customer does not belong to your workspace' });
      }
    }

    if (leadId) {
      const leadObj = await Lead.findOne({ _id: leadId, ...tenantFilter });
      if (!leadObj) {
        return res.status(400).json({ success: false, error: 'Lead does not belong to your workspace' });
      }
    }

    const appointment = new Appointment({
      subject,
      description,
      appointmentDate: new Date(appointmentDate),
      startTime,
      endTime,
      customer: customerId || null,
      lead: leadId || null,
      host: targetHost,
      tenant: tenantId,
    });

    await appointment.save();
    
    await appointment.populate([
      { path: 'customer', select: 'companyName contactPerson' },
      { path: 'lead', select: 'company contactName' },
      { path: 'host', select: 'name email' }
    ]);

    await Activity.create({
      user: req.user._id,
      action: 'Appointment Created',
      details: `Appointment "${appointment.subject}" scheduled for ${appointment.appointmentDate.toDateString()} by ${req.user.name}`,
      module: 'System',
      tenant: tenantId,
    });

    if (String(targetHost) !== String(req.user._id)) {
      const notification = await Notification.create({
        recipient: targetHost,
        sender: req.user._id,
        title: 'New Appointment Booked',
        message: `Meeting "${appointment.subject}" has been scheduled for you on ${appointment.appointmentDate.toDateString()} at ${appointment.startTime}`,
        type: 'System',
        link: '/dashboard',
        tenant: tenantId,
      });

      const io = req.app.get('io');
      if (io) {
        io.to(targetHost.toString()).emit('notification_received', notification);
      }
    }

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update appointment details/status
 * @route   PUT /api/appointments/:id
 * @access  Private
 */
const updateAppointment = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const appointment = await Appointment.findOne({ _id: req.params.id, ...tenantFilter });
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    if (req.user.role === 'employee' && String(appointment.host) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to modify this appointment' });
    }

    if (req.body.customerId) {
      const cust = await Customer.findOne({ _id: req.body.customerId, ...tenantFilter });
      if (!cust) {
        return res.status(400).json({ success: false, error: 'Customer does not belong to your workspace' });
      }
    }

    if (req.body.leadId) {
      const leadObj = await Lead.findOne({ _id: req.body.leadId, ...tenantFilter });
      if (!leadObj) {
        return res.status(400).json({ success: false, error: 'Lead does not belong to your workspace' });
      }
    }

    if (req.body.host) {
      const hostUser = await User.findOne({ _id: req.body.host, ...tenantFilter });
      if (!hostUser) {
        return res.status(400).json({ success: false, error: 'Host user does not belong to your workspace' });
      }
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
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete appointment
 * @route   DELETE /api/appointments/:id
 * @access  Private
 */
const deleteAppointment = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const appointment = await Appointment.findOne({ _id: req.params.id, ...tenantFilter });
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    if (req.user.role === 'employee' && String(appointment.host) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this appointment' });
    }

    await Appointment.findOneAndDelete({ _id: req.params.id, ...tenantFilter });

    await Activity.create({
      user: req.user._id,
      action: 'Appointment Deleted',
      details: `Meeting "${appointment.subject}" scheduled for ${appointment.appointmentDate.toDateString()} was cancelled.`,
      module: 'System',
      tenant: appointment.tenant,
    });

    res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
