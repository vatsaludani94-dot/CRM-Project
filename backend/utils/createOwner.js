require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const createOwner = async () => {
  const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus';
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to DB for user creation...');

    let tenant = await Tenant.findOne({ subdomain: 'grownox' });
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'GrownX Technologies',
        subdomain: 'grownox',
        plan: 'enterprise',
        status: 'active',
      });
    }

    const email = 'valhalla15viking@gmail.com';
    const password = 'Vatsal@1516';
    const name = 'Vatsal Udani';

    let user = await User.findOne({ email });
    if (user) {
      user.name = name;
      user.password = password; // pre-save hook handles encryption
      user.role = 'super_admin';
      user.status = 'active';
      user.tenant = tenant._id;
      await user.save();
      console.log(`User ${email} updated successfully as super_admin!`);
    } else {
      user = await User.create({
        name,
        email,
        password,
        role: 'super_admin',
        department: 'Management',
        status: 'active',
        tenant: tenant._id,
      });
      console.log(`User ${email} created successfully as super_admin!`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
};

createOwner();
