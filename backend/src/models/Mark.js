const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true },
  marks: { type: Number, required: true },
  maxMarks: { type: Number, default: 100 },
  examDate: { type: Date, default: Date.now },
  term: { type: String }, // e.g. "Mid-term", "Final"
}, { timestamps: true });

module.exports = mongoose.model('Mark', markSchema);
