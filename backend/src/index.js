require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const studentRoutes = require('./routes/students');
const enquiryRoutes = require('./routes/enquiries');
const invoiceRoutes = require('./routes/invoices');
const expenseRoutes = require('./routes/expenses');
const incomeRoutes = require('./routes/income');
const marksRoutes = require('./routes/marks');
const reportsRoutes = require('./routes/reports');
const staffActivitiesRoutes = require('./routes/staffActivities');

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// API routes
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

// Serve frontend from same server (one URL for app + API)
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend not built. Run: cd admin-dashboard && npm run build');
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} - open http://localhost:${PORT}`));
