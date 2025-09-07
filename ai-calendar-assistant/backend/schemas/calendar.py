from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class CalendarBase(BaseModel):
    name: str
    color: str = "#1976d2"
    description: Optional[str] = None
    caldav_url: Optional[str] = None
    is_primary: bool = False


class CalendarCreate(CalendarBase):
    pass


class CalendarResponse(CalendarBase):
    id: int
    user_id: int
    external_id: Optional[str]
    is_synced: bool
    sync_enabled: bool
    last_sync: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    travel_time_before: int = 0
    travel_time_after: int = 0
    categories: List[str] = Field(default_factory=list)
    priority: int = Field(default=3, ge=1, le=5)


class EventCreate(EventBase):
    calendar_id: int


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = None
    travel_time_before: Optional[int] = None
    travel_time_after: Optional[int] = None
    categories: Optional[List[str]] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[str] = None


class EventResponse(EventBase):
    id: int
    user_id: int
    calendar_id: int
    external_id: Optional[str]
    status: str
    is_recurring: bool
    recurring_event_id: Optional[int]
    ai_suggestions: Optional[Dict[str, Any]]
    auto_scheduled: bool
    confidence_score: Optional[float]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True