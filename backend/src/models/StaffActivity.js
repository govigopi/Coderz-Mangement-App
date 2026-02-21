const mongoose = require('mongoose');

const staffActivitySchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  activityDate: { type: Date, required: true, index: true },
  type: {
    type: String,
    enum: ['call', 'follow_up', 'admission', 'fee_collection', 'class_support', 'other'],
    default: 'other',
    required: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  notes: { type: String, trim: true, maxlength: 1000 },
  studentName: { type: String, trim: true, maxlength: 120 },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending', required: true },
}, { timestamps: true });

module.exports = mongoose.model('StaffActivity', staffActivitySchema);
