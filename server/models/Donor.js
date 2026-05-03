// server/models/Donor.js
// Mongoose model for Donor

const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  // Mirror the SQLite structure for compatibility
  donorNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  nationalId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  firstName: { 
    type: String, 
    required: true 
  },
  lastName: { 
    type: String, 
    required: true 
  },
  dateOfBirth: { 
    type: String, 
    required: true 
  },
  gender: { 
    type: String, 
    required: true,
    enum: ['male', 'female']
  },
  bloodType: { 
    type: String, 
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  phone: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String,
    default: ''
  },
  address: { 
    type: String, 
    required: true 
  },
  city: { 
    type: String, 
    required: true 
  },
  emergencyContactName: { 
    type: String,
    default: ''
  },
  emergencyContactPhone: { 
    type: String,
    default: ''
  },
  lastDonationDate: { 
    type: String,
    default: null
  },
  totalDonations: { 
    type: Number, 
    default: 0 
  },
  isEligible: { 
    type: Boolean, 
    default: true 
  },
  notes: { 
    type: String,
    default: ''
  },
  version: { 
    type: Number, 
    default: 1 
  },
  // Timestamps will add createdAt and updatedAt
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for id (to match SQLite's id field)
donorSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Index for common queries
donorSchema.index({ donorNumber: 1 });
donorSchema.index({ nationalId: 1 });
donorSchema.index({ bloodType: 1 });

// Transform to match client-side expectations
donorSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.remoteId = ret._id.toString();
    ret.id = ret._id.toString();
    ret.createdAt = new Date(ret.createdAt).getTime();
    ret.updatedAt = new Date(ret.updatedAt).getTime();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Donor', donorSchema);
