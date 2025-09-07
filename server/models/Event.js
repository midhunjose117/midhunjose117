const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  location: {
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  attendees: [{
    email: String,
    name: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'tentative'],
      default: 'pending'
    }
  }],
  recurrence: {
    frequency: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'none'
    },
    interval: { type: Number, default: 1 },
    daysOfWeek: [String],
    endDate: Date,
    count: Number
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'push', 'sms'],
      required: true
    },
    minutes: {
      type: Number,
      required: true
    }
  }],
  travelTime: {
    estimated: Number, // minutes
    buffer: Number, // minutes
    mode: {
      type: String,
      enum: ['driving', 'walking', 'transit', 'cycling'],
      default: 'driving'
    }
  },
  aiMetadata: {
    createdByVoice: { type: Boolean, default: false },
    naturalLanguageInput: String,
    autoRescheduled: { type: Boolean, default: false },
    conflictResolved: { type: Boolean, default: false },
    suggestedByAI: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed', 'rescheduled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'meeting', 'travel', 'health', 'social', 'other'],
    default: 'personal'
  },
  externalId: String, // For Nextcloud sync
  lastSync: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
eventSchema.index({ userId: 1, startTime: 1 });
eventSchema.index({ userId: 1, status: 1 });
eventSchema.index({ externalId: 1 });

// Update timestamp
eventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for duration
eventSchema.virtual('duration').get(function() {
  return this.endTime - this.startTime;
});

// Method to check for conflicts
eventSchema.methods.hasConflict = async function() {
  const Event = this.constructor;
  const conflictingEvents = await Event.find({
    userId: this.userId,
    _id: { $ne: this._id },
    status: { $in: ['scheduled', 'confirmed'] },
    $or: [
      {
        startTime: { $lt: this.endTime },
        endTime: { $gt: this.startTime }
      }
    ]
  });
  
  return conflictingEvents.length > 0;
};

module.exports = mongoose.model('Event', eventSchema);