require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL WARNING: JWT_SECRET environment variable is not set!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be configured in environment variables for production.');
  }
}

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

// Route files
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const leadRoutes = require('./routes/leadRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const emailRoutes = require('./routes/emailRoutes');
const driveRoutes = require('./routes/driveRoutes');
const builderRoutes = require('./routes/builderRoutes');
const formSurveyRoutes = require('./routes/formSurveyRoutes');
const smsRoutes = require('./routes/smsRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const taskRoutes = require('./routes/taskRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const updateRoutes = require('./routes/updateRoutes');

// Load Rate Limiters
const { apiLimiter } = require('./middleware/rateLimitMiddleware');

// Initialize app
const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Middlewares
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.slice(2);
        return origin.endsWith(domain);
      }
      return origin === allowedOrigin;
    });
    if (isAllowed || allowedOrigins.length === 0 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limit to API routes
app.use('/api/', apiLimiter);

// Setup Socket.IO
const io = socketio(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
});

// Set Socket.IO instance in express app scope
app.set('io', io);

// Bind Socket.IO handler
const socketHandler = require('./sockets/socketHandler');
socketHandler(io);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/builders', builderRoutes);
app.use('/api/forms-surveys', formSurveyRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/updates', updateRoutes);

// Simple test root route
app.get('/', (req, res) => {
  res.json({ message: 'Grownox Technologies REST API is fully operational' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Port configuration
const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`GrownX CRM Backend Server running on port ${PORT}`);
    console.log(`Socket.IO listening for connections`);
  });
}

module.exports = app;
