const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  preferences: {
    defaultCalendarView: {
      type: String,
      enum: ['month', 'week', 'day', 'agenda'],
      default: 'month'
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' }
    },
    workingDays: {
      type: [String],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    aiSettings: {
      autoReschedule: { type: Boolean, default: true },
      travelTimeBuffer: { type: Number, default: 15 }, // minutes
      voiceCommands: { type: Boolean, default: true }
    }
  },
  devices: [{
    deviceId: String,
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'smartwatch', 'tablet']
    },
    lastSync: Date,
    isActive: { type: Boolean, default: true }
  }],
  nextcloudConfig: {
    url: String,
    username: String,
    encryptedPassword: String,
    calendarId: String,
    isConnected: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);