const express = require('express');
const Invoice = require('../models/Invoice');
const Student = require('../models/Student');
const Income = require('../models/Income');
const ExcelJS = require('exceljs');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();
router.use(authenticate, authorizeRoles('superadmin', 'admin'));

const generateInvoiceNumber = async () => {
  const count = await Invoice.countDocuments();
  return `INV-${String(count + 1).padStart(5, '0')}-${Date.now().toString(36).toUpperCase()}`;
};

const generateBillNumber = async () => {
  const count = await Income.countDocuments({ source: 'fees' });
  return `BILL-${String(count + 1).padStart(5, '0')}`;
};

router.get('/', async (req, res) => {
  try {
    const { studentId, status } = req.query;
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;
    const invoices = await Invoice.find(filter)
      .populate('studentId', 'rollNo name mobile')
      .sort({ date: -1 });
    res.json(invoices);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const { studentId } = req.query;
    const filter = { source: 'fees', invoiceId: { $exists: true, $ne: null } };
    if (studentId) filter.studentId = studentId;

    const income = await Income.find(filter)
      .populate('invoiceId', 'invoiceNumber amount')
      .populate('studentId', 'rollNo name mobile')
      .sort({ date: 1, createdAt: 1 });

    const paidByInvoice = new Map();
    const history = income.map((i) => {
      const inv = i.invoiceId;
      const invId = inv?._id?.toString() || '';
      const invAmount = inv?.amount || 0;
      const prevPaid = paidByInvoice.get(invId) || 0;
      const newPaid = prevPaid + i.amount;
      paidByInvoice.set(invId, newPaid);
      const stu = i.studentId;

      return {
        _id: i._id,
        date: i.date,
        amountPaid: i.amount,
        invoiceId: inv?._id || null,
        invoiceNumber: inv?.invoiceNumber || null,
        billNo: i.billNo || null,
        invoiceAmount: invAmount,
        alreadyPaid: prevPaid,
        paymentMethod: i.paymentMethod || '',
        remainingPending: inv ? Math.max(0, invAmount - newPaid) : null,
        student: stu ? {
          _id: stu._id,
          rollNo: stu.rollNo || '',
          name: stu.name || '',
          mobile: stu.mobile || '',
        } : null,
      };
    });
    res.json(history.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/export/excel', async (req, res) => {
  try {
    const { view = 'outstanding', search = '', studentId } = req.query;
    const searchText = String(search || '').trim().toLowerCase();

    const invoiceFilter = {};
    if (studentId) invoiceFilter.studentId = studentId;

    const invoices = await Invoice.find(invoiceFilter)
      .populate('studentId', 'rollNo name mobile')
      .sort({ date: -1 });

    const filteredInvoices = invoices.filter((inv) => {
      const statusOk = view === 'paid'
        ? inv.status === 'paid'
        : view === 'outstanding'
          ? inv.status === 'pending' || inv.status === 'partial'
          : true;

      if (!statusOk) return false;
      if (!searchText || view === 'payment_history') return true;

      const student = inv.studentId || {};
      return (
        String(inv.invoiceNumber || '').toLowerCase().includes(searchText) ||
        String(student.rollNo || '').toLowerCase().includes(searchText) ||
        String(student.name || '').toLowerCase().includes(searchText)
      );
    });

    const workbook = new ExcelJS.Workbook();

    if (view === 'payment_history') {
      const paymentFilter = { source: 'fees', invoiceId: { $exists: true, $ne: null } };
      if (studentId) paymentFilter.studentId = studentId;

      const payments = await Income.find(paymentFilter)
        .populate('invoiceId', 'invoiceNumber amount')
        .populate('studentId', 'rollNo name mobile')
        .sort({ date: -1, createdAt: -1 });

      const sheet = workbook.addWorksheet('Payment History');
      sheet.columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Roll No', key: 'rollNo', width: 14 },
        { header: 'Student', key: 'student', width: 22 },
        { header: 'Invoice No', key: 'invoiceNo', width: 20 },
        { header: 'Bill No', key: 'billNo', width: 16 },
        { header: 'Amount Paid', key: 'amountPaid', width: 14 },
        { header: 'Payment Method', key: 'paymentMethod', width: 16 },
      ];

      payments.forEach((p) => {
        const student = p.studentId || {};
        const invoice = p.invoiceId || {};
        if (
          searchText &&
          !String(student.rollNo || '').toLowerCase().includes(searchText) &&
          !String(student.name || '').toLowerCase().includes(searchText) &&
          !String(invoice.invoiceNumber || '').toLowerCase().includes(searchText) &&
          !String(p.billNo || '').toLowerCase().includes(searchText)
        ) {
          return;
        }

        sheet.addRow({
          date: p.date ? new Date(p.date).toLocaleDateString('en-IN') : '',
          rollNo: student.rollNo || '',
          student: student.name || '',
          invoiceNo: invoice.invoiceNumber || '',
          billNo: p.billNo || '',
          amountPaid: p.amount || 0,
          paymentMethod: p.paymentMethod || '',
        });
      });
    } else {
      const sheet = workbook.addWorksheet('Invoices');
      sheet.columns = [
        { header: 'Invoice No', key: 'invoiceNo', width: 20 },
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Roll No', key: 'rollNo', width: 14 },
        { header: 'Student', key: 'student', width: 22 },
        { header: 'Amount', key: 'amount', width: 14 },
        { header: 'Paid', key: 'paid', width: 14 },
        { header: 'Pending', key: 'pending', width: 14 },
        { header: 'Status', key: 'status', width: 12 },
      ];

      filteredInvoices.forEach((inv) => {
        const student = inv.studentId || {};
        sheet.addRow({
          invoiceNo: inv.invoiceNumber || inv._id.toString().slice(-6),
          date: inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '',
          rollNo: student.rollNo || '',
          student: student.name || '',
          amount: inv.amount || 0,
          paid: inv.paidAmount || 0,
          pending: Math.max(0, (inv.amount || 0) - (inv.paidAmount || 0)),
          status: inv.status || '',
        });
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=billing-${view}-report.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { studentId, amount, description, dueDate } = req.body;
    const invoiceNumber = await generateInvoiceNumber();
    const invoice = new Invoice({
      studentId,
      amount,
      paidAmount: 0,
      status: 'pending',
      description: description || 'Admission / Course fees',
      invoiceNumber,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
    await invoice.save();

    const student = await Student.findById(studentId);
    if (student) {
      // Keep admission fee fixed; invoice creation should not increase student total fee.
      student.pendingAmount = Math.max(0, (student.totalFees || 0) - (student.paidAmount || 0));
      await student.save();
    }

    const populated = await Invoice.findById(invoice._id)
      .populate('studentId', 'rollNo name mobile');
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/pay', async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDate } = req.body;
    const invoice = await Invoice.findById(req.params.id).populate('studentId');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const payAmount = Math.min(Number(amount) || 0, invoice.amount - invoice.paidAmount);
    if (payAmount <= 0) return res.status(400).json({ error: 'Invalid payment amount' });

    const alreadyPaid = invoice.paidAmount;
    invoice.paidAmount += payAmount;
    invoice.status = invoice.paidAmount >= invoice.amount ? 'paid' : 'partial';
    await invoice.save();

    if (invoice.studentId) {
      const student = await Student.findById(invoice.studentId._id);
      if (student) {
        student.paidAmount = (student.paidAmount || 0) + payAmount;
        student.pendingAmount = student.totalFees - student.paidAmount;
        await student.save();
      }
    }

    const billNo = await generateBillNumber();
    const income = await Income.create({
      amount: payAmount,
      source: 'fees',
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      paymentMethod: paymentMethod || undefined,
      billNo,
      date: paymentDate ? new Date(paymentDate) : undefined,
      studentId: invoice.studentId?._id,
      invoiceId: invoice._id,
    });

    const updated = await Invoice.findById(invoice._id)
      .populate('studentId', 'rollNo name mobile');
    res.json({
      invoice: updated,
      payment: {
        _id: income._id,
        date: income.date,
        billNo: income.billNo || '',
        amountPaid: payAmount,
        alreadyPaid,
        remainingPending: Math.max(0, updated.amount - updated.paidAmount),
        invoiceId: updated._id,
        invoiceNumber: updated.invoiceNumber,
        paymentMethod: income.paymentMethod || '',
      },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('studentId', 'rollNo name mobile email address');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

