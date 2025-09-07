import React, { useState, useEffect } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { Mic, MicOff, Play, Square, Volume2, Calendar, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const VoiceAssistant = () => {
  const { parseNaturalLanguage, createEvent } = useCalendar();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedEvent, setParsedEvent] = useState(null);
  const [voiceCommands, setVoiceCommands] = useState([]);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        setIsRecording(true);
        toast.success('Listening...');
      };

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
        if (transcript.trim()) {
          processVoiceInput(transcript);
        }
      };

      recognitionInstance.onerror = (event) => {
        setIsRecording(false);
        toast.error('Speech recognition error: ' + event.error);
      };

      setRecognition(recognitionInstance);
    } else {
      toast.error('Speech recognition not supported in this browser');
    }

    // Load voice commands help
    loadVoiceCommands();
  }, []);

  const loadVoiceCommands = async () => {
    try {
      const response = await fetch('/api/voice/commands');
      const data = await response.json();
      if (data.success) {
        setVoiceCommands(data.commands);
      }
    } catch (error) {
      console.error('Failed to load voice commands:', error);
    }
  };

  const startRecording = () => {
    if (recognition) {
      setTranscript('');
      setParsedEvent(null);
      recognition.start();
    }
  };

  const stopRecording = () => {
    if (recognition && isRecording) {
      recognition.stop();
    }
  };

  const processVoiceInput = async (input) => {
    setIsProcessing(true);
    try {
      const result = await parseNaturalLanguage(input);
      if (result.success) {
        setParsedEvent(result.data);
        toast.success('Voice input processed successfully!');
      } else {
        toast.error('Failed to process voice input');
      }
    } catch (error) {
      toast.error('Error processing voice input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!parsedEvent) return;

    try {
      const result = await createEvent({
        ...parsedEvent,
        aiMetadata: {
          createdByVoice: true,
          naturalLanguageInput: transcript
        }
      });

      if (result.success) {
        setParsedEvent(null);
        setTranscript('');
        toast.success('Event created successfully!');
      } else if (result.conflict) {
        toast.error('Conflict detected! Please resolve conflicts.');
      }
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const exampleCommands = [
    "Schedule a meeting with John tomorrow at 2 PM",
    "Add dentist appointment next Friday at 10 AM",
    "Create a reminder to call mom at 6 PM today",
    "Move my 3 PM meeting to 4 PM",
    "What do I have tomorrow?",
    "Show me my schedule for this week"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Voice Assistant</h1>
        <p className="text-gray-600">Use natural language to manage your calendar</p>
      </div>

      {/* Voice Recording Interface */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Voice Input</h3>
        </div>
        <div className="card-content">
          <div className="text-center space-y-6">
            {/* Recording Button */}
            <div className="flex justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-primary-600 hover:bg-primary-700'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? (
                  <Square className="h-8 w-8 text-white" />
                ) : (
                  <Mic className="h-8 w-8 text-white" />
                )}
              </button>
            </div>

            {/* Status */}
            <div className="text-center">
              {isRecording && (
                <p className="text-red-600 font-medium animate-pulse">Listening...</p>
              )}
              {isProcessing && (
                <p className="text-blue-600 font-medium">Processing...</p>
              )}
              {!isRecording && !isProcessing && (
                <p className="text-gray-600">Click the microphone to start recording</p>
              )}
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Transcript:</h4>
                <p className="text-gray-700">{transcript}</p>
                <button
                  onClick={() => speakText(transcript)}
                  className="mt-2 text-primary-600 hover:text-primary-700 flex items-center"
                >
                  <Volume2 className="h-4 w-4 mr-1" />
                  Listen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Parsed Event Preview */}
      {parsedEvent && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Event Preview</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{parsedEvent.title}</p>
                  {parsedEvent.description && (
                    <p className="text-sm text-gray-600">{parsedEvent.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-900">
                    {new Date(parsedEvent.startTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Duration: {Math.round((new Date(parsedEvent.endTime) - new Date(parsedEvent.startTime)) / (1000 * 60))} minutes
                  </p>
                </div>
              </div>

              {parsedEvent.location && (
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <p className="text-sm text-gray-900">
                    {parsedEvent.location.name || parsedEvent.location}
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateEvent}
                  className="btn btn-primary btn-md"
                >
                  Create Event
                </button>
                <button
                  onClick={() => {
                    setParsedEvent(null);
                    setTranscript('');
                  }}
                  className="btn btn-outline btn-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Example Commands */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Example Commands</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exampleCommands.map((command, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setTranscript(command);
                  processVoiceInput(command);
                }}
              >
                <p className="text-sm text-gray-700">"{command}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voice Commands Help */}
      {voiceCommands && Object.keys(voiceCommands).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Voice Commands Help</h3>
          </div>
          <div className="card-content">
            <div className="space-y-6">
              {Object.entries(voiceCommands).map(([category, commands]) => (
                <div key={category}>
                  <h4 className="font-medium text-gray-900 capitalize mb-2">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <ul className="space-y-1">
                    {commands.map((command, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {command}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAssistant;