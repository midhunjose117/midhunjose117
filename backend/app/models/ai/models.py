"""
AI and Voice Processing models
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, Float, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime

from app.core.database import Base


class VoiceCommandStatus(enum.Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class AIActionType(enum.Enum):
    CREATE_EVENT = "create_event"
    MODIFY_EVENT = "modify_event"
    DELETE_EVENT = "delete_event"
    RESCHEDULE_EVENT = "reschedule_event"
    SUGGEST_TIME = "suggest_time"
    ANALYZE_SCHEDULE = "analyze_schedule"
    OPTIMIZE_ROUTINE = "optimize_routine"


class VoiceCommand(Base):
    __tablename__ = "voice_commands"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Audio data
    audio_file_path = Column(String, nullable=True)  # Path to stored audio file
    audio_duration = Column(Float, nullable=True)    # Duration in seconds
    audio_format = Column(String, nullable=True)     # wav, mp3, etc.
    
    # Transcription
    transcribed_text = Column(Text, nullable=True)
    transcription_confidence = Column(Float, nullable=True)  # 0.0-1.0
    language_detected = Column(String, nullable=True)
    
    # Processing
    processed_intent = Column(String, nullable=True)  # Intent classification
    extracted_entities = Column(JSON, nullable=True)  # Named entities
    processing_time_ms = Column(Integer, nullable=True)
    
    # Status
    status = Column(Enum(VoiceCommandStatus), default=VoiceCommandStatus.PROCESSING)
    error_message = Column(Text, nullable=True)
    
    # Response
    response_text = Column(Text, nullable=True)
    response_audio_path = Column(String, nullable=True)
    
    # Metadata
    device_type = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="voice_commands")
    ai_logs = relationship("AISchedulingLog", back_populates="voice_command")
    
    def __repr__(self):
        return f"<VoiceCommand(id={self.id}, user_id={self.user_id}, status={self.status})>"


class AISchedulingLog(Base):
    __tablename__ = "ai_scheduling_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    voice_command_id = Column(Integer, ForeignKey("voice_commands.id"), nullable=True, index=True)
    
    # AI Processing
    action_type = Column(Enum(AIActionType), nullable=False)
    input_text = Column(Text, nullable=False)
    processed_input = Column(JSON, nullable=True)  # Structured input data
    
    # GPT Interaction
    gpt_model = Column(String, nullable=True)
    gpt_prompt = Column(Text, nullable=True)
    gpt_response = Column(Text, nullable=True)
    gpt_tokens_used = Column(Integer, nullable=True)
    gpt_processing_time_ms = Column(Integer, nullable=True)
    
    # Results
    success = Column(Boolean, default=False)
    confidence_score = Column(Float, nullable=True)  # 0.0-1.0
    result_data = Column(JSON, nullable=True)  # Structured result
    
    # Event references
    created_event_ids = Column(JSON, nullable=True)  # List of event IDs created
    modified_event_ids = Column(JSON, nullable=True)  # List of event IDs modified
    deleted_event_ids = Column(JSON, nullable=True)   # List of event IDs deleted
    
    # Error handling
    error_type = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Performance metrics
    total_processing_time_ms = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="ai_logs")
    voice_command = relationship("VoiceCommand", back_populates="ai_logs")
    
    def __repr__(self):
        return f"<AISchedulingLog(id={self.id}, action_type={self.action_type}, success={self.success})>"


class AIModel(Base):
    __tablename__ = "ai_models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    version = Column(String, nullable=False)
    model_type = Column(String, nullable=False)  # gpt, whisper, etc.
    
    # Configuration
    config = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    # Performance metrics
    average_response_time_ms = Column(Float, nullable=True)
    success_rate = Column(Float, nullable=True)
    total_requests = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_used = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<AIModel(id={self.id}, name={self.name}, version={self.version})>"


class SchedulingContext(Base):
    __tablename__ = "scheduling_contexts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Context data for better AI scheduling
    work_hours_start = Column(String, default="09:00")
    work_hours_end = Column(String, default="17:00")
    work_days = Column(JSON, default=[1, 2, 3, 4, 5])  # Monday=1, Sunday=7
    
    # Preferences
    preferred_meeting_length = Column(Integer, default=30)  # minutes
    buffer_time_between_meetings = Column(Integer, default=15)  # minutes
    lunch_time_start = Column(String, default="12:00")
    lunch_time_end = Column(String, default="13:00")
    
    # Location context
    home_address = Column(String, nullable=True)
    work_address = Column(String, nullable=True)
    common_locations = Column(JSON, nullable=True)  # Dict of name: address
    
    # AI learning data
    scheduling_patterns = Column(JSON, nullable=True)  # Learned patterns
    rejection_patterns = Column(JSON, nullable=True)   # Times/patterns user rejects
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<SchedulingContext(id={self.id}, user_id={self.user_id})>"