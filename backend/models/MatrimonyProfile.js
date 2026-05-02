const mongoose = require('mongoose');

const matrimonyProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  // Personal Info
  age: { type: Number, min: 18, max: 100 },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  height: { type: String, default: '' }, // e.g. "5'8\""
  religion: { type: String, default: '' },
  caste: { type: String, default: '' },
  motherTongue: { type: String, default: '' },
  maritalStatus: {
    type: String,
    enum: ['never_married', 'divorced', 'widowed', 'separated'],
    default: 'never_married',
  },

  // Education & Career
  education: { type: String, default: '' },
  occupation: { type: String, default: '' },
  income: { type: String, default: '' }, // e.g. "5-10 LPA"

  // Location
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: 'India' },

  // About
  about: { type: String, default: '', maxlength: 500 },

  // Photos (additional photos beyond profile pic)
  photos: [{ type: String }],

  // Preferences
  partnerPreferences: {
    ageMin: { type: Number, default: 18 },
    ageMax: { type: Number, default: 40 },
    religion: { type: String, default: '' },
    education: { type: String, default: '' },
    city: { type: String, default: '' },
  },

  // Interests
  interests: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['sent', 'accepted', 'rejected'], default: 'sent' },
    createdAt: { type: Date, default: Date.now },
  }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

matrimonyProfileSchema.index({ gender: 1, age: 1, city: 1 });
matrimonyProfileSchema.index({ userId: 1 });

module.exports = mongoose.model('MatrimonyProfile', matrimonyProfileSchema);
