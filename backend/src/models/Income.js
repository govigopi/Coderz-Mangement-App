const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  source: { type: String }, // fees, other
  description: { type: String },
  paymentMethod: { type: String },
  billNo: { type: String },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
}, { timestamps: true });

module.exports = mongoose.model('Income', incomeSchema);
