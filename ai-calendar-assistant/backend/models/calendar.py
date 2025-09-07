from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from core.database import Base


class Calendar(Base):
    __tablename__ = "calendars"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String, nullable=False)
    color = Column(String, default="#1976d2")
    description = Column(String)
    
    # CalDAV/External calendar info
    external_id = Column(String)
    caldav_url = Column(String)
    is_primary = Column(Boolean, default=False)
    is_synced = Column(Boolean, default=True)
    
    # Sync settings
    sync_enabled = Column(Boolean, default=True)
    last_sync = Column(DateTime)
    sync_token = Column(String)  # For incremental sync
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="calendars")
    events = relationship("Event", back_populates="calendar", cascade="all, delete-orphan")
    sync_logs = relationship("CalendarSync", back_populates="calendar", cascade="all, delete-orphan")


class CalendarSync(Base):
    __tablename__ = "calendar_syncs"
    
    id = Column(Integer, primary_key=True, index=True)
    calendar_id = Column(Integer, ForeignKey("calendars.id"), nullable=False)
    
    sync_type = Column(String)  # full, incremental
    status = Column(String)      # success, failed, in_progress
    
    events_added = Column(Integer, default=0)
    events_updated = Column(Integer, default=0)
    events_deleted = Column(Integer, default=0)
    
    error_message = Column(String)
    sync_metadata = Column(JSON)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    calendar = relationship("Calendar", back_populates="sync_logs")