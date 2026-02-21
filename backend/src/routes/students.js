const express = require('express');
const Student = require('../models/Student');
const ExcelJS = require('exceljs');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();
router.use(authenticate, authorizeRoles('superadmin', 'admin'));

router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { rollNo: new RegExp(search, 'i') },
        { name: new RegExp(search, 'i') },
        { mobile: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    const students = await Student.find(filter)
      .populate('courses')
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/export/excel', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { rollNo: new RegExp(search, 'i') },
        { name: new RegExp(search, 'i') },
        { mobile: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const students = await Student.find(filter).populate('courses').sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.columns = [
      { header: 'Roll No', key: 'rollNo', width: 14 },
      { header: 'Name', key: 'name', width: 22 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Qualification', key: 'qualification', width: 18 },
      { header: 'Mode', key: 'mode', width: 12 },
      { header: 'Admission Date', key: 'admissionDate', width: 16 },
      { header: 'Courses', key: 'courses', width: 35 },
      { header: 'Total Fees', key: 'totalFees', width: 14 },
      { header: 'Paid Amount', key: 'paidAmount', width: 14 },
      { header: 'Pending Amount', key: 'pendingAmount', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    students.forEach((s) => {
      sheet.addRow({
        rollNo: s.rollNo || '',
        name: s.name || '',
        mobile: s.mobile || '',
        email: s.email || '',
        qualification: s.qualification || '',
        mode: s.mode || '',
        admissionDate: s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-IN') : '',
        courses: (s.courses || []).map((c) => c?.name).filter(Boolean).join(', '),
        totalFees: s.totalFees || 0,
        paidAmount: s.paidAmount || 0,
        pendingAmount: s.pendingAmount || 0,
        status: s.status || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    const populated = await Student.findById(student._id).populate('courses');
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('courses');
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('courses');
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

