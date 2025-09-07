from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from core.database import get_db
from models import User, Calendar, Event
from schemas.calendar import CalendarCreate, CalendarResponse, EventCreate, EventResponse, EventUpdate
from services.calendar_sync import CalendarSyncService
from api.auth import get_current_user
from utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter()


@router.get("/calendars", response_model=List[CalendarResponse])
async def get_calendars(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all calendars for the current user"""
    calendars = db.query(Calendar).filter(Calendar.user_id == current_user.id).all()
    return calendars


@router.post("/calendars", response_model=CalendarResponse)
async def create_calendar(
    calendar_data: CalendarCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new calendar"""
    calendar = Calendar(
        user_id=current_user.id,
        **calendar_data.dict()
    )
    
    db.add(calendar)
    db.commit()
    db.refresh(calendar)
    
    logger.info(f"Calendar created: {calendar.name} for user {current_user.username}")
    return calendar


@router.post("/calendars/{calendar_id}/sync")
async def sync_calendar(
    calendar_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger calendar sync with external calendar"""
    calendar = db.query(Calendar).filter(
        Calendar.id == calendar_id,
        Calendar.user_id == current_user.id
    ).first()
    
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    sync_service = CalendarSyncService(db)
    result = await sync_service.sync_calendar(calendar)
    
    return {"message": "Sync completed", "result": result}


@router.get("/events", response_model=List[EventResponse])
async def get_events(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    calendar_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get events for the current user"""
    query = db.query(Event).filter(Event.user_id == current_user.id)
    
    if calendar_id:
        query = query.filter(Event.calendar_id == calendar_id)
    
    if start_date:
        query = query.filter(Event.start_time >= start_date)
    
    if end_date:
        query = query.filter(Event.end_time <= end_date)
    
    events = query.order_by(Event.start_time).all()
    return events


@router.post("/events", response_model=EventResponse)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new event"""
    # Verify calendar belongs to user
    calendar = db.query(Calendar).filter(
        Calendar.id == event_data.calendar_id,
        Calendar.user_id == current_user.id
    ).first()
    
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    event = Event(
        user_id=current_user.id,
        **event_data.dict()
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    logger.info(f"Event created: {event.title} for user {current_user.username}")
    
    # Sync to external calendar if enabled
    if calendar.sync_enabled and calendar.caldav_url:
        sync_service = CalendarSyncService(db)
        await sync_service.push_event_to_caldav(event, calendar)
    
    return event


@router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    event_data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing event"""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    for field, value in event_data.dict(exclude_unset=True).items():
        setattr(event, field, value)
    
    event.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    
    # Sync to external calendar if enabled
    calendar = event.calendar
    if calendar.sync_enabled and calendar.caldav_url:
        sync_service = CalendarSyncService(db)
        await sync_service.update_event_in_caldav(event, calendar)
    
    return event


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an event"""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Sync deletion to external calendar if enabled
    calendar = event.calendar
    if calendar.sync_enabled and calendar.caldav_url and event.external_id:
        sync_service = CalendarSyncService(db)
        await sync_service.delete_event_from_caldav(event, calendar)
    
    db.delete(event)
    db.commit()
    
    return {"message": "Event deleted successfully"}