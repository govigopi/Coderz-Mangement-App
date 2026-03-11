const express = require('express');
const Student = require('../models/Student');
const Invoice = require('../models/Invoice');
const Income = require('../models/Income');
const ExcelJS = require('exceljs');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();
router.use(authenticate, authorizeRoles('superadmin', 'admin'));

const recomputeStudentFinancials = async (student) => {
  if (!student) return null;

  const paidAgg = await Income.aggregate([
    { $match: { source: 'fees', studentId: student._id } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  student.paidAmount = paidAgg[0]?.total || 0;
  student.pendingAmount = Math.max(0, (student.totalFees || 0) - (student.paidAmount || 0));
  await student.save();
  return student;
};

const syncLatestStudentInvoice = async (studentId, totalFees) => {
  if (!studentId) return null;

  const latestInvoice = await Invoice.findOne({ studentId }).sort({ date: -1, createdAt: -1 });
  if (!latestInvoice) return null;

  latestInvoice.amount = totalFees;
  if (latestInvoice.paidAmount <= 0) latestInvoice.status = 'pending';
  else if (latestInvoice.paidAmount >= latestInvoice.amount) latestInvoice.status = 'paid';
  else latestInvoice.status = 'partial';

  await latestInvoice.save();
  return latestInvoice;
};

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
      { header: 'Gender', key: 'gender', width: 12 },
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
        gender: s.gender || '',
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
    const nextRollNo = String(req.body.rollNo || '').trim().toUpperCase();
    if (!nextRollNo) return res.status(400).json({ error: 'Roll No is required' });

    const existing = await Student.findOne({ rollNo: nextRollNo });
    if (existing) {
      return res.status(400).json({ error: 'Roll No already exists' });
    }

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
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (Object.prototype.hasOwnProperty.call(req.body, 'rollNo')) {
      const nextRollNo = String(req.body.rollNo || '').trim().toUpperCase();
      if (!nextRollNo) return res.status(400).json({ error: 'Roll No is required' });

      const existing = await Student.findOne({ rollNo: nextRollNo, _id: { $ne: student._id } });
      if (existing) {
        return res.status(400).json({ error: 'Roll No already exists' });
      }
    }

    const editableFields = [
      'rollNo',
      'name',
      'mobile',
      'gender',
      'email',
      'qualification',
      'dateOfBirth',
      'mode',
      'guardianName',
      'guardianMobile',
      'address',
      'admissionDate',
      'courses',
      'courseFee',
      'totalFees',
      'status',
      'certificateIssued',
    ];

    editableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        student[field] = req.body[field];
      }
    });

    await student.validate();
    await recomputeStudentFinancials(student);
    await syncLatestStudentInvoice(student._id, student.totalFees || 0);

    const populated = await Student.findById(student._id).populate('courses');
    res.json(populated);
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

