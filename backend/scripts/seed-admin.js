require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/institute_management');
  const defaults = [
    {
      name: 'Superadmin',
      email: 'superadmin@coderz',
      password: 'code123',
      role: 'superadmin',
    },
    {
      name: 'Admin',
      email: 'admin@coderz',
      password: 'code123',
      role: 'admin',
    },
  ];

  for (const account of defaults) {
    const exists = await User.findOne({ email: account.email });
    if (exists) {
      console.log(`${account.role} user already exists: ${account.email}`);
      continue;
    }
    await User.create(account);
    console.log(`${account.role} user created: ${account.email} / ${account.password}`);
  }

  process.exit(0);
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

