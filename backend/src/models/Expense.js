const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  category: { type: String }, // Salaries, Rent, Utilities, etc.
  description: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
