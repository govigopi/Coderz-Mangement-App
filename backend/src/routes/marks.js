const express = require('express');
const Mark = require('../models/Mark');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();
router.use(authenticate, authorizeRoles('superadmin', 'admin', 'staff'));

router.get('/', async (req, res) => {
  try {
    const { studentId, subject, term } = req.query;
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (subject) filter.subject = subject;
    if (term) filter.term = term;
    const marks = await Mark.find(filter)
      .populate('studentId', 'name')
      .sort({ examDate: -1 });
    res.json(marks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const mark = new Mark(req.body);
    await mark.save();
    const populated = await Mark.findById(mark._id).populate('studentId', 'name');
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const mark = await Mark.findById(req.params.id).populate('studentId', 'name');
    if (!mark) return res.status(404).json({ error: 'Mark not found' });
    res.json(mark);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const mark = await Mark.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('studentId', 'name');
    if (!mark) return res.status(404).json({ error: 'Mark not found' });
    res.json(mark);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const mark = await Mark.findByIdAndDelete(req.params.id);
    if (!mark) return res.status(404).json({ error: 'Mark not found' });
    res.json({ message: 'Mark deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

