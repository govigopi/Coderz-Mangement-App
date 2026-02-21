const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  course: { type: String, required: true, trim: true },
  qualification: { type: String, required: true, trim: true },
  status: { type: String, enum: ['joined', 'not_joined'], default: 'not_joined' },
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
