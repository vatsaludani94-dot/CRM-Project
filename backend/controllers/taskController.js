const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

const getTasks = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { status, priority, assignedTo } = req.query;
    let query = { ...tenantFilter };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    if (req.user.role === 'employee') {
      query.$and = [
        tenantFilter,
        {
          $or: [
            { assignedTo: req.user._id },
            { assignedTo: null }
          ]
        }
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('parentTask', 'title')
      .populate('customer', 'companyName contactPerson')
      .populate('lead', 'company contactName email')
      .sort({ dueDate: 1 });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const createTask = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const { title, description, dueDate, priority, status, assignedTo, parentTaskId, customerId, leadId } = req.body;

    if (assignedTo) {
      const emp = await User.findOne({ _id: assignedTo, ...tenantFilter });
      if (!emp) {
        return res.status(400).json({ success: false, error: 'Assigned employee does not belong to your workspace' });
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

    const task = await Task.create({
      title,
      description,
      dueDate,
      priority: priority || 'Medium',
      status: status || 'Pending',
      assignedTo: assignedTo || undefined,
      parentTask: parentTaskId || undefined,
      customer: customerId || undefined,
      lead: leadId || undefined,
      tenant: tenantId,
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const updateData = { ...req.body };
    delete updateData.tenant;

    if (updateData.assignedTo) {
      const emp = await User.findOne({ _id: updateData.assignedTo, ...tenantFilter });
      if (!emp) {
        return res.status(400).json({ success: false, error: 'Assigned employee does not belong to your workspace' });
      }
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter },
      updateData,
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const task = await Task.findOneAndDelete({ _id: req.params.id, ...tenantFilter });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const addTaskComment = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { text } = req.body;
    const task = await Task.findOne({ _id: req.params.id, ...tenantFilter });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (!text) {
      return res.status(400).json({ success: false, error: 'Comment text is required' });
    }

    task.comments.push({
      text,
      author: req.user._id,
    });

    await task.save();

    const updatedTask = await Task.findOne({ _id: task._id, ...tenantFilter })
      .populate('comments.author', 'name email role profilePicture');

    res.status(201).json({ success: true, data: updatedTask.comments[updatedTask.comments.length - 1] });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  addTaskComment,
};
