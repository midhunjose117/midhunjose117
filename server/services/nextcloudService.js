const axios = require('axios');
const ical = require('ical');
const moment = require('moment-timezone');

class NextcloudService {
  constructor() {
    this.baseUrl = process.env.NEXTCLOUD_URL;
    this.username = process.env.NEXTCLOUD_USERNAME;
    this.password = process.env.NEXTCLOUD_PASSWORD;
  }

  async connect(userCredentials) {
    try {
      const { url, username, password } = userCredentials;
      
      // Test connection
      const response = await axios.get(`${url}/ocs/v2.php/cloud/user`, {
        auth: { username, password },
        headers: {
          'OCS-APIRequest': 'true'
        }
      });

      if (response.status === 200) {
        return {
          connected: true,
          userInfo: response.data
        };
      }
    } catch (error) {
      console.error('Nextcloud connection failed:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  async getCalendars(userCredentials) {
    try {
      const { url, username, password } = userCredentials;
      
      const response = await axios.get(`${url}/remote.php/dav/calendars/${username}`, {
        auth: { username, password },
        headers: {
          'Depth': '1'
        }
      });

      // Parse calendar list from CalDAV response
      const calendars = this.parseCalendarList(response.data);
      return calendars;
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw new Error('Failed to fetch calendars');
    }
  }

  async getEvents(userCredentials, calendarId, startDate, endDate) {
    try {
      const { url, username, password } = userCredentials;
      
      const response = await axios.get(
        `${url}/remote.php/dav/calendars/${username}/${calendarId}`,
        {
          auth: { username, password },
          params: {
            'start': startDate,
            'end': endDate
          }
        }
      );

      // Parse iCal data
      const events = this.parseICalEvents(response.data);
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch events');
    }
  }

  async createEvent(userCredentials, calendarId, eventData) {
    try {
      const { url, username, password } = userCredentials;
      
      // Convert event data to iCal format
      const iCalData = this.convertToICal(eventData);
      
      const response = await axios.put(
        `${url}/remote.php/dav/calendars/${username}/${calendarId}/${eventData.id}.ics`,
        iCalData,
        {
          auth: { username, password },
          headers: {
            'Content-Type': 'text/calendar'
          }
        }
      );

      return {
        success: true,
        eventId: eventData.id,
        nextcloudId: response.headers.location
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  async updateEvent(userCredentials, calendarId, eventId, eventData) {
    try {
      const { url, username, password } = userCredentials;
      
      const iCalData = this.convertToICal(eventData);
      
      const response = await axios.put(
        `${url}/remote.php/dav/calendars/${username}/${calendarId}/${eventId}.ics`,
        iCalData,
        {
          auth: { username, password },
          headers: {
            'Content-Type': 'text/calendar'
          }
        }
      );

      return {
        success: true,
        eventId: eventId
      };
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  async deleteEvent(userCredentials, calendarId, eventId) {
    try {
      const { url, username, password } = userCredentials;
      
      await axios.delete(
        `${url}/remote.php/dav/calendars/${username}/${calendarId}/${eventId}.ics`,
        {
          auth: { username, password }
        }
      );

      return {
        success: true,
        eventId: eventId
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event');
    }
  }

  parseCalendarList(xmlData) {
    // Parse CalDAV XML response to extract calendar information
    // This is a simplified implementation
    const calendars = [];
    
    // In a real implementation, you would parse the XML properly
    // For now, return mock data
    calendars.push({
      id: 'personal',
      name: 'Personal',
      description: 'Personal calendar',
      color: '#4285f4'
    });

    return calendars;
  }

  parseICalEvents(iCalData) {
    try {
      const events = [];
      const parsedData = ical.parseICS(iCalData);

      for (const key in parsedData) {
        const event = parsedData[key];
        
        if (event.type === 'VEVENT') {
          events.push({
            id: event.uid,
            title: event.summary,
            description: event.description,
            startTime: event.start,
            endTime: event.end,
            location: event.location,
            attendees: this.parseAttendees(event.attendee),
            recurrence: this.parseRecurrence(event.rrule),
            externalId: event.uid,
            lastModified: event.lastmodified
          });
        }
      }

      return events;
    } catch (error) {
      console.error('Error parsing iCal data:', error);
      return [];
    }
  }

  convertToICal(eventData) {
    const startTime = moment(eventData.startTime).utc().format('YYYYMMDDTHHmmss[Z]');
    const endTime = moment(eventData.endTime).utc().format('YYYYMMDDTHHmmss[Z]');
    const now = moment().utc().format('YYYYMMDDTHHmmss[Z]');

    let iCal = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Calendar Assistant//EN
BEGIN:VEVENT
UID:${eventData.id}
DTSTAMP:${now}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${eventData.title}`;

    if (eventData.description) {
      iCal += `\nDESCRIPTION:${eventData.description}`;
    }

    if (eventData.location) {
      iCal += `\nLOCATION:${eventData.location.name || eventData.location}`;
    }

    if (eventData.attendees && eventData.attendees.length > 0) {
      eventData.attendees.forEach(attendee => {
        iCal += `\nATTENDEE:mailto:${attendee.email}`;
      });
    }

    if (eventData.recurrence && eventData.recurrence.frequency !== 'none') {
      iCal += `\nRRULE:FREQ=${eventData.recurrence.frequency.toUpperCase()}`;
      if (eventData.recurrence.interval) {
        iCal += `;INTERVAL=${eventData.recurrence.interval}`;
      }
    }

    iCal += `\nEND:VEVENT
END:VCALENDAR`;

    return iCal;
  }

  parseAttendees(attendeeData) {
    if (!attendeeData) return [];
    
    const attendees = Array.isArray(attendeeData) ? attendeeData : [attendeeData];
    
    return attendees.map(attendee => ({
      email: attendee.replace('mailto:', ''),
      status: 'pending'
    }));
  }

  parseRecurrence(rruleData) {
    if (!rruleData) {
      return { frequency: 'none' };
    }

    const recurrence = { frequency: 'none' };
    
    if (rruleData.includes('FREQ=DAILY')) {
      recurrence.frequency = 'daily';
    } else if (rruleData.includes('FREQ=WEEKLY')) {
      recurrence.frequency = 'weekly';
    } else if (rruleData.includes('FREQ=MONTHLY')) {
      recurrence.frequency = 'monthly';
    } else if (rruleData.includes('FREQ=YEARLY')) {
      recurrence.frequency = 'yearly';
    }

    const intervalMatch = rruleData.match(/INTERVAL=(\d+)/);
    if (intervalMatch) {
      recurrence.interval = parseInt(intervalMatch[1]);
    }

    return recurrence;
  }

  async syncEvents(localEvents, nextcloudEvents) {
    const syncResult = {
      created: [],
      updated: [],
      deleted: [],
      conflicts: []
    };

    // Find events to create in Nextcloud
    const localEventIds = localEvents.map(event => event.externalId).filter(Boolean);
    const nextcloudEventIds = nextcloudEvents.map(event => event.externalId);

    for (const localEvent of localEvents) {
      if (!localEvent.externalId) {
        // New event to create in Nextcloud
        syncResult.created.push(localEvent);
      } else if (nextcloudEventIds.includes(localEvent.externalId)) {
        // Check if event needs updating
        const nextcloudEvent = nextcloudEvents.find(e => e.externalId === localEvent.externalId);
        if (this.hasEventChanged(localEvent, nextcloudEvent)) {
          syncResult.updated.push(localEvent);
        }
      }
    }

    // Find events to delete from Nextcloud
    for (const nextcloudEvent of nextcloudEvents) {
      if (!localEventIds.includes(nextcloudEvent.externalId)) {
        syncResult.deleted.push(nextcloudEvent);
      }
    }

    return syncResult;
  }

  hasEventChanged(localEvent, nextcloudEvent) {
    return (
      localEvent.title !== nextcloudEvent.title ||
      localEvent.description !== nextcloudEvent.description ||
      new Date(localEvent.startTime).getTime() !== new Date(nextcloudEvent.startTime).getTime() ||
      new Date(localEvent.endTime).getTime() !== new Date(nextcloudEvent.endTime).getTime() ||
      JSON.stringify(localEvent.location) !== JSON.stringify(nextcloudEvent.location)
    );
  }
}

module.exports = new NextcloudService();