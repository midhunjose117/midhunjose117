from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from core.database import get_db
from models import User, Event
from schemas.scheduling import (
    ScheduleRequest, ScheduleResponse, 
    RescheduleRequest, TravelTimeRequest, 
    TravelTimeResponse, ConflictResponse
)
from services.scheduling_service import SchedulingService
from services.travel_service import TravelService
from api.auth import get_current_user
from utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter()


@router.post("/schedule", response_model=ScheduleResponse)
async def schedule_event(
    request: ScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Find optimal time slot for a new event"""
    scheduling_service = SchedulingService(db)
    
    try:
        result = await scheduling_service.find_optimal_slot(
            user_id=current_user.id,
            duration_minutes=request.duration_minutes,
            preferences=request.preferences,
            constraints=request.constraints,
            earliest_date=request.earliest_date,
            latest_date=request.latest_date
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No available time slots found"
            )
        
        logger.info(f"Found optimal slot for user {current_user.username}")
        return result
    
    except Exception as e:
        logger.error(f"Scheduling failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to schedule event: {str(e)}"
        )


@router.post("/reschedule/{event_id}")
async def reschedule_event(
    event_id: int,
    request: RescheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reschedule an existing event"""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    scheduling_service = SchedulingService(db)
    
    try:
        new_slot = await scheduling_service.reschedule_event(
            event=event,
            reason=request.reason,
            constraints=request.constraints
        )
        
        if not new_slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No alternative time slots found"
            )
        
        # Update event with new time
        event.start_time = new_slot.start_time
        event.end_time = new_slot.end_time
        event.ai_suggestions = {"rescheduled": True, "reason": request.reason}
        
        db.commit()
        db.refresh(event)
        
        logger.info(f"Event {event_id} rescheduled for user {current_user.username}")
        return {"message": "Event rescheduled successfully", "new_time": new_slot}
    
    except Exception as e:
        logger.error(f"Rescheduling failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to reschedule event: {str(e)}"
        )


@router.post("/travel-time", response_model=TravelTimeResponse)
async def calculate_travel_time(
    request: TravelTimeRequest,
    current_user: User = Depends(get_current_user)
):
    """Calculate travel time between two locations"""
    travel_service = TravelService()
    
    try:
        result = await travel_service.calculate_travel_time(
            origin=request.origin,
            destination=request.destination,
            departure_time=request.departure_time,
            mode=request.mode,
            include_traffic=request.include_traffic
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Travel time calculation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to calculate travel time: {str(e)}"
        )


@router.get("/conflicts", response_model=List[ConflictResponse])
async def check_conflicts(
    start_time: datetime,
    end_time: datetime,
    exclude_event_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check for scheduling conflicts"""
    query = db.query(Event).filter(
        Event.user_id == current_user.id,
        Event.start_time < end_time,
        Event.end_time > start_time,
        Event.status != "cancelled"
    )
    
    if exclude_event_id:
        query = query.filter(Event.id != exclude_event_id)
    
    conflicts = query.all()
    
    return [
        {
            "event_id": event.id,
            "title": event.title,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "conflict_type": "overlap"
        }
        for event in conflicts
    ]


@router.post("/batch-schedule")
async def batch_schedule_events(
    events: List[ScheduleRequest],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule multiple events optimally"""
    scheduling_service = SchedulingService(db)
    
    try:
        results = await scheduling_service.batch_schedule(
            user_id=current_user.id,
            events=events
        )
        
        return {"scheduled": results["scheduled"], "failed": results["failed"]}
    
    except Exception as e:
        logger.error(f"Batch scheduling failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to batch schedule events: {str(e)}"
        )