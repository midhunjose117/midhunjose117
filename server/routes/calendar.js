const express = require('express');
const { body, validationResult } = require('express-validator');
const Event = require('../models/Event');
const aiService = require('../services/aiService');
const travelService = require('../services/travelService');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all events for a user
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, category, status } = req.query;
    const query = { userId: req.user.id };

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    const events = await Event.find(query)
      .sort({ startTime: 1 })
      .populate('userId', 'name email');

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get a specific event
router.get('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create a new event
router.post('/', [
  auth,
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const eventData = {
      ...req.body,
      userId: req.user.id,
      aiMetadata: {
        createdByVoice: req.body.createdByVoice || false,
        naturalLanguageInput: req.body.naturalLanguageInput || null
      }
    };

    // Check for conflicts
    const event = new Event(eventData);
    const hasConflict = await event.hasConflict();

    if (hasConflict && req.user.preferences.aiSettings.autoReschedule) {
      // Auto-reschedule logic
      const conflictingEvents = await Event.find({
        userId: req.user.id,
        status: { $in: ['scheduled', 'confirmed'] },
        startTime: { $lt: event.endTime },
        endTime: { $gt: event.startTime }
      });

      const rescheduleOptions = await aiService.autoRescheduleConflicts(
        conflictingEvents,
        req.user.preferences
      );

      return res.json({
        conflict: true,
        conflictingEvents,
        rescheduleOptions,
        message: 'Conflict detected. Auto-reschedule options provided.'
      });
    }

    // Add travel time if location is provided
    if (eventData.location && eventData.location.coordinates) {
      const travelTime = await travelService.estimateTravelTime(
        req.user.preferences.aiSettings.travelTimeBuffer,
        eventData.location.coordinates,
        eventData.startTime
      );
      eventData.travelTime = travelTime;
    }

    const savedEvent = await event.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update an event
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update event data
    Object.assign(event, req.body);
    event.updatedAt = new Date();

    // Check for conflicts after update
    const hasConflict = await event.hasConflict();
    if (hasConflict) {
      return res.status(409).json({
        error: 'Update would create a conflict',
        conflict: true
      });
    }

    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete an event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Parse natural language input
router.post('/parse-natural-language', [
  auth,
  body('input').notEmpty().withMessage('Input is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const parsedEvent = await aiService.parseNaturalLanguageInput(
      req.body.input,
      req.user.timezone
    );

    res.json(parsedEvent);
  } catch (error) {
    console.error('Error parsing natural language:', error);
    res.status(500).json({ error: 'Failed to parse natural language input' });
  }
});

// Get scheduling suggestions
router.post('/suggest-schedule', auth, async (req, res) => {
  try {
    const { events, constraints } = req.body;

    const suggestions = await aiService.suggestOptimalSchedule(
      events,
      constraints,
      req.user.timezone
    );

    res.json(suggestions);
  } catch (error) {
    console.error('Error getting scheduling suggestions:', error);
    res.status(500).json({ error: 'Failed to get scheduling suggestions' });
  }
});

// Get conflicts for a time range
router.get('/conflicts/:startDate/:endDate', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;

    const conflicts = await Event.find({
      userId: req.user.id,
      status: { $in: ['scheduled', 'confirmed'] },
      startTime: { $lt: new Date(endDate) },
      endTime: { $gt: new Date(startDate) }
    }).sort({ startTime: 1 });

    res.json(conflicts);
  } catch (error) {
    console.error('Error fetching conflicts:', error);
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
});

// Auto-reschedule conflicts
router.post('/auto-reschedule', auth, async (req, res) => {
  try {
    const { eventIds, rescheduleOptions } = req.body;

    const events = await Event.find({
      _id: { $in: eventIds },
      userId: req.user.id
    });

    if (events.length === 0) {
      return res.status(404).json({ error: 'No events found' });
    }

    const rescheduledEvents = [];
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const option = rescheduleOptions[i];

      if (option.newStartTime) {
        event.startTime = new Date(option.newStartTime);
      }
      if (option.newEndTime) {
        event.endTime = new Date(option.newEndTime);
      }
      if (option.newLocation) {
        event.location = option.newLocation;
      }

      event.aiMetadata.autoRescheduled = true;
      event.status = 'rescheduled';
      event.updatedAt = new Date();

      const savedEvent = await event.save();
      rescheduledEvents.push(savedEvent);
    }

    res.json({
      message: 'Events rescheduled successfully',
      events: rescheduledEvents
    });
  } catch (error) {
    console.error('Error auto-rescheduling:', error);
    res.status(500).json({ error: 'Failed to auto-reschedule events' });
  }
});

module.exports = router;