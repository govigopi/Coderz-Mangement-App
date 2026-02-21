const express = require('express');
const Income = require('../models/Income');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();
router.use(authenticate, authorizeRoles('superadmin'));

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, source } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (source) filter.source = source;
    const income = await Income.find(filter)
      .populate('studentId', 'name')
      .sort({ date: -1 });
    res.json(income);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const income = new Income(req.body);
    await income.save();
    res.status(201).json(income);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;

