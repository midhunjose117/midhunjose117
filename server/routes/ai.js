const express = require('express');
const { body, validationResult } = require('express-validator');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');

const router = express.Router();

// Parse natural language input
router.post('/parse-input', [
  auth,
  body('input').notEmpty().withMessage('Input is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { input } = req.body;
    const parsedEvent = await aiService.parseNaturalLanguageInput(input, req.user.timezone);

    res.json({
      success: true,
      parsedEvent,
      originalInput: input
    });
  } catch (error) {
    console.error('Error parsing AI input:', error);
    res.status(500).json({ 
      error: 'Failed to parse input',
      message: error.message 
    });
  }
});

// Get scheduling suggestions
router.post('/suggest-schedule', auth, async (req, res) => {
  try {
    const { events, constraints, preferences } = req.body;

    const suggestions = await aiService.suggestOptimalSchedule(
      events,
      constraints,
      req.user.timezone
    );

    res.json({
      success: true,
      suggestions,
      userPreferences: req.user.preferences
    });
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to get suggestions',
      message: error.message 
    });
  }
});

// Auto-resolve conflicts
router.post('/resolve-conflicts', auth, async (req, res) => {
  try {
    const { conflictingEvents, userPreferences } = req.body;

    const resolutionOptions = await aiService.autoRescheduleConflicts(
      conflictingEvents,
      userPreferences || req.user.preferences
    );

    res.json({
      success: true,
      resolutionOptions,
      conflictsResolved: resolutionOptions.rescheduleOptions?.length || 0
    });
  } catch (error) {
    console.error('Error resolving conflicts:', error);
    res.status(500).json({ 
      error: 'Failed to resolve conflicts',
      message: error.message 
    });
  }
});

// Generate smart reminders
router.post('/smart-reminders', auth, async (req, res) => {
  try {
    const { event, context } = req.body;

    const smartReminders = await aiService.generateSmartReminders(
      event,
      context || req.user.preferences
    );

    res.json({
      success: true,
      reminders: smartReminders.reminders,
      contextualAlerts: smartReminders.contextualAlerts,
      preparationSuggestions: smartReminders.preparationSuggestions
    });
  } catch (error) {
    console.error('Error generating smart reminders:', error);
    res.status(500).json({ 
      error: 'Failed to generate smart reminders',
      message: error.message 
    });
  }
});

// Analyze calendar patterns
router.post('/analyze-patterns', auth, async (req, res) => {
  try {
    const { events, timeRange } = req.body;

    // This would use AI to analyze calendar patterns
    const analysis = {
      busyTimes: this.findBusyTimes(events),
      freeTimeSlots: this.findFreeTimeSlots(events, timeRange),
      productivityPatterns: this.analyzeProductivityPatterns(events),
      recommendations: this.generateRecommendations(events, req.user.preferences)
    };

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    res.status(500).json({ 
      error: 'Failed to analyze patterns',
      message: error.message 
    });
  }
});

// Helper methods for pattern analysis
function findBusyTimes(events) {
  const busyHours = {};
  
  events.forEach(event => {
    const hour = new Date(event.startTime).getHours();
    busyHours[hour] = (busyHours[hour] || 0) + 1;
  });

  return Object.entries(busyHours)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }));
}

function findFreeTimeSlots(events, timeRange) {
  // Simplified free time calculation
  const freeSlots = [];
  const sortedEvents = events.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEnd = new Date(sortedEvents[i].endTime);
    const nextStart = new Date(sortedEvents[i + 1].startTime);
    const gap = nextStart - currentEnd;
    
    if (gap > 30 * 60 * 1000) { // More than 30 minutes
      freeSlots.push({
        start: currentEnd,
        end: nextStart,
        duration: Math.round(gap / (60 * 1000)) // in minutes
      });
    }
  }
  
  return freeSlots;
}

function analyzeProductivityPatterns(events) {
  const patterns = {
    mostProductiveHours: findBusyTimes(events),
    averageMeetingDuration: calculateAverageDuration(events),
    meetingFrequency: events.length,
    workLifeBalance: calculateWorkLifeBalance(events)
  };
  
  return patterns;
}

function calculateAverageDuration(events) {
  if (events.length === 0) return 0;
  
  const totalDuration = events.reduce((sum, event) => {
    return sum + (new Date(event.endTime) - new Date(event.startTime));
  }, 0);
  
  return Math.round(totalDuration / events.length / (60 * 1000)); // in minutes
}

function calculateWorkLifeBalance(events) {
  const workEvents = events.filter(event => event.category === 'work');
  const personalEvents = events.filter(event => event.category === 'personal');
  
  return {
    workEvents: workEvents.length,
    personalEvents: personalEvents.length,
    balance: personalEvents.length / (workEvents.length + personalEvents.length) || 0
  };
}

function generateRecommendations(events, preferences) {
  const recommendations = [];
  
  if (events.length > 20) {
    recommendations.push({
      type: 'overbooking',
      message: 'You have many events scheduled. Consider reducing your commitments.',
      priority: 'high'
    });
  }
  
  const workLifeBalance = calculateWorkLifeBalance(events);
  if (workLifeBalance.balance < 0.3) {
    recommendations.push({
      type: 'work_life_balance',
      message: 'Consider scheduling more personal time to maintain work-life balance.',
      priority: 'medium'
    });
  }
  
  return recommendations;
}

module.exports = router;