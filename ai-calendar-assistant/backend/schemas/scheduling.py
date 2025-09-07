from pydantic import BaseModel, Field
from datetime import datetime, time
from typing import Optional, List, Dict, Any


class TimeSlot(BaseModel):
    start_time: datetime
    end_time: datetime
    score: float = Field(description="Optimality score 0-1")
    reasons: List[str] = []


class SchedulePreferences(BaseModel):
    preferred_times: Optional[List[str]] = None  # ["morning", "afternoon", "evening"]
    preferred_days: Optional[List[int]] = None   # [1, 2, 3, 4, 5] for weekdays
    avoid_times: Optional[List[Dict[str, time]]] = None
    buffer_before: Optional[int] = 15  # minutes
    buffer_after: Optional[int] = 15   # minutes


class ScheduleConstraints(BaseModel):
    working_hours_only: bool = True
    allow_weekends: bool = False
    max_events_per_day: Optional[int] = None
    min_gap_between_events: Optional[int] = 30  # minutes
    location: Optional[str] = None
    include_travel_time: bool = True


class ScheduleRequest(BaseModel):
    title: str
    duration_minutes: int
    preferences: Optional[SchedulePreferences] = None
    constraints: Optional[ScheduleConstraints] = None
    earliest_date: Optional[datetime] = None
    latest_date: Optional[datetime] = None
    participants: List[str] = []


class ScheduleResponse(BaseModel):
    suggested_slots: List[TimeSlot]
    best_slot: TimeSlot
    conflicts_detected: List[Dict[str, Any]] = []


class RescheduleRequest(BaseModel):
    reason: str
    constraints: Optional[ScheduleConstraints] = None
    preserve_duration: bool = True
    notify_participants: bool = True


class TravelTimeRequest(BaseModel):
    origin: str
    destination: str
    departure_time: Optional[datetime] = None
    mode: str = "driving"  # driving, transit, walking, bicycling
    include_traffic: bool = True


class TravelTimeResponse(BaseModel):
    duration_minutes: int
    distance_km: float
    mode: str
    route_summary: Optional[str] = None
    traffic_info: Optional[Dict[str, Any]] = None


class ConflictResponse(BaseModel):
    event_id: int
    title: str
    start_time: datetime
    end_time: datetime
    conflict_type: str  # overlap, too_close, travel_time