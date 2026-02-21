const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date },
  status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
  description: { type: String },
  invoiceNumber: { type: String, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
