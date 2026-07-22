const mongoose = require('mongoose');
const seedData = require('../utils/seed');
const User = require('../models/User');

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Auto-seed database if empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('User collection is empty. Invoking auto-seed process...');
      await seedData();
    } else {
      console.log('Database already populated. Skipping seeding.');
    }
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
