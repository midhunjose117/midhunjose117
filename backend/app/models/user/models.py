"""
User models for authentication and user management
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    
    # Status fields
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # User preferences
    timezone = Column(String, default="UTC")
    language = Column(String, default="en")
    date_format = Column(String, default="YYYY-MM-DD")
    time_format = Column(String, default="HH:mm")
    
    # AI preferences
    ai_enabled = Column(Boolean, default=True)
    voice_enabled = Column(Boolean, default=True)
    auto_reschedule = Column(Boolean, default=True)
    travel_time_enabled = Column(Boolean, default=True)
    default_travel_mode = Column(String, default="driving")
    
    # Sync settings
    nextcloud_url = Column(String, nullable=True)
    nextcloud_username = Column(String, nullable=True)
    nextcloud_password_hash = Column(String, nullable=True)  # Encrypted
    sync_enabled = Column(Boolean, default=False)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    calendars = relationship("Calendar", back_populates="user", cascade="all, delete-orphan")
    voice_commands = relationship("VoiceCommand", back_populates="user", cascade="all, delete-orphan")
    ai_logs = relationship("AISchedulingLog", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, username={self.username})>"


class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    session_token = Column(String, unique=True, nullable=False, index=True)
    refresh_token = Column(String, unique=True, nullable=True)
    
    # Session metadata
    device_type = Column(String, nullable=True)  # web, mobile, smartwatch
    device_id = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, device_type={self.device_type})>"