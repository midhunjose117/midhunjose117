const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Process voice input (audio file)
router.post('/process-audio', [
  auth,
  upload.single('audio')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // In a real implementation, you would:
    // 1. Convert audio to text using speech-to-text service (Google Speech-to-Text, Azure Speech, etc.)
    // 2. Process the text using AI service
    // 3. Return structured calendar data

    // For now, we'll simulate the process
    const mockTranscription = await simulateSpeechToText(req.file);
    const parsedEvent = await aiService.parseNaturalLanguageInput(
      mockTranscription,
      req.user.timezone
    );

    res.json({
      success: true,
      transcription: mockTranscription,
      parsedEvent,
      audioProcessed: true
    });
  } catch (error) {
    console.error('Error processing voice input:', error);
    res.status(500).json({ 
      error: 'Failed to process voice input',
      message: error.message 
    });
  }
});

// Process text input from voice (when client handles speech-to-text)
router.post('/process-text', [
  auth,
  body('text').notEmpty().withMessage('Text input is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text, context } = req.body;

    const parsedEvent = await aiService.parseNaturalLanguageInput(
      text,
      req.user.timezone
    );

    // Add voice metadata
    parsedEvent.aiMetadata = {
      ...parsedEvent.aiMetadata,
      createdByVoice: true,
      naturalLanguageInput: text,
      voiceContext: context
    };

    res.json({
      success: true,
      parsedEvent,
      originalText: text
    });
  } catch (error) {
    console.error('Error processing voice text:', error);
    res.status(500).json({ 
      error: 'Failed to process voice text',
      message: error.message 
    });
  }
});

// Get voice commands help
router.get('/commands', auth, async (req, res) => {
  try {
    const voiceCommands = {
      createEvent: [
        "Schedule a meeting with John tomorrow at 2 PM",
        "Add dentist appointment next Friday at 10 AM",
        "Create a reminder to call mom at 6 PM today"
      ],
      modifyEvent: [
        "Move my 3 PM meeting to 4 PM",
        "Change the location of tomorrow's meeting to conference room B",
        "Cancel my appointment on Friday"
      ],
      queryEvents: [
        "What do I have tomorrow?",
        "When is my next meeting?",
        "Show me my schedule for this week"
      ],
      reschedule: [
        "Reschedule all my meetings for tomorrow",
        "Move my morning meetings to the afternoon",
        "Find a better time for my 2 PM meeting"
      ]
    };

    res.json({
      success: true,
      commands: voiceCommands,
      tips: [
        "Speak clearly and naturally",
        "Include specific times and dates",
        "Mention locations when relevant",
        "Use natural language - no need for specific commands"
      ]
    });
  } catch (error) {
    console.error('Error getting voice commands:', error);
    res.status(500).json({ error: 'Failed to get voice commands' });
  }
});

// Simulate speech-to-text conversion
async function simulateSpeechToText(audioFile) {
  // In production, this would use a real speech-to-text service
  const mockTranscriptions = [
    "Schedule a meeting with the team tomorrow at 2 PM",
    "Add a dentist appointment next Friday at 10 AM",
    "Create a reminder to call mom at 6 PM today",
    "Move my 3 PM meeting to 4 PM",
    "What do I have scheduled for tomorrow?",
    "Cancel my appointment on Friday"
  ];

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
}

// Voice command validation
router.post('/validate-command', [
  auth,
  body('command').notEmpty().withMessage('Command is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { command } = req.body;

    // Analyze the command to determine its type and validity
    const commandAnalysis = await analyzeVoiceCommand(command);

    res.json({
      success: true,
      analysis: commandAnalysis,
      isValid: commandAnalysis.isValid,
      suggestions: commandAnalysis.suggestions
    });
  } catch (error) {
    console.error('Error validating voice command:', error);
    res.status(500).json({ 
      error: 'Failed to validate voice command',
      message: error.message 
    });
  }
});

async function analyzeVoiceCommand(command) {
  // Simple command analysis
  const commandTypes = {
    create: ['schedule', 'add', 'create', 'book', 'set'],
    modify: ['move', 'change', 'update', 'reschedule'],
    delete: ['cancel', 'delete', 'remove'],
    query: ['what', 'when', 'show', 'list', 'tell me']
  };

  const lowerCommand = command.toLowerCase();
  let commandType = 'unknown';
  let isValid = false;

  for (const [type, keywords] of Object.entries(commandTypes)) {
    if (keywords.some(keyword => lowerCommand.includes(keyword))) {
      commandType = type;
      isValid = true;
      break;
    }
  }

  return {
    commandType,
    isValid,
    suggestions: isValid ? [] : [
      "Try using words like 'schedule', 'add', 'move', or 'cancel'",
      "Be more specific about dates and times",
      "Include the event title or description"
    ]
  };
}

module.exports = router;