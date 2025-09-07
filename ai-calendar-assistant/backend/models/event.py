from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from core.database import Base


class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    calendar_id = Column(Integer, ForeignKey("calendars.id"), nullable=False)
    external_id = Column(String, index=True)  # ID from external calendar system
    
    title = Column(String, nullable=False)
    description = Column(Text)
    location = Column(String)
    
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    all_day = Column(Boolean, default=False)
    
    # Travel time in minutes
    travel_time_before = Column(Integer, default=0)
    travel_time_after = Column(Integer, default=0)
    
    # Event metadata
    categories = Column(JSON, default=list)
    priority = Column(Integer, default=3)  # 1-5, 1 being highest
    status = Column(String, default="confirmed")  # confirmed, tentative, cancelled
    
    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurring_event_id = Column(Integer, ForeignKey("recurring_events.id"))
    
    # AI-generated insights
    ai_suggestions = Column(JSON)
    auto_scheduled = Column(Boolean, default=False)
    confidence_score = Column(Float)  # How confident the AI is about this scheduling
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="events")
    calendar = relationship("Calendar", back_populates="events")
    recurring_event = relationship("RecurringEvent", back_populates="events")


class RecurringEvent(Base):
    __tablename__ = "recurring_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(Text)
    
    # Recurrence pattern (RRULE format)
    recurrence_rule = Column(String, nullable=False)
    
    # Duration in minutes
    duration = Column(Integer, nullable=False)
    
    # Time preferences
    preferred_time_start = Column(String)  # HH:MM format
    preferred_time_end = Column(String)    # HH:MM format
    preferred_days = Column(JSON)          # List of weekday numbers
    
    # Flexibility
    is_flexible = Column(Boolean, default=True)
    min_gap_hours = Column(Integer, default=0)  # Minimum hours between occurrences
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    events = relationship("Event", back_populates="recurring_event")