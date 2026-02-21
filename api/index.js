const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('../backend/src/config/db');

const authRoutes = require('../backend/src/routes/auth');
const courseRoutes = require('../backend/src/routes/courses');
const studentRoutes = require('../backend/src/routes/students');
const enquiryRoutes = require('../backend/src/routes/enquiries');
const invoiceRoutes = require('../backend/src/routes/invoices');
const expenseRoutes = require('../backend/src/routes/expenses');
const incomeRoutes = require('../backend/src/routes/income');
const marksRoutes = require('../backend/src/routes/marks');
const reportsRoutes = require('../backend/src/routes/reports');
const staffActivitiesRoutes = require('../backend/src/routes/staffActivities');

const app = express();

app.use(cors());
app.use(express.json());

let connectPromise = null;
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!connectPromise) {
    connectPromise = connectDB().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }
  await connectPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/staff-activities', staffActivitiesRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
