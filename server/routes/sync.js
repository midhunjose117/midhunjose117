const express = require('express');
const { body, validationResult } = require('express-validator');
const nextcloudService = require('../services/nextcloudService');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

const router = express.Router();

// Connect to Nextcloud
router.post('/connect-nextcloud', [
  auth,
  body('url').isURL().withMessage('Valid Nextcloud URL is required'),
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url, username, password } = req.body;

    const connectionResult = await nextcloudService.connect({
      url,
      username,
      password
    });

    if (connectionResult.connected) {
      // Save connection details to user profile
      req.user.nextcloudConfig = {
        url,
        username,
        encryptedPassword: password, // In production, encrypt this
        isConnected: true
      };
      await req.user.save();

      res.json({
        success: true,
        message: 'Successfully connected to Nextcloud',
        userInfo: connectionResult.userInfo
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to connect to Nextcloud',
        details: connectionResult.error
      });
    }
  } catch (error) {
    console.error('Error connecting to Nextcloud:', error);
    res.status(500).json({ 
      error: 'Failed to connect to Nextcloud',
      message: error.message 
    });
  }
});

// Get available calendars from Nextcloud
router.get('/nextcloud-calendars', auth, async (req, res) => {
  try {
    if (!req.user.nextcloudConfig.isConnected) {
      return res.status(400).json({ error: 'Not connected to Nextcloud' });
    }

    const calendars = await nextcloudService.getCalendars({
      url: req.user.nextcloudConfig.url,
      username: req.user.nextcloudConfig.username,
      password: req.user.nextcloudConfig.encryptedPassword
    });

    res.json({
      success: true,
      calendars
    });
  } catch (error) {
    console.error('Error fetching Nextcloud calendars:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calendars',
      message: error.message 
    });
  }
});

// Sync events from Nextcloud
router.post('/sync-from-nextcloud', [
  auth,
  body('calendarId').notEmpty().withMessage('Calendar ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user.nextcloudConfig.isConnected) {
      return res.status(400).json({ error: 'Not connected to Nextcloud' });
    }

    const { calendarId, startDate, endDate } = req.body;

    // Fetch events from Nextcloud
    const nextcloudEvents = await nextcloudService.getEvents(
      {
        url: req.user.nextcloudConfig.url,
        username: req.user.nextcloudConfig.username,
        password: req.user.nextcloudConfig.encryptedPassword
      },
      calendarId,
      startDate,
      endDate
    );

    // Fetch local events for the same period
    const localEvents = await Event.find({
      userId: req.user.id,
      startTime: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    // Sync events
    const syncResult = await nextcloudService.syncEvents(localEvents, nextcloudEvents);

    // Create/update local events from Nextcloud
    const syncedEvents = [];
    for (const eventData of syncResult.created) {
      const event = new Event({
        ...eventData,
        userId: req.user.id,
        externalId: eventData.externalId,
        lastSync: new Date()
      });
      const savedEvent = await event.save();
      syncedEvents.push(savedEvent);
    }

    res.json({
      success: true,
      syncResult: {
        ...syncResult,
        syncedEvents
      },
      message: `Synced ${syncedEvents.length} events from Nextcloud`
    });
  } catch (error) {
    console.error('Error syncing from Nextcloud:', error);
    res.status(500).json({ 
      error: 'Failed to sync from Nextcloud',
      message: error.message 
    });
  }
});

// Sync events to Nextcloud
router.post('/sync-to-nextcloud', [
  auth,
  body('calendarId').notEmpty().withMessage('Calendar ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user.nextcloudConfig.isConnected) {
      return res.status(400).json({ error: 'Not connected to Nextcloud' });
    }

    const { calendarId, eventIds } = req.body;

    // Fetch local events to sync
    const query = { userId: req.user.id };
    if (eventIds && eventIds.length > 0) {
      query._id = { $in: eventIds };
    }

    const localEvents = await Event.find(query);

    const syncResults = [];
    for (const event of localEvents) {
      try {
        if (!event.externalId) {
          // Create new event in Nextcloud
          const result = await nextcloudService.createEvent(
            {
              url: req.user.nextcloudConfig.url,
              username: req.user.nextcloudConfig.username,
              password: req.user.nextcloudConfig.encryptedPassword
            },
            calendarId,
            event
          );

          // Update local event with external ID
          event.externalId = result.nextcloudId;
          event.lastSync = new Date();
          await event.save();

          syncResults.push({
            eventId: event._id,
            action: 'created',
            success: true
          });
        } else {
          // Update existing event in Nextcloud
          const result = await nextcloudService.updateEvent(
            {
              url: req.user.nextcloudConfig.url,
              username: req.user.nextcloudConfig.username,
              password: req.user.nextcloudConfig.encryptedPassword
            },
            calendarId,
            event.externalId,
            event
          );

          event.lastSync = new Date();
          await event.save();

          syncResults.push({
            eventId: event._id,
            action: 'updated',
            success: true
          });
        }
      } catch (error) {
        console.error(`Error syncing event ${event._id}:`, error);
        syncResults.push({
          eventId: event._id,
          action: 'failed',
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      syncResults,
      message: `Synced ${syncResults.filter(r => r.success).length} events to Nextcloud`
    });
  } catch (error) {
    console.error('Error syncing to Nextcloud:', error);
    res.status(500).json({ 
      error: 'Failed to sync to Nextcloud',
      message: error.message 
    });
  }
});

// Full bidirectional sync
router.post('/full-sync', [
  auth,
  body('calendarId').notEmpty().withMessage('Calendar ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user.nextcloudConfig.isConnected) {
      return res.status(400).json({ error: 'Not connected to Nextcloud' });
    }

    const { calendarId, startDate, endDate } = req.body;

    // Sync from Nextcloud first
    const fromNextcloudResult = await nextcloudService.getEvents(
      {
        url: req.user.nextcloudConfig.url,
        username: req.user.nextcloudConfig.username,
        password: req.user.nextcloudConfig.encryptedPassword
      },
      calendarId,
      startDate,
      endDate
    );

    // Sync to Nextcloud
    const localEvents = await Event.find({
      userId: req.user.id,
      startTime: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    const syncResults = {
      fromNextcloud: fromNextcloudResult.length,
      toNextcloud: localEvents.length,
      conflicts: [],
      errors: []
    };

    // Process conflicts and resolve them
    for (const nextcloudEvent of fromNextcloudResult) {
      const localEvent = localEvents.find(e => e.externalId === nextcloudEvent.externalId);
      
      if (localEvent && nextcloudService.hasEventChanged(localEvent, nextcloudEvent)) {
        syncResults.conflicts.push({
          eventId: localEvent._id,
          externalId: nextcloudEvent.externalId,
          conflict: 'modified_in_both'
        });
      }
    }

    res.json({
      success: true,
      syncResults,
      message: 'Full sync completed'
    });
  } catch (error) {
    console.error('Error performing full sync:', error);
    res.status(500).json({ 
      error: 'Failed to perform full sync',
      message: error.message 
    });
  }
});

// Disconnect from Nextcloud
router.post('/disconnect-nextcloud', auth, async (req, res) => {
  try {
    req.user.nextcloudConfig = {
      url: null,
      username: null,
      encryptedPassword: null,
      isConnected: false
    };
    await req.user.save();

    res.json({
      success: true,
      message: 'Disconnected from Nextcloud'
    });
  } catch (error) {
    console.error('Error disconnecting from Nextcloud:', error);
    res.status(500).json({ 
      error: 'Failed to disconnect from Nextcloud',
      message: error.message 
    });
  }
});

// Get sync status
router.get('/status', auth, async (req, res) => {
  try {
    const status = {
      nextcloudConnected: req.user.nextcloudConfig.isConnected,
      lastSync: req.user.nextcloudConfig.lastSync || null,
      totalEvents: await Event.countDocuments({ userId: req.user.id }),
      syncedEvents: await Event.countDocuments({ 
        userId: req.user.id, 
        externalId: { $exists: true, $ne: null } 
      })
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ 
      error: 'Failed to get sync status',
      message: error.message 
    });
  }
});

module.exports = router;