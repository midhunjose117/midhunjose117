import caldav
from caldav.elements import dav
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import pytz
from icalendar import Calendar as iCalendar, Event as iEvent

from models import Calendar, Event, CalendarSync
from utils.logger import setup_logger

logger = setup_logger(__name__)


class CalendarSyncService:
    def __init__(self, db):
        self.db = db
    
    async def sync_calendar(self, calendar: Calendar) -> Dict[str, Any]:
        """Sync calendar with external CalDAV server"""
        sync_log = CalendarSync(
            calendar_id=calendar.id,
            sync_type="full",
            status="in_progress",
            started_at=datetime.utcnow()
        )
        self.db.add(sync_log)
        self.db.commit()
        
        try:
            # Connect to CalDAV server
            client = caldav.DAVClient(
                url=calendar.caldav_url,
                username=settings.CALDAV_USERNAME,
                password=settings.CALDAV_PASSWORD
            )
            
            principal = client.principal()
            calendars = principal.calendars()
            
            # Find the specific calendar
            caldav_calendar = None
            for cal in calendars:
                if cal.url.endswith(calendar.external_id or calendar.name):
                    caldav_calendar = cal
                    break
            
            if not caldav_calendar:
                raise Exception(f"Calendar {calendar.name} not found on CalDAV server")
            
            # Fetch events
            events = caldav_calendar.date_search(
                start=datetime.utcnow() - timedelta(days=30),
                end=datetime.utcnow() + timedelta(days=365)
            )
            
            # Process events
            events_added = 0
            events_updated = 0
            
            for caldav_event in events:
                event_data = self._parse_caldav_event(caldav_event)
                
                # Check if event already exists
                existing_event = self.db.query(Event).filter(
                    Event.external_id == event_data["external_id"],
                    Event.calendar_id == calendar.id
                ).first()
                
                if existing_event:
                    # Update existing event
                    for key, value in event_data.items():
                        if hasattr(existing_event, key):
                            setattr(existing_event, key, value)
                    events_updated += 1
                else:
                    # Create new event
                    new_event = Event(
                        user_id=calendar.user_id,
                        calendar_id=calendar.id,
                        **event_data
                    )
                    self.db.add(new_event)
                    events_added += 1
            
            # Update sync status
            calendar.last_sync = datetime.utcnow()
            sync_log.status = "success"
            sync_log.events_added = events_added
            sync_log.events_updated = events_updated
            sync_log.completed_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"Calendar sync completed: {events_added} added, {events_updated} updated")
            
            return {
                "status": "success",
                "events_added": events_added,
                "events_updated": events_updated
            }
            
        except Exception as e:
            logger.error(f"Calendar sync failed: {str(e)}")
            sync_log.status = "failed"
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.utcnow()
            self.db.commit()
            raise
    
    def _parse_caldav_event(self, caldav_event) -> Dict[str, Any]:
        """Parse CalDAV event to internal format"""
        ical = iCalendar.from_ical(caldav_event.data)
        
        for component in ical.walk():
            if component.name == "VEVENT":
                return {
                    "external_id": str(component.get("UID", "")),
                    "title": str(component.get("SUMMARY", "Untitled")),
                    "description": str(component.get("DESCRIPTION", "")),
                    "location": str(component.get("LOCATION", "")),
                    "start_time": component.get("DTSTART").dt,
                    "end_time": component.get("DTEND").dt,
                    "all_day": not hasattr(component.get("DTSTART").dt, "hour"),
                    "status": str(component.get("STATUS", "CONFIRMED")).lower()
                }
        
        return {}
    
    async def push_event_to_caldav(self, event: Event, calendar: Calendar):
        """Push a single event to CalDAV server"""
        try:
            client = caldav.DAVClient(
                url=calendar.caldav_url,
                username=settings.CALDAV_USERNAME,
                password=settings.CALDAV_PASSWORD
            )
            
            principal = client.principal()
            caldav_calendar = principal.calendar(name=calendar.external_id or calendar.name)
            
            # Create iCalendar event
            ical_event = self._create_ical_event(event)
            
            # Save to CalDAV
            caldav_calendar.save_event(ical_event)
            
            logger.info(f"Event {event.title} pushed to CalDAV")
            
        except Exception as e:
            logger.error(f"Failed to push event to CalDAV: {str(e)}")
            raise
    
    async def update_event_in_caldav(self, event: Event, calendar: Calendar):
        """Update an event in CalDAV server"""
        if not event.external_id:
            # If no external ID, create as new
            await self.push_event_to_caldav(event, calendar)
            return
        
        try:
            client = caldav.DAVClient(
                url=calendar.caldav_url,
                username=settings.CALDAV_USERNAME,
                password=settings.CALDAV_PASSWORD
            )
            
            principal = client.principal()
            caldav_calendar = principal.calendar(name=calendar.external_id or calendar.name)
            
            # Find and update the event
            events = caldav_calendar.search(uid=event.external_id)
            if events:
                caldav_event = events[0]
                ical_event = self._create_ical_event(event)
                caldav_event.data = ical_event.to_ical()
                caldav_event.save()
                
                logger.info(f"Event {event.title} updated in CalDAV")
            else:
                # Event not found, create new
                await self.push_event_to_caldav(event, calendar)
                
        except Exception as e:
            logger.error(f"Failed to update event in CalDAV: {str(e)}")
            raise
    
    async def delete_event_from_caldav(self, event: Event, calendar: Calendar):
        """Delete an event from CalDAV server"""
        if not event.external_id:
            return
        
        try:
            client = caldav.DAVClient(
                url=calendar.caldav_url,
                username=settings.CALDAV_USERNAME,
                password=settings.CALDAV_PASSWORD
            )
            
            principal = client.principal()
            caldav_calendar = principal.calendar(name=calendar.external_id or calendar.name)
            
            # Find and delete the event
            events = caldav_calendar.search(uid=event.external_id)
            if events:
                events[0].delete()
                logger.info(f"Event {event.title} deleted from CalDAV")
                
        except Exception as e:
            logger.error(f"Failed to delete event from CalDAV: {str(e)}")
            raise
    
    def _create_ical_event(self, event: Event) -> iCalendar:
        """Create iCalendar event from internal event"""
        cal = iCalendar()
        cal.add("prodid", "-//AI Calendar Assistant//")
        cal.add("version", "2.0")
        
        ical_event = iEvent()
        ical_event.add("uid", event.external_id or f"ai-calendar-{event.id}")
        ical_event.add("summary", event.title)
        ical_event.add("description", event.description or "")
        ical_event.add("location", event.location or "")
        ical_event.add("dtstart", event.start_time)
        ical_event.add("dtend", event.end_time)
        ical_event.add("dtstamp", datetime.utcnow())
        ical_event.add("status", event.status.upper())
        
        if event.categories:
            ical_event.add("categories", event.categories)
        
        cal.add_component(ical_event)
        return cal