const express = require('express');
const StaffActivity = require('../models/StaffActivity');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();
router.use(authenticate, authorizeRoles('superadmin', 'admin', 'staff'));

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayRange(dateInput) {
  const d = parseDate(dateInput);
  if (!d) return null;
  return {
    start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
    end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
  };
}

function dateOnlyString(value) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

router.get('/me', async (req, res) => {
  try {
    const { date, type, status, search } = req.query;
    const filter = { staffId: req.user._id };

    if (date) {
      const range = dayRange(date);
      if (!range) return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
      filter.activityDate = { $gte: range.start, $lte: range.end };
    }

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ title: q }, { notes: q }, { studentName: q }];
    }

    const list = await StaffActivity.find(filter)
      .populate('staffId', 'name email role')
      .sort({ activityDate: -1, createdAt: -1 });

    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const role = String(req.user.role).toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin/admin can view all staff activity.' });
    }

    const { dateFrom, dateTo, staffId, type, status, search } = req.query;
    const filter = {};

    if (dateFrom || dateTo) {
      const from = dateFrom ? parseDate(dateFrom) : null;
      const to = dateTo ? parseDate(dateTo) : null;
      if (dateFrom && !from) return res.status(400).json({ error: 'Invalid dateFrom. Use YYYY-MM-DD.' });
      if (dateTo && !to) return res.status(400).json({ error: 'Invalid dateTo. Use YYYY-MM-DD.' });
      filter.activityDate = {};
      if (from) filter.activityDate.$gte = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);
      if (to) filter.activityDate.$lte = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    }

    if (staffId) filter.staffId = staffId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ title: q }, { notes: q }, { studentName: q }];
    }

    const list = await StaffActivity.find(filter)
      .populate('staffId', 'name email role')
      .sort({ activityDate: -1, createdAt: -1 });

    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const role = String(req.user.role).toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin/admin can view summary.' });
    }

    const { dateFrom, dateTo } = req.query;
    const filter = {};

    if (dateFrom || dateTo) {
      const from = dateFrom ? parseDate(dateFrom) : null;
      const to = dateTo ? parseDate(dateTo) : null;
      if (dateFrom && !from) return res.status(400).json({ error: 'Invalid dateFrom. Use YYYY-MM-DD.' });
      if (dateTo && !to) return res.status(400).json({ error: 'Invalid dateTo. Use YYYY-MM-DD.' });
      filter.activityDate = {};
      if (from) filter.activityDate.$gte = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);
      if (to) filter.activityDate.$lte = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    } else {
      const today = dateOnlyString(new Date());
      const range = dayRange(today);
      filter.activityDate = { $gte: range.start, $lte: range.end };
    }

    const grouped = await StaffActivity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$staffId',
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0],
            },
          },
          lastActivityAt: { $max: '$createdAt' },
        },
      },
      { $sort: { total: -1, lastActivityAt: -1 } },
    ]);

    const staffIds = grouped.map((x) => x._id);
    const users = await User.find({ _id: { $in: staffIds } }).select('name email role');
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const rows = grouped.map((g) => {
      const user = userMap.get(String(g._id));
      return {
        staffId: g._id,
        staffName: user?.name || 'Unknown',
        staffEmail: user?.email || '',
        total: g.total,
        completed: g.completed,
        pending: g.pending,
        lastActivityAt: g.lastActivityAt,
      };
    });

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const activityDate = parseDate(req.body.activityDate || new Date());
    if (!activityDate) {
      return res.status(400).json({ error: 'Invalid activityDate. Use YYYY-MM-DD.' });
    }

    const payload = {
      staffId: req.user._id,
      activityDate,
      type: req.body.type,
      title: req.body.title,
      notes: req.body.notes,
      studentName: req.body.studentName,
      status: req.body.status,
    };

    const created = await StaffActivity.create(payload);
    const full = await StaffActivity.findById(created._id).populate('staffId', 'name email role');
    res.status(201).json(full);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await StaffActivity.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Activity not found' });

    const role = String(req.user.role).toLowerCase();
    const canManageAll = role === 'admin' || role === 'superadmin';
    if (!canManageAll && String(existing.staffId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can update only your own activity.' });
    }

    const update = {};
    if (req.body.activityDate) {
      const parsed = parseDate(req.body.activityDate);
      if (!parsed) return res.status(400).json({ error: 'Invalid activityDate. Use YYYY-MM-DD.' });
      update.activityDate = parsed;
    }
    if (req.body.type !== undefined) update.type = req.body.type;
    if (req.body.title !== undefined) update.title = req.body.title;
    if (req.body.notes !== undefined) update.notes = req.body.notes;
    if (req.body.studentName !== undefined) update.studentName = req.body.studentName;
    if (req.body.status !== undefined) update.status = req.body.status;

    const saved = await StaffActivity.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).populate('staffId', 'name email role');

    res.json(saved);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await StaffActivity.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Activity not found' });

    const role = String(req.user.role).toLowerCase();
    const canManageAll = role === 'admin' || role === 'superadmin';
    if (!canManageAll && String(existing.staffId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can delete only your own activity.' });
    }

    await StaffActivity.findByIdAndDelete(req.params.id);
    res.json({ message: 'Activity deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

