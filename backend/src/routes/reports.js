const express = require('express');
const Student = require('../models/Student');
const Invoice = require('../models/Invoice');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Mark = require('../models/Mark');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const router = express.Router();
router.use(authenticate, authorizeRoles('superadmin'));

function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

// Dashboard & business metrics
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalStudents,
      activeStudents,
      monthlyIncome,
      monthlyExpense,
      totalPendingFees,
      todayIncome,
      todayExpense,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'active' }),
      Income.aggregate([{ $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Student.aggregate([{ $group: { _id: null, total: { $sum: '$pendingAmount' } } }]),
      Income.aggregate([{ $match: { date: { $gte: startOfDay } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { date: { $gte: startOfDay } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const monthlyIncomeTotal = monthlyIncome[0]?.total ?? 0;
    const monthlyExpenseTotal = monthlyExpense[0]?.total ?? 0;
    const pendingTotal = totalPendingFees[0]?.total ?? 0;
    const todayIncomeTotal = todayIncome[0]?.total ?? 0;
    const todayExpenseTotal = todayExpense[0]?.total ?? 0;

    res.json({
      totalStudents,
      activeStudents,
      monthlyIncome: monthlyIncomeTotal,
      monthlyExpense: monthlyExpenseTotal,
      monthlyProfit: monthlyIncomeTotal - monthlyExpenseTotal,
      totalPendingFees: pendingTotal,
      todayIncome: todayIncomeTotal,
      todayExpense: todayExpenseTotal,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Monthly income for graphs (last 12 months)
router.get('/monthly-income', async (req, res) => {
  try {
    const result = await Income.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)),
          },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Revenue per student (total collected / active students)
router.get('/revenue-per-student', async (req, res) => {
  try {
    const [students, totalPaid] = await Promise.all([
      Student.find({ status: 'active' }).select('name paidAmount totalFees pendingAmount'),
      Student.aggregate([{ $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
    ]);
    const total = totalPaid[0]?.total ?? 0;
    const count = students.length;
    res.json({
      totalRevenue: total,
      activeStudentCount: count,
      revenuePerStudent: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
      students: students.map((s) => ({
        id: s._id,
        name: s.name,
        paidAmount: s.paidAmount,
        totalFees: s.totalFees,
        pendingAmount: s.pendingAmount,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Income vs expense by date range
router.get('/income-expense', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    const [incomeAgg, expenseAgg] = await Promise.all([
      Income.aggregate([{ $match: { date: { $gte: start, $lte: end } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { date: { $gte: start, $lte: end } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    res.json({
      income: incomeAgg[0]?.total ?? 0,
      expense: expenseAgg[0]?.total ?? 0,
      profit: (incomeAgg[0]?.total ?? 0) - (expenseAgg[0]?.total ?? 0),
      startDate: start,
      endDate: end,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Business report: year/month summary with breakdowns
router.get('/business-summary', async (req, res) => {
  try {
    const now = new Date();
    const year = Number.parseInt(req.query.year, 10) || now.getFullYear();
    const month = req.query.month ? Number.parseInt(req.query.month, 10) : null;
    const courseId = req.query.courseId ? String(req.query.courseId) : '';
    const mode = req.query.mode ? String(req.query.mode) : '';

    const periodStart = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const periodEnd = month
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999);

    const studentFilter = { admissionDate: { $gte: periodStart, $lte: periodEnd } };
    if (courseId) studentFilter.courses = courseId;
    if (mode) studentFilter.mode = mode;

    const studentFilterAllTime = {};
    if (courseId) studentFilterAllTime.courses = courseId;
    if (mode) studentFilterAllTime.mode = mode;

    const studentsInPeriod = await Student.find(studentFilter).populate('courses', 'name');
    const studentIdsInPeriod = studentsInPeriod.map((s) => s._id);

    const incomeMatch = { date: { $gte: periodStart, $lte: periodEnd } };
    if (courseId || mode) {
      incomeMatch.studentId = studentIdsInPeriod.length > 0 ? { $in: studentIdsInPeriod } : null;
    }

    const [incomeAgg, expenseAgg, admissionsCount, activeStudents, totalPendingAgg, businessValueAgg] = await Promise.all([
      Income.aggregate([{ $match: incomeMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { date: { $gte: periodStart, $lte: periodEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Student.countDocuments(studentFilter),
      Student.countDocuments({ ...studentFilterAllTime, status: 'active' }),
      Student.aggregate([
        { $match: studentFilterAllTime },
        { $group: { _id: null, total: { $sum: '$pendingAmount' } } },
      ]),
      Student.aggregate([
        { $match: studentFilter },
        { $group: { _id: null, total: { $sum: '$totalFees' } } },
      ]),
    ]);

    const selectedIncome = incomeAgg[0]?.total || 0;
    const selectedExpense = expenseAgg[0]?.total || 0;
    const selectedProfit = selectedIncome - selectedExpense;
    const selectedPending = totalPendingAgg[0]?.total || 0;
    const selectedBusinessValue = businessValueAgg[0]?.total || 0;

    const monthStart = new Date(year, 0, 1);
    const monthEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const monthIncomeMatch = { date: { $gte: monthStart, $lte: monthEnd } };
    if (courseId || mode) {
      monthIncomeMatch.studentId = studentIdsInPeriod.length > 0 ? { $in: studentIdsInPeriod } : null;
    }

    const [incomeByMonthAgg, expenseByMonthAgg, admissionsByMonthAgg, businessValueByMonthAgg] = await Promise.all([
      Income.aggregate([
        { $match: monthIncomeMatch },
        { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
      ]),
      Student.aggregate([
        { $match: { ...studentFilterAllTime, admissionDate: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: { $month: '$admissionDate' }, count: { $sum: 1 } } },
      ]),
      Student.aggregate([
        { $match: { ...studentFilterAllTime, admissionDate: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: { $month: '$admissionDate' }, total: { $sum: '$totalFees' } } },
      ]),
    ]);

    const incomeByMonth = {};
    const expenseByMonth = {};
    const admissionsByMonth = {};
    const businessValueByMonth = {};
    incomeByMonthAgg.forEach((x) => { incomeByMonth[x._id] = x.total; });
    expenseByMonthAgg.forEach((x) => { expenseByMonth[x._id] = x.total; });
    admissionsByMonthAgg.forEach((x) => { admissionsByMonth[x._id] = x.count; });
    businessValueByMonthAgg.forEach((x) => { businessValueByMonth[x._id] = x.total; });

    const monthWise = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const income = incomeByMonth[m] || 0;
      const expense = expenseByMonth[m] || 0;
      const admissions = admissionsByMonth[m] || 0;
      const businessValue = businessValueByMonth[m] || 0;
      return {
        month: m,
        income,
        expense,
        profit: income - expense,
        admissions,
        businessValue,
        avgFeePerAdmission: admissions ? Math.round((income / admissions) * 100) / 100 : 0,
      };
    });

    const courseMap = new Map();
    studentsInPeriod.forEach((s) => {
      const names = (s.courses || []).map((c) => c?.name).filter(Boolean);
      if (!names.length) return;
      const split = names.length;
      names.forEach((name) => {
        if (!courseMap.has(name)) {
          courseMap.set(name, { courseName: name, admissions: 0, totalFee: 0, collected: 0, pending: 0 });
        }
        const row = courseMap.get(name);
        row.admissions += 1;
        row.totalFee += (s.totalFees || 0) / split;
        row.collected += (s.paidAmount || 0) / split;
        row.pending += (s.pendingAmount || 0) / split;
      });
    });

    const courseBreakdown = Array.from(courseMap.values())
      .map((r) => ({
        ...r,
        totalFee: Math.round(r.totalFee),
        collected: Math.round(r.collected),
        pending: Math.round(r.pending),
      }))
      .sort((a, b) => b.collected - a.collected);

    const [topPaid, topPending] = await Promise.all([
      Student.find(studentFilterAllTime).select('rollNo name paidAmount').sort({ paidAmount: -1 }).limit(10),
      Student.find(studentFilterAllTime).select('rollNo name pendingAmount').sort({ pendingAmount: -1 }).limit(10),
    ]);

    const [incomeYearAgg, expenseYearAgg, admissionYearAgg, businessValueYearAgg] = await Promise.all([
      Income.aggregate([
        { $group: { _id: { $year: '$date' }, total: { $sum: '$amount' } } },
        { $sort: { _id: -1 } },
        { $limit: 8 },
      ]),
      Expense.aggregate([
        { $group: { _id: { $year: '$date' }, total: { $sum: '$amount' } } },
        { $sort: { _id: -1 } },
        { $limit: 8 },
      ]),
      Student.aggregate([
        { $group: { _id: { $year: '$admissionDate' }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 8 },
      ]),
      Student.aggregate([
        { $group: { _id: { $year: '$admissionDate' }, total: { $sum: '$totalFees' } } },
        { $sort: { _id: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const yearlyMap = new Map();
    incomeYearAgg.forEach((r) => {
      yearlyMap.set(r._id, { year: r._id, collection: r.total, expense: 0, admissions: 0, businessValue: 0 });
    });
    expenseYearAgg.forEach((r) => {
      const row = yearlyMap.get(r._id) || { year: r._id, collection: 0, expense: 0, admissions: 0, businessValue: 0 };
      row.expense = r.total;
      yearlyMap.set(r._id, row);
    });
    admissionYearAgg.forEach((r) => {
      const row = yearlyMap.get(r._id) || { year: r._id, collection: 0, expense: 0, admissions: 0, businessValue: 0 };
      row.admissions = r.count;
      yearlyMap.set(r._id, row);
    });
    businessValueYearAgg.forEach((r) => {
      const row = yearlyMap.get(r._id) || { year: r._id, collection: 0, expense: 0, admissions: 0, businessValue: 0 };
      row.businessValue = r.total;
      yearlyMap.set(r._id, row);
    });

    const yearlySummary = Array.from(yearlyMap.values())
      .map((r) => ({ ...r, profit: r.collection - r.expense }))
      .sort((a, b) => b.year - a.year);

    let currentValue = 0;
    let previousValue = 0;
    let currentAdmissions = 0;
    let previousAdmissions = 0;
    if (month) {
      const currentStart = new Date(year, month - 1, 1);
      const currentEnd = new Date(year, month, 0, 23, 59, 59, 999);
      const prevStart = new Date(year, month - 2, 1);
      const prevEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);
      const yoyStart = new Date(year - 1, month - 1, 1);
      const yoyEnd = new Date(year - 1, month, 0, 23, 59, 59, 999);

      const [curIncome, prevIncome, yoyIncome, curAdm, prevAdm, yoyAdm] = await Promise.all([
        Income.aggregate([{ $match: { date: { $gte: currentStart, $lte: currentEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Income.aggregate([{ $match: { date: { $gte: prevStart, $lte: prevEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Income.aggregate([{ $match: { date: { $gte: yoyStart, $lte: yoyEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Student.aggregate([{ $match: { admissionDate: { $gte: currentStart, $lte: currentEnd } } }, { $group: { _id: null, total: { $sum: 1 } } }]),
        Student.aggregate([{ $match: { admissionDate: { $gte: prevStart, $lte: prevEnd } } }, { $group: { _id: null, total: { $sum: 1 } } }]),
        Student.aggregate([{ $match: { admissionDate: { $gte: yoyStart, $lte: yoyEnd } } }, { $group: { _id: null, total: { $sum: 1 } } }]),
      ]);

      currentValue = curIncome[0]?.total || 0;
      previousValue = prevIncome[0]?.total || 0;
      currentAdmissions = curAdm[0]?.total || 0;
      previousAdmissions = prevAdm[0]?.total || 0;

      res.json({
        filters: { year, month, courseId, mode },
        summary: {
          businessValue: selectedBusinessValue,
          collection: selectedIncome,
          expense: selectedExpense,
          profit: selectedProfit,
          admissions: admissionsCount,
          activeStudents,
          pendingFees: selectedPending,
        },
        monthWise,
        courseBreakdown,
        topPaid: topPaid.map((s) => ({ rollNo: s.rollNo, name: s.name, amount: s.paidAmount })),
        topPending: topPending.map((s) => ({ rollNo: s.rollNo, name: s.name, amount: s.pendingAmount })),
        yearlySummary,
        growth: {
          momCollectionPct: pctChange(currentValue, previousValue),
          yoyCollectionPct: pctChange(currentValue, yoyIncome[0]?.total || 0),
          momAdmissionsPct: pctChange(currentAdmissions, previousAdmissions),
          yoyAdmissionsPct: pctChange(currentAdmissions, yoyAdm[0]?.total || 0),
        },
      });
      return;
    }

    const [currYearIncome, prevYearIncome, currYearAdm, prevYearAdm] = await Promise.all([
      Income.aggregate([{ $match: { date: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59, 999) } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Income.aggregate([{ $match: { date: { $gte: new Date(year - 1, 0, 1), $lte: new Date(year - 1, 11, 31, 23, 59, 59, 999) } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Student.aggregate([{ $match: { admissionDate: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59, 999) } } }, { $group: { _id: null, total: { $sum: 1 } } }]),
      Student.aggregate([{ $match: { admissionDate: { $gte: new Date(year - 1, 0, 1), $lte: new Date(year - 1, 11, 31, 23, 59, 59, 999) } } }, { $group: { _id: null, total: { $sum: 1 } } }]),
    ]);

    res.json({
      filters: { year, month: null, courseId, mode },
      summary: {
        businessValue: selectedBusinessValue,
        collection: selectedIncome,
        expense: selectedExpense,
        profit: selectedProfit,
        admissions: admissionsCount,
        activeStudents,
        pendingFees: selectedPending,
      },
      monthWise,
      courseBreakdown,
      topPaid: topPaid.map((s) => ({ rollNo: s.rollNo, name: s.name, amount: s.paidAmount })),
      topPending: topPending.map((s) => ({ rollNo: s.rollNo, name: s.name, amount: s.pendingAmount })),
      yearlySummary,
      growth: {
        momCollectionPct: null,
        yoyCollectionPct: pctChange(currYearIncome[0]?.total || 0, prevYearIncome[0]?.total || 0),
        momAdmissionsPct: null,
        yoyAdmissionsPct: pctChange(currYearAdm[0]?.total || 0, prevYearAdm[0]?.total || 0),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PDF: Invoice
router.get('/invoice-pdf/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('studentId', 'rollNo name mobile email address');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Invoice #: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${invoice.date.toLocaleDateString()}`);
    doc.text(`Status: ${invoice.status}`);
    doc.moveDown();
    doc.text(`Student: ${invoice.studentId?.name || 'N/A'}`);
    if (invoice.studentId?.rollNo) doc.text(`Roll No: ${invoice.studentId.rollNo}`);
    doc.text(`Mobile: ${invoice.studentId?.mobile || 'N/A'}`);
    doc.text(`Address: ${invoice.studentId?.address || 'N/A'}`);
    doc.moveDown();
    doc.text(`Amount: ₹${invoice.amount}`);
    doc.text(`Paid: ₹${invoice.paidAmount}`);
    doc.text(`Pending: ₹${invoice.amount - invoice.paidAmount}`);
    if (invoice.description) doc.text(`Description: ${invoice.description}`);
    doc.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PDF: Student marks report
router.get('/marks-pdf/:studentId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const marks = await Mark.find({ studentId: req.params.studentId }).sort({ subject: 1, examDate: -1 });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=marks-${student.name.replace(/\s/g, '-')}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text('Academic Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Student: ${student.name}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text('Subject', 50, doc.y);
    doc.text('Marks', 250, doc.y);
    doc.text('Max', 320, doc.y);
    doc.text('Date', 380, doc.y);
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    marks.forEach((m) => {
      doc.text(m.subject, 50);
      doc.text(String(m.marks), 250);
      doc.text(String(m.maxMarks), 320);
      doc.text(m.examDate.toLocaleDateString(), 380);
      doc.moveDown(0.3);
    });
    doc.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Excel: Income & Expense report
router.get('/income-expense-excel', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    const [incomeList, expenseList] = await Promise.all([
      Income.find({ date: { $gte: start, $lte: end } }).populate('studentId', 'name').sort({ date: 1 }),
      Expense.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 }),
    ]);

    const workbook = new ExcelJS.Workbook();
    const incomeSheet = workbook.addWorksheet('Income');
    incomeSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Source', key: 'source', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Student', key: 'student', width: 20 },
    ];
    incomeList.forEach((i) => {
      incomeSheet.addRow({
        date: i.date.toLocaleDateString(),
        amount: i.amount,
        source: i.source || '',
        description: i.description || '',
        student: i.studentId?.name || '',
      });
    });

    const expenseSheet = workbook.addWorksheet('Expense');
    expenseSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
    ];
    expenseList.forEach((e) => {
      expenseSheet.addRow({
        date: e.date.toLocaleDateString(),
        amount: e.amount,
        category: e.category || '',
        description: e.description || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=income-expense-report.xlsx');
    await workbook.xlsx.write(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

