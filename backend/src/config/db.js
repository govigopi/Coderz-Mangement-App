const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = (process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing. Set it in environment variables before starting the API.');
  }
  if (process.env.VERCEL && /localhost|127\.0\.0\.1/.test(mongoUri)) {
    throw new Error('Invalid MONGODB_URI for Vercel: localhost cannot be used in serverless deployments.');
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
