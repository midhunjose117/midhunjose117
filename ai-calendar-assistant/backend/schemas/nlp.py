from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class NLPRequest(BaseModel):
    text: str
    timezone: Optional[str] = "UTC"
    current_time: Optional[datetime] = None


class ParsedEvent(BaseModel):
    title: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    duration_minutes: Optional[int]
    location: Optional[str]
    description: Optional[str]
    participants: List[str] = []
    categories: List[str] = []
    priority: Optional[int]
    recurrence: Optional[str]
    confidence: float


class NLPResponse(BaseModel):
    parsed_event: ParsedEvent
    intent: str  # create, update, delete, query
    entities: Dict[str, Any]
    suggestions: List[str] = []
    requires_clarification: bool = False
    clarification_prompts: List[str] = []


class VoiceTranscriptionResponse(BaseModel):
    text: str
    language: str
    confidence: Optional[float] = None