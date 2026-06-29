const Task = require('../models/Task');
const Activity = require('../models/Activity');

const getTasks = async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.query;
    let query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    // Support RBAC - employees see assigned + open tasks
    if (req.user.role === 'employee') {
      query.$or = [
        { assignedTo: req.user._id },
        { assignedTo: null }
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('parentTask', 'title')
      .populate('customer', 'companyName contactPerson')
      .populate('lead', 'name email')
      .sort({ dueDate: 1 });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, status, assignedTo, parentTaskId, customerId, leadId } = req.body;

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
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, tenant: req.user.tenant });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const addTaskComment = async (req, res) => {
  try {
    const { text } = req.body;
    const task = await Task.findOne({ _id: req.params.id, tenant: req.user.tenant });

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

    const updatedTask = await Task.findById(task._id)
      .populate('comments.author', 'name email role profilePicture');

    res.status(201).json({ success: true, data: updatedTask.comments[updatedTask.comments.length - 1] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  addTaskComment,
};
