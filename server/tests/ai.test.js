const aiService = require('../services/aiService');

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('AI Service', () => {
  const mockOpenAI = require('openai').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseNaturalLanguageInput', () => {
    it('should parse natural language input successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Team Meeting',
              description: 'Weekly team sync',
              startTime: '2024-01-15T10:00:00-08:00',
              endTime: '2024-01-15T11:00:00-08:00',
              location: {
                name: 'Conference Room A',
                address: '123 Main St, City, State'
              },
              attendees: ['john@example.com', 'jane@example.com'],
              reminders: [
                { type: 'email', minutes: 15 },
                { type: 'push', minutes: 5 }
              ],
              category: 'work',
              priority: 'medium'
            })
          }
        }]
      };

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }));

      const input = 'Schedule a team meeting tomorrow at 10 AM in Conference Room A';
      const result = await aiService.parseNaturalLanguageInput(input, 'America/Los_Angeles');

      expect(result).toHaveProperty('title', 'Team Meeting');
      expect(result).toHaveProperty('description', 'Weekly team sync');
      expect(result).toHaveProperty('category', 'work');
      expect(result).toHaveProperty('priority', 'medium');
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }));

      const input = 'Schedule a meeting';
      
      await expect(aiService.parseNaturalLanguageInput(input, 'UTC'))
        .rejects.toThrow('Failed to parse natural language input');
    });

    it('should validate and normalize event data', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Meeting',
              startTime: '2024-01-15T10:00:00Z',
              endTime: '2024-01-15T11:00:00Z',
              category: 'invalid-category',
              priority: 'invalid-priority',
              reminders: [
                { type: 'invalid-type', minutes: 15 },
                { type: 'email', minutes: 15 }
              ]
            })
          }
        }]
      };

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }));

      const input = 'Schedule a test meeting';
      const result = await aiService.parseNaturalLanguageInput(input, 'UTC');

      expect(result.category).toBe('personal'); // Default category
      expect(result.priority).toBe('medium'); // Default priority
      expect(result.reminders).toHaveLength(1); // Only valid reminder
      expect(result.reminders[0].type).toBe('email');
    });

    it('should set default end time if not provided', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Meeting',
              startTime: '2024-01-15T10:00:00Z'
              // No endTime provided
            })
          }
        }]
      };

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }));

      const input = 'Schedule a test meeting';
      const result = await aiService.parseNaturalLanguageInput(input, 'UTC');

      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.endTime.getTime() - result.startTime.getTime()).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe('suggestOptimalSchedule', () => {
    it('should suggest optimal schedule', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              suggestedSlots: [
                { start: '2024-01-15T09:00:00Z', end: '2024-01-15T10:00:00Z' },
                { start: '2024-01-15T14:00:00Z', end: '2024-01-15T15:00:00Z' }
              ],
              conflicts: [],
              recommendations: [
                'Schedule meetings in the morning for better focus',
                'Leave buffer time between meetings'
              ],
              travelOptimizations: [
                'Consider location proximity when scheduling back-to-back meetings'
              ]
            })
          }
        }]
      };

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }));

      const events = [
        { title: 'Meeting 1', startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T11:00:00Z' }
      ];
      const constraints = { workingHours: { start: '09:00', end: '17:00' } };

      const result = await aiService.suggestOptimalSchedule(events, constraints, 'UTC');

      expect(result).toHaveProperty('suggestedSlots');
      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('travelOptimizations');
      expect(result.suggestedSlots).toHaveLength(2);
    });
  });

  describe('autoRescheduleConflicts', () => {
    it('should auto-reschedule conflicts', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              rescheduleOptions: [
                {
                  eventId: 'event1',
                  newStartTime: '2024-01-15T14:00:00Z',
                  newEndTime: '2024-01-15T15:00:00Z',
                  reason: 'Conflict with higher priority event'
                }
              ],
              recommendedActions: [
                'Move the meeting to 2 PM',
                'Consider shortening the meeting duration'
              ],
              impactAnalysis: {
                affectedAttendees: 2,
                travelTimeImpact: 'minimal',
                productivityImpact: 'low'
              }
            })
          }
        }]
      };

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }));

      const conflictingEvents = [
        { _id: 'event1', title: 'Meeting 1', startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T11:00:00Z' }
      ];
      const userPreferences = { workingHours: { start: '09:00', end: '17:00' } };

      const result = await aiService.autoRescheduleConflicts(conflictingEvents, userPreferences);

      expect(result).toHaveProperty('rescheduleOptions');
      expect(result).toHaveProperty('recommendedActions');
      expect(result).toHaveProperty('impactAnalysis');
      expect(result.rescheduleOptions).toHaveLength(1);
    });
  });

  describe('generateSmartReminders', () => {
    it('should generate smart reminders', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              reminders: [
                { type: 'email', timing: '1 hour before', message: 'Meeting reminder: Team sync in 1 hour' },
                { type: 'push', timing: '15 minutes before', message: 'Leaving soon for team meeting' }
              ],
              contextualAlerts: [
                'Traffic is heavy - leave 10 minutes earlier',
                'Weather: Sunny, perfect for walking to the meeting'
              ],
              preparationSuggestions: [
                'Review agenda items',
                'Prepare presentation materials',
                'Check meeting room availability'
              ]
            })
          }
        }]
      };

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }));

      const event = {
        title: 'Team Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        location: { name: 'Conference Room A' }
      };
      const userContext = { timezone: 'UTC', preferences: { notifications: { email: true, push: true } } };

      const result = await aiService.generateSmartReminders(event, userContext);

      expect(result).toHaveProperty('reminders');
      expect(result).toHaveProperty('contextualAlerts');
      expect(result).toHaveProperty('preparationSuggestions');
      expect(result.reminders).toHaveLength(2);
    });
  });

  describe('validateAndNormalizeEvent', () => {
    it('should validate required fields', () => {
      const invalidEvent = {
        description: 'No title provided'
      };

      expect(() => {
        aiService.validateAndNormalizeEvent(invalidEvent, 'UTC');
      }).toThrow('Event title is required');
    });

    it('should normalize dates', () => {
      const eventData = {
        title: 'Test Event',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      const result = aiService.validateAndNormalizeEvent(eventData, 'UTC');

      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
    });

    it('should set default category and priority', () => {
      const eventData = {
        title: 'Test Event',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        category: 'invalid-category',
        priority: 'invalid-priority'
      };

      const result = aiService.validateAndNormalizeEvent(eventData, 'UTC');

      expect(result.category).toBe('personal');
      expect(result.priority).toBe('medium');
    });

    it('should filter invalid reminders', () => {
      const eventData = {
        title: 'Test Event',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        reminders: [
          { type: 'email', minutes: 15 },
          { type: 'invalid-type', minutes: 15 },
          { type: 'push', minutes: 5 }
        ]
      };

      const result = aiService.validateAndNormalizeEvent(eventData, 'UTC');

      expect(result.reminders).toHaveLength(2);
      expect(result.reminders[0].type).toBe('email');
      expect(result.reminders[1].type).toBe('push');
    });
  });
});