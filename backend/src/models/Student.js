const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNo: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true },
  email: { type: String },
  mobile: { type: String, required: true },
  qualification: { type: String },
  dateOfBirth: { type: Date },
  mode: { type: String, enum: ['online', 'offline'], default: 'offline' },
  guardianName: { type: String },
  guardianMobile: { type: String },
  address: { type: String },
  admissionDate: { type: Date, required: true, default: Date.now },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  courseFee: { type: Number, default: 0 },
  totalFees: { type: Number, required: true, default: 0 },
  paidAmount: { type: Number, default: 0 },
  pendingAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'completed', 'drop_out'], default: 'active' },
  certificateIssued: { type: Boolean, default: false },
}, { timestamps: true });

studentSchema.pre('validate', function (next) {
  if (this.rollNo) {
    let normalized = String(this.rollNo).trim().toUpperCase();
    // Remove any trailing CA suffix(es), then ensure CA prefix.
    normalized = normalized.replace(/CA+$/, '');
    this.rollNo = normalized.startsWith('CA') ? normalized : `CA${normalized}`;
  }
  next();
});

studentSchema.pre('save', function (next) {
  this.pendingAmount = Math.max(0, this.totalFees - this.paidAmount);
  next();
});

module.exports = mongoose.model('Student', studentSchema);
