from datetime import datetime, timedelta, time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from models import Event, UserPreference, Calendar
from schemas.scheduling import TimeSlot, SchedulePreferences, ScheduleConstraints, ScheduleRequest
from services.travel_service import TravelService
from utils.logger import setup_logger

logger = setup_logger(__name__)


class SchedulingService:
    def __init__(self, db: Session):
        self.db = db
        self.travel_service = TravelService()
    
    async def find_optimal_slot(
        self,
        user_id: int,
        duration_minutes: int,
        preferences: Optional[SchedulePreferences] = None,
        constraints: Optional[ScheduleConstraints] = None,
        earliest_date: Optional[datetime] = None,
        latest_date: Optional[datetime] = None
    ) -> Optional[Dict[str, Any]]:
        """Find optimal time slot for a new event"""
        
        # Get user preferences
        user_prefs = self.db.query(UserPreference).filter(
            UserPreference.user_id == user_id
        ).first()
        
        # Set date range
        if not earliest_date:
            earliest_date = datetime.utcnow()
        if not latest_date:
            latest_date = earliest_date + timedelta(days=14)
        
        # Generate candidate slots
        candidate_slots = self._generate_candidate_slots(
            earliest_date,
            latest_date,
            duration_minutes,
            user_prefs,
            preferences,
            constraints
        )
        
        # Score each slot
        scored_slots = []
        for slot in candidate_slots:
            score = await self._score_time_slot(
                slot,
                user_id,
                user_prefs,
                preferences,
                constraints
            )
            
            if score > 0:  # Only include viable slots
                scored_slots.append(TimeSlot(
                    start_time=slot["start"],
                    end_time=slot["end"],
                    score=score,
                    reasons=slot.get("reasons", [])
                ))
        
        # Sort by score
        scored_slots.sort(key=lambda x: x.score, reverse=True)
        
        if not scored_slots:
            return None
        
        # Check for conflicts with the best slots
        best_slots = []
        for slot in scored_slots[:5]:  # Top 5 slots
            if not self._has_conflicts(slot, user_id):
                best_slots.append(slot)
        
        if not best_slots:
            return None
        
        return {
            "suggested_slots": best_slots,
            "best_slot": best_slots[0],
            "conflicts_detected": []
        }
    
    def _generate_candidate_slots(
        self,
        start_date: datetime,
        end_date: datetime,
        duration_minutes: int,
        user_prefs: Optional[UserPreference],
        preferences: Optional[SchedulePreferences],
        constraints: Optional[ScheduleConstraints]
    ) -> List[Dict[str, Any]]:
        """Generate candidate time slots"""
        slots = []
        current_date = start_date.date()
        
        while current_date <= end_date.date():
            # Skip weekends if not allowed
            if constraints and not constraints.allow_weekends:
                if current_date.weekday() >= 5:  # Saturday or Sunday
                    current_date += timedelta(days=1)
                    continue
            
            # Determine working hours for this day
            if user_prefs and constraints and constraints.working_hours_only:
                start_hour = user_prefs.work_start_time or time(9, 0)
                end_hour = user_prefs.work_end_time or time(17, 0)
            else:
                start_hour = time(8, 0)
                end_hour = time(20, 0)
            
            # Generate slots for this day
            current_time = datetime.combine(current_date, start_hour)
            day_end = datetime.combine(current_date, end_hour)
            
            while current_time + timedelta(minutes=duration_minutes) <= day_end:
                slot = {
                    "start": current_time,
                    "end": current_time + timedelta(minutes=duration_minutes),
                    "reasons": []
                }
                
                # Check if slot matches preferences
                if preferences and preferences.preferred_times:
                    hour = current_time.hour
                    if "morning" in preferences.preferred_times and 6 <= hour < 12:
                        slot["reasons"].append("Matches morning preference")
                    elif "afternoon" in preferences.preferred_times and 12 <= hour < 17:
                        slot["reasons"].append("Matches afternoon preference")
                    elif "evening" in preferences.preferred_times and 17 <= hour < 21:
                        slot["reasons"].append("Matches evening preference")
                
                slots.append(slot)
                
                # Move to next slot
                current_time += timedelta(minutes=30)  # 30-minute increments
            
            current_date += timedelta(days=1)
        
        return slots
    
    async def _score_time_slot(
        self,
        slot: Dict[str, Any],
        user_id: int,
        user_prefs: Optional[UserPreference],
        preferences: Optional[SchedulePreferences],
        constraints: Optional[ScheduleConstraints]
    ) -> float:
        """Score a time slot based on various factors"""
        score = 1.0
        
        # Check for conflicts
        if self._has_conflicts(slot, user_id):
            return 0.0
        
        # Preferred time bonus
        hour = slot["start"].hour
        if preferences and preferences.preferred_times:
            if "morning" in preferences.preferred_times and 6 <= hour < 12:
                score += 0.2
            elif "afternoon" in preferences.preferred_times and 12 <= hour < 17:
                score += 0.2
            elif "evening" in preferences.preferred_times and 17 <= hour < 21:
                score += 0.2
        
        # Avoid back-to-back meetings
        buffer_before = self._get_buffer_before(slot["start"], user_id)
        buffer_after = self._get_buffer_after(slot["end"], user_id)
        
        if buffer_before < 15:  # Less than 15 minutes buffer
            score -= 0.1
        if buffer_after < 15:
            score -= 0.1
        
        # Prefer slots with good buffer time
        if buffer_before >= 30 and buffer_after >= 30:
            score += 0.1
            slot["reasons"].append("Good buffer time")
        
        # Check daily event count
        daily_events = self._get_daily_event_count(slot["start"].date(), user_id)
        if constraints and constraints.max_events_per_day:
            if daily_events >= constraints.max_events_per_day:
                return 0.0
        
        # Prefer days with fewer events
        if daily_events < 3:
            score += 0.1
            slot["reasons"].append("Light schedule day")
        elif daily_events > 5:
            score -= 0.2
            slot["reasons"].append("Busy day")
        
        # Travel time consideration
        if constraints and constraints.include_travel_time and constraints.location:
            # Check if previous event has location
            prev_event = self._get_previous_event(slot["start"], user_id)
            if prev_event and prev_event.location:
                travel_time = await self._estimate_travel_time(
                    prev_event.location,
                    constraints.location
                )
                if travel_time > buffer_before:
                    score -= 0.3
                    slot["reasons"].append("May not have enough travel time")
        
        return max(0.0, min(1.0, score))
    
    def _has_conflicts(self, slot: Dict[str, Any], user_id: int) -> bool:
        """Check if a time slot has conflicts"""
        conflicts = self.db.query(Event).filter(
            Event.user_id == user_id,
            Event.status != "cancelled",
            Event.start_time < slot["end"],
            Event.end_time > slot["start"]
        ).first()
        
        return conflicts is not None
    
    def _get_buffer_before(self, start_time: datetime, user_id: int) -> int:
        """Get minutes of buffer before this time"""
        prev_event = self.db.query(Event).filter(
            Event.user_id == user_id,
            Event.status != "cancelled",
            Event.end_time <= start_time
        ).order_by(Event.end_time.desc()).first()
        
        if not prev_event:
            return 999  # No previous event
        
        buffer = (start_time - prev_event.end_time).total_seconds() / 60
        return int(buffer)
    
    def _get_buffer_after(self, end_time: datetime, user_id: int) -> int:
        """Get minutes of buffer after this time"""
        next_event = self.db.query(Event).filter(
            Event.user_id == user_id,
            Event.status != "cancelled",
            Event.start_time >= end_time
        ).order_by(Event.start_time).first()
        
        if not next_event:
            return 999  # No next event
        
        buffer = (next_event.start_time - end_time).total_seconds() / 60
        return int(buffer)
    
    def _get_daily_event_count(self, date: datetime.date, user_id: int) -> int:
        """Get number of events on a specific date"""
        start_of_day = datetime.combine(date, time.min)
        end_of_day = datetime.combine(date, time.max)
        
        count = self.db.query(Event).filter(
            Event.user_id == user_id,
            Event.status != "cancelled",
            Event.start_time >= start_of_day,
            Event.start_time <= end_of_day
        ).count()
        
        return count
    
    def _get_previous_event(self, before_time: datetime, user_id: int) -> Optional[Event]:
        """Get the event immediately before a given time"""
        return self.db.query(Event).filter(
            Event.user_id == user_id,
            Event.status != "cancelled",
            Event.end_time <= before_time
        ).order_by(Event.end_time.desc()).first()
    
    async def _estimate_travel_time(self, origin: str, destination: str) -> int:
        """Estimate travel time in minutes"""
        try:
            result = await self.travel_service.calculate_travel_time(
                origin=origin,
                destination=destination,
                mode="driving",
                include_traffic=True
            )
            return result.duration_minutes
        except:
            return 30  # Default 30 minutes
    
    async def reschedule_event(
        self,
        event: Event,
        reason: str,
        constraints: Optional[ScheduleConstraints] = None
    ) -> Optional[TimeSlot]:
        """Find alternative time slot for an existing event"""
        duration = (event.end_time - event.start_time).total_seconds() / 60
        
        # Find new slot
        result = await self.find_optimal_slot(
            user_id=event.user_id,
            duration_minutes=int(duration),
            constraints=constraints,
            earliest_date=datetime.utcnow(),
            latest_date=datetime.utcnow() + timedelta(days=7)
        )
        
        if result and result["best_slot"]:
            return result["best_slot"]
        
        return None
    
    async def batch_schedule(
        self,
        user_id: int,
        events: List[ScheduleRequest]
    ) -> Dict[str, List[Any]]:
        """Schedule multiple events optimally"""
        scheduled = []
        failed = []
        
        # Sort events by priority and duration
        sorted_events = sorted(
            events,
            key=lambda x: (x.preferences.priority if x.preferences else 3, -x.duration_minutes)
        )
        
        for event_request in sorted_events:
            result = await self.find_optimal_slot(
                user_id=user_id,
                duration_minutes=event_request.duration_minutes,
                preferences=event_request.preferences,
                constraints=event_request.constraints,
                earliest_date=event_request.earliest_date,
                latest_date=event_request.latest_date
            )
            
            if result and result["best_slot"]:
                # Create the event
                scheduled.append({
                    "title": event_request.title,
                    "slot": result["best_slot"]
                })
            else:
                failed.append({
                    "title": event_request.title,
                    "reason": "No available slots found"
                })
        
        return {"scheduled": scheduled, "failed": failed}