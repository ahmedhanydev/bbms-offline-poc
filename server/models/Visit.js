// server/models/Visit.js
// Mongoose model for Visit

const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  visitNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  visitDate: { 
    type: String, 
    required: true 
  },
  visitType: { 
    type: String, 
    required: true,
    enum: ['donation', 'checkup', 'deferral']
  },
  donorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Donor',
    required: true
  },
  donorRemoteId: {
    type: String,
    required: true
  },
  // Vitals
  weight: { 
    type: Number,
    default: null
  },
  bloodPressureSystolic: { 
    type: Number,
    default: null
  },
  bloodPressureDiastolic: { 
    type: Number,
    default: null
  },
  pulse: { 
    type: Number,
    default: null
  },
  temperature: { 
    type: Number,
    default: null
  },
  hemoglobin: { 
    type: Number,
    default: null
  },
  // Donation details
  bloodBagNumber: { 
    type: String,
    default: ''
  },
  bloodVolume: { 
    type: Number, 
    default: 0 
  },
  // Status
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'completed', 'deferred', 'rejected'],
    default: 'pending'
  },
  deferralReason: { 
    type: String,
    default: null
  },
  deferralUntil: { 
    type: String,
    default: null
  },
  // Staff
  registeredBy: { 
    type: String,
    default: ''
  },
  screenedBy: { 
    type: String,
    default: ''
  },
  collectedBy: { 
    type: String,
    default: ''
  },
  notes: { 
    type: String,
    default: ''
  },
  version: { 
    type: Number, 
    default: 1 
  },
}, { 
  timestamps: true 
});

// Virtual for id
visitSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Indexes
visitSchema.index({ donorId: 1 });
visitSchema.index({ visitDate: 1 });
visitSchema.index({ visitNumber: 1 });

// Transform to match client-side expectations
visitSchema.set('toJSON', {
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

module.exports = mongoose.model('Visit', visitSchema);
