import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CalendarContext = createContext();

const initialState = {
  events: [],
  loading: false,
  error: null,
  selectedDate: new Date(),
  view: 'month',
  conflicts: [],
  syncStatus: {
    nextcloudConnected: false,
    lastSync: null,
    totalEvents: 0,
    syncedEvents: 0
  }
};

const calendarReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_EVENTS':
      return { ...state, events: action.payload, loading: false };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(event =>
          event._id === action.payload._id ? action.payload : event
        )
      };
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter(event => event._id !== action.payload)
      };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    case 'SET_CONFLICTS':
      return { ...state, conflicts: action.payload };
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
};

export const CalendarProvider = ({ children }) => {
  const [state, dispatch] = useReducer(calendarReducer, initialState);

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
    fetchSyncStatus();
  }, []);

  const fetchEvents = async (startDate, endDate) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const params = {};
      if (startDate && endDate) {
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
      }

      const response = await axios.get('/api/calendar', { params });
      dispatch({ type: 'SET_EVENTS', payload: response.data });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch events';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const createEvent = async (eventData) => {
    try {
      const response = await axios.post('/api/calendar', eventData);
      
      if (response.data.conflict) {
        dispatch({ type: 'SET_CONFLICTS', payload: response.data.conflictingEvents });
        toast.error('Conflict detected! Please resolve conflicts.');
        return { success: false, conflict: true, data: response.data };
      }

      dispatch({ type: 'ADD_EVENT', payload: response.data });
      toast.success('Event created successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create event';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateEvent = async (eventId, eventData) => {
    try {
      const response = await axios.put(`/api/calendar/${eventId}`, eventData);
      dispatch({ type: 'UPDATE_EVENT', payload: response.data });
      toast.success('Event updated successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update event';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await axios.delete(`/api/calendar/${eventId}`);
      dispatch({ type: 'DELETE_EVENT', payload: eventId });
      toast.success('Event deleted successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete event';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const parseNaturalLanguage = async (input) => {
    try {
      const response = await axios.post('/api/calendar/parse-natural-language', { input });
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to parse input';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const getSchedulingSuggestions = async (events, constraints) => {
    try {
      const response = await axios.post('/api/calendar/suggest-schedule', { events, constraints });
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to get suggestions';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const autoRescheduleConflicts = async (eventIds, rescheduleOptions) => {
    try {
      const response = await axios.post('/api/calendar/auto-reschedule', {
        eventIds,
        rescheduleOptions
      });
      
      // Update events in state
      response.data.events.forEach(updatedEvent => {
        dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
      });

      dispatch({ type: 'SET_CONFLICTS', payload: [] });
      toast.success('Conflicts resolved successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to resolve conflicts';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const fetchConflicts = async (startDate, endDate) => {
    try {
      const response = await axios.get(
        `/api/calendar/conflicts/${startDate.toISOString()}/${endDate.toISOString()}`
      );
      dispatch({ type: 'SET_CONFLICTS', payload: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch conflicts';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await axios.get('/api/sync/status');
      dispatch({ type: 'SET_SYNC_STATUS', payload: response.data.status });
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const connectNextcloud = async (url, username, password) => {
    try {
      const response = await axios.post('/api/sync/connect-nextcloud', {
        url,
        username,
        password
      });
      
      if (response.data.success) {
        await fetchSyncStatus();
        toast.success('Connected to Nextcloud successfully');
        return { success: true };
      } else {
        toast.error(response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to connect to Nextcloud';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const syncFromNextcloud = async (calendarId, startDate, endDate) => {
    try {
      const response = await axios.post('/api/sync/sync-from-nextcloud', {
        calendarId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (response.data.success) {
        // Add synced events to state
        response.data.syncResult.syncedEvents.forEach(event => {
          dispatch({ type: 'ADD_EVENT', payload: event });
        });

        await fetchSyncStatus();
        toast.success(response.data.message);
        return { success: true, data: response.data };
      } else {
        toast.error(response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to sync from Nextcloud';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const syncToNextcloud = async (calendarId, eventIds = null) => {
    try {
      const response = await axios.post('/api/sync/sync-to-nextcloud', {
        calendarId,
        eventIds
      });

      if (response.data.success) {
        await fetchSyncStatus();
        toast.success(response.data.message);
        return { success: true, data: response.data };
      } else {
        toast.error(response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to sync to Nextcloud';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const setSelectedDate = (date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
  };

  const setView = (view) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  };

  const clearConflicts = () => {
    dispatch({ type: 'SET_CONFLICTS', payload: [] });
  };

  const value = {
    ...state,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    parseNaturalLanguage,
    getSchedulingSuggestions,
    autoRescheduleConflicts,
    fetchConflicts,
    connectNextcloud,
    syncFromNextcloud,
    syncToNextcloud,
    setSelectedDate,
    setView,
    clearConflicts
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};