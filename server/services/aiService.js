const OpenAI = require('openai');
const moment = require('moment-timezone');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async parseNaturalLanguageInput(input, userTimezone = 'UTC') {
    try {
      const prompt = `
You are an AI calendar assistant. Parse the following natural language input and extract calendar event information.

Input: "${input}"

Please respond with a JSON object containing:
- title: Event title
- description: Event description (if any)
- startTime: ISO 8601 datetime string
- endTime: ISO 8601 datetime string (if not specified, assume 1 hour duration)
- location: Object with name and address if mentioned
- attendees: Array of email addresses if mentioned
- reminders: Array of reminder objects with type and minutes
- category: One of: work, personal, meeting, travel, health, social, other
- priority: One of: low, medium, high, urgent

Rules:
- Use timezone: ${userTimezone}
- If no specific time is mentioned, assume today
- If no date is mentioned, assume today
- Parse relative times like "tomorrow", "next week", "in 2 hours"
- Extract location information if mentioned
- Identify recurring events if mentioned
- Set appropriate category based on context
- Set priority based on urgency indicators

Example response:
{
  "title": "Team Meeting",
  "description": "Weekly team sync",
  "startTime": "2024-01-15T10:00:00-08:00",
  "endTime": "2024-01-15T11:00:00-08:00",
  "location": {
    "name": "Conference Room A",
    "address": "123 Main St, City, State"
  },
  "attendees": ["john@example.com", "jane@example.com"],
  "reminders": [
    {"type": "email", "minutes": 15},
    {"type": "push", "minutes": 5}
  ],
  "category": "work",
  "priority": "medium"
}
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI calendar assistant. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const parsedResponse = JSON.parse(response.choices[0].message.content);
      return this.validateAndNormalizeEvent(parsedResponse, userTimezone);
    } catch (error) {
      console.error('Error parsing natural language input:', error);
      throw new Error('Failed to parse natural language input');
    }
  }

  async suggestOptimalSchedule(events, constraints, userTimezone = 'UTC') {
    try {
      const prompt = `
You are an AI scheduling assistant. Analyze the following events and constraints to suggest optimal scheduling.

Events: ${JSON.stringify(events)}
Constraints: ${JSON.stringify(constraints)}

Please suggest:
1. Optimal time slots for new events
2. Potential conflicts and resolutions
3. Travel time considerations
4. Energy level optimization (morning vs afternoon)
5. Buffer time recommendations

Respond with JSON containing:
- suggestedSlots: Array of optimal time slots
- conflicts: Array of identified conflicts
- recommendations: Array of scheduling recommendations
- travelOptimizations: Array of travel time optimizations
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert scheduling assistant. Provide practical, actionable scheduling advice."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error suggesting optimal schedule:', error);
      throw new Error('Failed to suggest optimal schedule');
    }
  }

  async autoRescheduleConflicts(conflictingEvents, userPreferences) {
    try {
      const prompt = `
You are an AI assistant that automatically reschedules conflicting events.

Conflicting Events: ${JSON.stringify(conflictingEvents)}
User Preferences: ${JSON.stringify(userPreferences)}

Please suggest rescheduling options for each conflicting event:
1. Alternative time slots
2. Duration adjustments
3. Location changes
4. Priority-based rescheduling

Respond with JSON containing:
- rescheduleOptions: Array of rescheduling options for each event
- recommendedActions: Array of recommended actions
- impactAnalysis: Analysis of the impact of each rescheduling option
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert at resolving scheduling conflicts. Provide practical rescheduling solutions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error auto-rescheduling conflicts:', error);
      throw new Error('Failed to auto-reschedule conflicts');
    }
  }

  async generateSmartReminders(event, userContext) {
    try {
      const prompt = `
Generate smart reminders for this event based on user context and preferences.

Event: ${JSON.stringify(event)}
User Context: ${JSON.stringify(userContext)}

Consider:
1. Travel time to location
2. Preparation time needed
3. User's typical schedule patterns
4. Weather conditions (if outdoor event)
5. Traffic patterns
6. Personal preferences

Respond with JSON containing:
- reminders: Array of reminder objects with type, timing, and message
- contextualAlerts: Array of contextual alerts
- preparationSuggestions: Array of preparation suggestions
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a smart reminder assistant. Generate contextual, helpful reminders."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating smart reminders:', error);
      throw new Error('Failed to generate smart reminders');
    }
  }

  validateAndNormalizeEvent(eventData, userTimezone) {
    // Validate required fields
    if (!eventData.title) {
      throw new Error('Event title is required');
    }

    // Normalize dates
    if (eventData.startTime) {
      eventData.startTime = moment.tz(eventData.startTime, userTimezone).toDate();
    }

    if (eventData.endTime) {
      eventData.endTime = moment.tz(eventData.endTime, userTimezone).toDate();
    } else if (eventData.startTime) {
      // Default to 1 hour duration if end time not specified
      eventData.endTime = moment(eventData.startTime).add(1, 'hour').toDate();
    }

    // Validate category
    const validCategories = ['work', 'personal', 'meeting', 'travel', 'health', 'social', 'other'];
    if (!validCategories.includes(eventData.category)) {
      eventData.category = 'personal';
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(eventData.priority)) {
      eventData.priority = 'medium';
    }

    // Validate reminders
    if (eventData.reminders) {
      eventData.reminders = eventData.reminders.filter(reminder => 
        reminder.type && reminder.minutes && 
        ['email', 'push', 'sms'].includes(reminder.type)
      );
    }

    return eventData;
  }
}

module.exports = new AIService();