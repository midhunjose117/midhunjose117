from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Time
from sqlalchemy.orm import relationship

from core.database import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Working hours
    work_start_time = Column(Time)
    work_end_time = Column(Time)
    work_days = Column(JSON, default=[1, 2, 3, 4, 5])  # Monday to Friday
    
    # Time zone
    timezone = Column(String, default="UTC")
    
    # Location defaults
    home_address = Column(String)
    work_address = Column(String)
    default_location = Column(String)
    
    # Scheduling preferences
    buffer_time_minutes = Column(Integer, default=15)  # Buffer between meetings
    default_meeting_duration = Column(Integer, default=30)
    prefer_morning_meetings = Column(JSON, default=False)
    
    # Travel preferences
    default_transport_mode = Column(String, default="driving")  # driving, transit, walking
    include_traffic = Column(JSON, default=True)
    
    # Notification preferences
    notification_preferences = Column(JSON, default={
        "email": True,
        "push": True,
        "sms": False,
        "reminder_minutes": [15, 60, 1440]  # 15 min, 1 hour, 1 day
    })
    
    # AI preferences
    ai_scheduling_enabled = Column(JSON, default=True)
    ai_rescheduling_enabled = Column(JSON, default=True)
    ai_suggestion_level = Column(String, default="moderate")  # minimal, moderate, aggressive
    
    # Weekly routines
    weekly_routines = Column(JSON, default=[])
    
    # Relationships
    user = relationship("User", back_populates="preferences", uselist=False)