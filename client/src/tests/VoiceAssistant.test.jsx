import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { CalendarProvider } from '../contexts/CalendarContext';
import VoiceAssistant from '../pages/VoiceAssistant';

// Mock the calendar context
const mockCalendarContext = {
  parseNaturalLanguage: jest.fn(),
  createEvent: jest.fn(),
  events: [],
  loading: false,
  error: null
};

// Mock the auth context
const mockAuthContext = {
  user: {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    timezone: 'UTC'
  },
  token: 'mock-token'
};

// Mock fetch
global.fetch = jest.fn();

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={mockAuthContext}>
        <CalendarProvider value={mockCalendarContext}>
          {component}
        </CalendarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('VoiceAssistant Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  it('renders voice assistant interface', () => {
    renderWithProviders(<VoiceAssistant />);
    
    expect(screen.getByText('Voice Assistant')).toBeInTheDocument();
    expect(screen.getByText('Use natural language to manage your calendar')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays microphone button', () => {
    renderWithProviders(<VoiceAssistant />);
    
    const micButton = screen.getByRole('button');
    expect(micButton).toBeInTheDocument();
  });

  it('shows example commands', () => {
    renderWithProviders(<VoiceAssistant />);
    
    expect(screen.getByText('Example Commands')).toBeInTheDocument();
    expect(screen.getByText(/Schedule a meeting with John tomorrow at 2 PM/)).toBeInTheDocument();
  });

  it('handles voice command click', async () => {
    mockCalendarContext.parseNaturalLanguage.mockResolvedValue({
      success: true,
      data: {
        title: 'Meeting with John',
        startTime: '2024-01-15T14:00:00Z',
        endTime: '2024-01-15T15:00:00Z'
      }
    });

    renderWithProviders(<VoiceAssistant />);
    
    const commandButton = screen.getByText(/Schedule a meeting with John tomorrow at 2 PM/);
    fireEvent.click(commandButton);

    await waitFor(() => {
      expect(mockCalendarContext.parseNaturalLanguage).toHaveBeenCalledWith(
        'Schedule a meeting with John tomorrow at 2 PM'
      );
    });
  });

  it('displays parsed event preview', async () => {
    const mockParsedEvent = {
      title: 'Meeting with John',
      description: 'Weekly team sync',
      startTime: '2024-01-15T14:00:00Z',
      endTime: '2024-01-15T15:00:00Z',
      location: {
        name: 'Conference Room A'
      }
    };

    mockCalendarContext.parseNaturalLanguage.mockResolvedValue({
      success: true,
      data: mockParsedEvent
    });

    renderWithProviders(<VoiceAssistant />);
    
    const commandButton = screen.getByText(/Schedule a meeting with John tomorrow at 2 PM/);
    fireEvent.click(commandButton);

    await waitFor(() => {
      expect(screen.getByText('Event Preview')).toBeInTheDocument();
      expect(screen.getByText('Meeting with John')).toBeInTheDocument();
      expect(screen.getByText('Weekly team sync')).toBeInTheDocument();
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });
  });

  it('creates event from parsed data', async () => {
    const mockParsedEvent = {
      title: 'Meeting with John',
      startTime: '2024-01-15T14:00:00Z',
      endTime: '2024-01-15T15:00:00Z'
    };

    mockCalendarContext.parseNaturalLanguage.mockResolvedValue({
      success: true,
      data: mockParsedEvent
    });

    mockCalendarContext.createEvent.mockResolvedValue({
      success: true
    });

    renderWithProviders(<VoiceAssistant />);
    
    const commandButton = screen.getByText(/Schedule a meeting with John tomorrow at 2 PM/);
    fireEvent.click(commandButton);

    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Event');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCalendarContext.createEvent).toHaveBeenCalledWith({
        ...mockParsedEvent,
        aiMetadata: {
          createdByVoice: true,
          naturalLanguageInput: 'Schedule a meeting with John tomorrow at 2 PM'
        }
      });
    });
  });

  it('handles voice command errors', async () => {
    mockCalendarContext.parseNaturalLanguage.mockRejectedValue(new Error('Parse error'));

    renderWithProviders(<VoiceAssistant />);
    
    const commandButton = screen.getByText(/Schedule a meeting with John tomorrow at 2 PM/);
    fireEvent.click(commandButton);

    await waitFor(() => {
      // Should handle error gracefully
      expect(mockCalendarContext.parseNaturalLanguage).toHaveBeenCalled();
    });
  });

  it('loads voice commands help on mount', async () => {
    const mockVoiceCommands = {
      createEvent: [
        'Schedule a meeting with John tomorrow at 2 PM',
        'Add dentist appointment next Friday at 10 AM'
      ],
      modifyEvent: [
        'Move my 3 PM meeting to 4 PM',
        'Change the location of tomorrow\'s meeting'
      ]
    };

    fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        commands: mockVoiceCommands
      })
    });

    renderWithProviders(<VoiceAssistant />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/voice/commands');
    });
  });

  it('displays voice commands help when available', async () => {
    const mockVoiceCommands = {
      createEvent: [
        'Schedule a meeting with John tomorrow at 2 PM',
        'Add dentist appointment next Friday at 10 AM'
      ]
    };

    fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        commands: mockVoiceCommands
      })
    });

    renderWithProviders(<VoiceAssistant />);

    await waitFor(() => {
      expect(screen.getByText('Voice Commands Help')).toBeInTheDocument();
      expect(screen.getByText('Create Event')).toBeInTheDocument();
    });
  });

  it('handles speech recognition not supported', () => {
    // Mock that speech recognition is not available
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    renderWithProviders(<VoiceAssistant />);
    
    // Should render without crashing
    expect(screen.getByText('Voice Assistant')).toBeInTheDocument();
  });

  it('cancels event creation', async () => {
    const mockParsedEvent = {
      title: 'Meeting with John',
      startTime: '2024-01-15T14:00:00Z',
      endTime: '2024-01-15T15:00:00Z'
    };

    mockCalendarContext.parseNaturalLanguage.mockResolvedValue({
      success: true,
      data: mockParsedEvent
    });

    renderWithProviders(<VoiceAssistant />);
    
    const commandButton = screen.getByText(/Schedule a meeting with John tomorrow at 2 PM/);
    fireEvent.click(commandButton);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Event Preview')).not.toBeInTheDocument();
    });
  });
});