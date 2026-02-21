const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: String }, // e.g. "6 months", "1 year"
  fee: { type: Number, required: true, default: 0 },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
