const request = require('supertest');
const app = require('../index');
const User = require('../models/User');
const Event = require('../models/Event');
const mongoose = require('mongoose');

describe('Calendar Routes', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-calendar-test');
  });

  afterAll(async () => {
    // Clean up test database
    await User.deleteMany({});
    await Event.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear data before each test
    await User.deleteMany({});
    await Event.deleteMany({});

    // Create a test user and get auth token
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  describe('GET /api/calendar', () => {
    beforeEach(async () => {
      // Create test events
      const events = [
        {
          userId: userId,
          title: 'Meeting 1',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          category: 'work'
        },
        {
          userId: userId,
          title: 'Meeting 2',
          startTime: new Date('2024-01-16T14:00:00Z'),
          endTime: new Date('2024-01-16T15:00:00Z'),
          category: 'personal'
        }
      ];

      await Event.insertMany(events);
    });

    it('should get all events for authenticated user', async () => {
      const response = await request(app)
        .get('/api/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('title', 'Meeting 1');
      expect(response.body[1]).toHaveProperty('title', 'Meeting 2');
    });

    it('should filter events by date range', async () => {
      const response = await request(app)
        .get('/api/calendar')
        .query({
          startDate: '2024-01-15T00:00:00Z',
          endDate: '2024-01-15T23:59:59Z'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('title', 'Meeting 1');
    });

    it('should filter events by category', async () => {
      const response = await request(app)
        .get('/api/calendar')
        .query({ category: 'work' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('category', 'work');
    });

    it('should not get events without authentication', async () => {
      const response = await request(app)
        .get('/api/calendar')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'No token provided');
    });
  });

  describe('POST /api/calendar', () => {
    it('should create a new event', async () => {
      const eventData = {
        title: 'New Meeting',
        description: 'Test meeting',
        startTime: '2024-01-20T10:00:00Z',
        endTime: '2024-01-20T11:00:00Z',
        location: 'Conference Room A',
        category: 'work',
        priority: 'medium'
      };

      const response = await request(app)
        .post('/api/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body).toHaveProperty('title', 'New Meeting');
      expect(response.body).toHaveProperty('description', 'Test meeting');
      expect(response.body).toHaveProperty('userId', userId);
      expect(response.body).toHaveProperty('category', 'work');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should validate date formats', async () => {
      const eventData = {
        title: 'Invalid Event',
        startTime: 'invalid-date',
        endTime: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should not create event without authentication', async () => {
      const eventData = {
        title: 'Unauthorized Event',
        startTime: '2024-01-20T10:00:00Z',
        endTime: '2024-01-20T11:00:00Z'
      };

      const response = await request(app)
        .post('/api/calendar')
        .send(eventData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'No token provided');
    });
  });

  describe('GET /api/calendar/:id', () => {
    let eventId;

    beforeEach(async () => {
      // Create a test event
      const eventData = {
        userId: userId,
        title: 'Test Event',
        startTime: new Date('2024-01-20T10:00:00Z'),
        endTime: new Date('2024-01-20T11:00:00Z')
      };

      const event = await Event.create(eventData);
      eventId = event._id.toString();
    });

    it('should get a specific event', async () => {
      const response = await request(app)
        .get(`/api/calendar/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Test Event');
      expect(response.body).toHaveProperty('_id', eventId);
    });

    it('should not get event that does not belong to user', async () => {
      // Create another user and event
      const anotherUserData = {
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123'
      };

      const anotherUserResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUserData);

      const anotherEventData = {
        userId: anotherUserResponse.body.user.id,
        title: 'Another Event',
        startTime: new Date('2024-01-20T10:00:00Z'),
        endTime: new Date('2024-01-20T11:00:00Z')
      };

      const anotherEvent = await Event.create(anotherEventData);

      const response = await request(app)
        .get(`/api/calendar/${anotherEvent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Event not found');
    });

    it('should not get non-existent event', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/calendar/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Event not found');
    });
  });

  describe('PUT /api/calendar/:id', () => {
    let eventId;

    beforeEach(async () => {
      // Create a test event
      const eventData = {
        userId: userId,
        title: 'Test Event',
        startTime: new Date('2024-01-20T10:00:00Z'),
        endTime: new Date('2024-01-20T11:00:00Z')
      };

      const event = await Event.create(eventData);
      eventId = event._id.toString();
    });

    it('should update an event', async () => {
      const updateData = {
        title: 'Updated Event',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/calendar/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Updated Event');
      expect(response.body).toHaveProperty('description', 'Updated description');
    });

    it('should not update event that does not belong to user', async () => {
      // Create another user and event
      const anotherUserData = {
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123'
      };

      const anotherUserResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUserData);

      const anotherEventData = {
        userId: anotherUserResponse.body.user.id,
        title: 'Another Event',
        startTime: new Date('2024-01-20T10:00:00Z'),
        endTime: new Date('2024-01-20T11:00:00Z')
      };

      const anotherEvent = await Event.create(anotherEventData);

      const updateData = {
        title: 'Hacked Event'
      };

      const response = await request(app)
        .put(`/api/calendar/${anotherEvent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Event not found');
    });
  });

  describe('DELETE /api/calendar/:id', () => {
    let eventId;

    beforeEach(async () => {
      // Create a test event
      const eventData = {
        userId: userId,
        title: 'Test Event',
        startTime: new Date('2024-01-20T10:00:00Z'),
        endTime: new Date('2024-01-20T11:00:00Z')
      };

      const event = await Event.create(eventData);
      eventId = event._id.toString();
    });

    it('should delete an event', async () => {
      const response = await request(app)
        .delete(`/api/calendar/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Event deleted successfully');

      // Verify event is deleted
      const deletedEvent = await Event.findById(eventId);
      expect(deletedEvent).toBeNull();
    });

    it('should not delete event that does not belong to user', async () => {
      // Create another user and event
      const anotherUserData = {
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123'
      };

      const anotherUserResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUserData);

      const anotherEventData = {
        userId: anotherUserResponse.body.user.id,
        title: 'Another Event',
        startTime: new Date('2024-01-20T10:00:00Z'),
        endTime: new Date('2024-01-20T11:00:00Z')
      };

      const anotherEvent = await Event.create(anotherEventData);

      const response = await request(app)
        .delete(`/api/calendar/${anotherEvent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Event not found');
    });
  });

  describe('POST /api/calendar/parse-natural-language', () => {
    it('should parse natural language input', async () => {
      const input = 'Schedule a meeting with John tomorrow at 2 PM';

      const response = await request(app)
        .post('/api/calendar/parse-natural-language')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ input })
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('startTime');
      expect(response.body).toHaveProperty('endTime');
    });

    it('should validate input field', async () => {
      const response = await request(app)
        .post('/api/calendar/parse-natural-language')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });
});