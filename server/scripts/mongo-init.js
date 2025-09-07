// MongoDB initialization script
db = db.getSiblingDB('ai-calendar');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        name: {
          bsonType: 'string',
          minLength: 1
        }
      }
    }
  }
});

db.createCollection('events', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'title', 'startTime', 'endTime'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        title: {
          bsonType: 'string',
          minLength: 1
        },
        startTime: {
          bsonType: 'date'
        },
        endTime: {
          bsonType: 'date'
        },
        status: {
          bsonType: 'string',
          enum: ['scheduled', 'confirmed', 'cancelled', 'completed', 'rescheduled']
        },
        priority: {
          bsonType: 'string',
          enum: ['low', 'medium', 'high', 'urgent']
        },
        category: {
          bsonType: 'string',
          enum: ['work', 'personal', 'meeting', 'travel', 'health', 'social', 'other']
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

db.events.createIndex({ userId: 1, startTime: 1 });
db.events.createIndex({ userId: 1, status: 1 });
db.events.createIndex({ externalId: 1 });
db.events.createIndex({ startTime: 1, endTime: 1 });

// Create a test user (optional)
db.users.insertOne({
  email: 'test@example.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J8K8K8K8K', // password123
  name: 'Test User',
  timezone: 'UTC',
  preferences: {
    defaultCalendarView: 'month',
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    aiSettings: {
      autoReschedule: true,
      travelTimeBuffer: 15,
      voiceCommands: true
    }
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully!');