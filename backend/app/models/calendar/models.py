"""
Calendar and Event models
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime
from typing import Optional, Dict, Any

from app.core.database import Base


class CalendarType(enum.Enum):
    PERSONAL = "personal"
    WORK = "work"
    SHARED = "shared"
    IMPORTED = "imported"


class EventStatus(enum.Enum):
    TENTATIVE = "tentative"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class EventPriority(enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class RecurrenceType(enum.Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class Calendar(Base):
    __tablename__ = "calendars"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Basic info
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#3174ad")  # Hex color code
    calendar_type = Column(Enum(CalendarType), default=CalendarType.PERSONAL)
    
    # Settings
    is_default = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    is_readonly = Column(Boolean, default=False)
    
    # Sync settings
    caldav_url = Column(String, nullable=True)
    caldav_sync_token = Column(String, nullable=True)
    external_id = Column(String, nullable=True)  # For external calendar systems
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_sync = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="calendars")
    events = relationship("Event", back_populates="calendar", cascade="all, delete-orphan")
    routines = relationship("Routine", back_populates="calendar", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Calendar(id={self.id}, name={self.name}, user_id={self.user_id})>"


class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, default=lambda: str(uuid.uuid4()), index=True)
    calendar_id = Column(Integer, ForeignKey("calendars.id"), nullable=False, index=True)
    
    # Basic event info
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    
    # Timing
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False, index=True)
    all_day = Column(Boolean, default=False)
    timezone = Column(String, nullable=True)
    
    # Status and priority
    status = Column(Enum(EventStatus), default=EventStatus.CONFIRMED)
    priority = Column(Enum(EventPriority), default=EventPriority.NORMAL)
    
    # Recurrence
    recurrence_type = Column(Enum(RecurrenceType), default=RecurrenceType.NONE)
    recurrence_rule = Column(String, nullable=True)  # RRULE format
    recurrence_end = Column(DateTime(timezone=True), nullable=True)
    parent_event_id = Column(Integer, ForeignKey("events.id"), nullable=True)
    
    # AI and automation
    created_by_ai = Column(Boolean, default=False)
    ai_confidence = Column(Integer, nullable=True)  # 0-100
    auto_rescheduled = Column(Boolean, default=False)
    original_start_time = Column(DateTime(timezone=True), nullable=True)
    
    # Travel time
    travel_time_before = Column(Integer, default=0)  # minutes
    travel_time_after = Column(Integer, default=0)   # minutes
    travel_mode = Column(String, nullable=True)
    origin_address = Column(String, nullable=True)
    destination_address = Column(String, nullable=True)
    
    # External sync
    external_id = Column(String, nullable=True)  # For CalDAV/external systems
    etag = Column(String, nullable=True)
    
    # Metadata
    metadata = Column(JSON, nullable=True)  # Additional flexible data
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    calendar = relationship("Calendar", back_populates="events")
    parent_event = relationship("Event", remote_side=[id])
    child_events = relationship("Event", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Event(id={self.id}, title={self.title}, start_time={self.start_time})>"


class Routine(Base):
    __tablename__ = "routines"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, default=lambda: str(uuid.uuid4()), index=True)
    calendar_id = Column(Integer, ForeignKey("calendars.id"), nullable=False, index=True)
    
    # Routine info
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Timing pattern
    days_of_week = Column(JSON, nullable=False)  # [0,1,2,3,4] for Mon-Fri
    start_time = Column(String, nullable=False)  # "09:00"
    duration_minutes = Column(Integer, nullable=False)
    
    # Settings
    is_active = Column(Boolean, default=True)
    auto_create_events = Column(Boolean, default=True)
    priority = Column(Enum(EventPriority), default=EventPriority.NORMAL)
    
    # Flexibility for AI scheduling
    flexible_start_time = Column(Boolean, default=False)
    flexibility_minutes = Column(Integer, default=0)  # +/- minutes
    
    # Location and travel
    location = Column(String, nullable=True)
    travel_time_before = Column(Integer, default=0)
    travel_time_after = Column(Integer, default=0)
    
    # Metadata
    metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_generated = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    calendar = relationship("Calendar", back_populates="routines")
    
    def __repr__(self):
        return f"<Routine(id={self.id}, name={self.name}, days_of_week={self.days_of_week})>"