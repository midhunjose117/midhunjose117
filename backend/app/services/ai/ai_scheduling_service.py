"""
AI Scheduling Service - Core AI-powered calendar management
"""

import json
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
import structlog
import openai
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

from app.core.config import settings
from app.core.exceptions import AIServiceException
from app.models.user.models import User, SchedulingContext
from app.models.calendar.models import Event, Calendar
from app.models.ai.models import AISchedulingLog, VoiceCommand
from app.models.ai.schemas import (
    SchedulingResponse, AISchedulingLogResponse, ScheduleAnalysisResponse,
    EntityExtraction, IntentClassification, MeetingTimeSuggestion
)
from app.services.calendar.calendar_service import CalendarService
from app.services.travel.travel_service import TravelTimeService

logger = structlog.get_logger(__name__)


class AISchedulingService:
    """Service for AI-powered calendar scheduling and management"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.calendar_service = CalendarService(db)
        self.travel_service = TravelTimeService()
        
        # Initialize OpenAI
        openai.api_key = settings.OPENAI_API_KEY
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=0.1,
            max_tokens=settings.OPENAI_MAX_TOKENS
        )
        
        # Initialize prompts
        self._init_prompts()
    
    def _init_prompts(self):
        """Initialize AI prompts for different tasks"""
        
        self.scheduling_prompt = PromptTemplate(
            input_variables=["user_context", "request_text", "current_schedule"],
            template="""
You are an AI calendar assistant. Help the user schedule events based on their natural language request.

User Context:
{user_context}

Current Schedule:
{current_schedule}

User Request: "{request_text}"

Analyze the request and provide a structured response with:
1. Event details (title, description, duration, location if mentioned)
2. Suggested time slots (consider user's schedule and preferences)
3. Any conflicts or issues
4. Confidence level (0-100)

Respond in JSON format:
{{
    "event_details": {{
        "title": "string",
        "description": "string",
        "duration_minutes": integer,
        "location": "string or null",
        "priority": "low|normal|high|urgent"
    }},
    "suggested_times": [
        {{
            "start_time": "ISO datetime",
            "end_time": "ISO datetime",
            "confidence": float,
            "reason": "string"
        }}
    ],
    "conflicts": [
        {{
            "event_id": integer,
            "event_title": "string",
            "conflict_type": "overlap|travel_time|preference"
        }}
    ],
    "confidence": integer,
    "requires_clarification": boolean,
    "clarification_questions": ["string"]
}}
"""
        )
        
        self.entity_extraction_prompt = PromptTemplate(
            input_variables=["text"],
            template="""
Extract scheduling-related entities from the following text:

Text: "{text}"

Extract and return in JSON format:
{{
    "dates": [{{ "text": "string", "parsed": "YYYY-MM-DD", "relative": boolean }}],
    "times": [{{ "text": "string", "parsed": "HH:MM", "period": "am|pm|24h" }}],
    "durations": [{{ "text": "string", "minutes": integer }}],
    "locations": [{{ "text": "string", "type": "address|venue|room" }}],
    "people": [{{ "text": "string", "role": "participant|organizer" }}],
    "event_types": [{{ "text": "string", "category": "meeting|appointment|reminder|etc" }}],
    "priorities": [{{ "text": "string", "level": "low|normal|high|urgent" }}]
}}
"""
        )
        
        self.intent_classification_prompt = PromptTemplate(
            input_variables=["text", "context"],
            template="""
Classify the intent of this calendar-related request:

Text: "{text}"
Context: {context}

Classify into one of these intents:
- create_event: Creating a new event/appointment
- modify_event: Changing an existing event
- delete_event: Removing an event
- reschedule_event: Moving an event to different time
- find_time: Finding available time slots
- schedule_meeting: Scheduling with others
- set_reminder: Setting up reminders
- analyze_schedule: Analyzing calendar patterns
- optimize_schedule: Improving schedule efficiency

Return JSON:
{{
    "intent": "string",
    "confidence": float,
    "parameters": {{}},
    "alternatives": [{{ "intent": "string", "confidence": float }}]
}}
"""
        )
    
    async def process_natural_language(
        self, 
        user_id: int, 
        text: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> SchedulingResponse:
        """Process natural language scheduling request"""
        
        start_time = datetime.utcnow()
        log_entry = None
        
        try:
            # Get user context
            user_context = await self._get_user_context(user_id)
            current_schedule = await self._get_current_schedule(user_id)
            
            # Create AI log entry
            log_entry = await self._create_ai_log(
                user_id=user_id,
                action_type="create_event",
                input_text=text
            )
            
            # Extract entities and classify intent
            entities = await self._extract_entities(text)
            intent = await self._classify_intent(text, context or {})
            
            # Process based on intent
            if intent["intent"] == "create_event":
                result = await self._process_create_event(
                    user_id, text, user_context, current_schedule, entities
                )
            elif intent["intent"] == "reschedule_event":
                result = await self._process_reschedule_event(
                    user_id, text, user_context, entities
                )
            elif intent["intent"] == "find_time":
                result = await self._process_find_time(
                    user_id, text, user_context, current_schedule, entities
                )
            else:
                result = await self._process_generic_request(
                    user_id, text, user_context, intent, entities
                )
            
            # Update log entry
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            await self._update_ai_log(
                log_entry.id,
                success=result.success,
                result_data=result.dict(),
                processing_time_ms=processing_time
            )
            
            logger.info(
                "Natural language processing completed",
                user_id=user_id,
                intent=intent["intent"],
                success=result.success,
                processing_time_ms=processing_time
            )
            
            return result
            
        except Exception as e:
            if log_entry:
                await self._update_ai_log(
                    log_entry.id,
                    success=False,
                    error_message=str(e)
                )
            
            logger.error(
                "Natural language processing failed",
                user_id=user_id,
                error=str(e),
                exc_info=True
            )
            
            raise AIServiceException(f"Failed to process natural language request: {str(e)}")
    
    async def _extract_entities(self, text: str) -> EntityExtraction:
        """Extract entities from text using GPT"""
        try:
            response = await self.llm.apredict(
                self.entity_extraction_prompt.format(text=text)
            )
            
            entities_data = json.loads(response)
            return EntityExtraction(**entities_data)
            
        except Exception as e:
            logger.warning("Entity extraction failed", error=str(e))
            return EntityExtraction()
    
    async def _classify_intent(self, text: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Classify intent of the request"""
        try:
            response = await self.llm.apredict(
                self.intent_classification_prompt.format(
                    text=text,
                    context=json.dumps(context)
                )
            )
            
            return json.loads(response)
            
        except Exception as e:
            logger.warning("Intent classification failed", error=str(e))
            return {
                "intent": "create_event",
                "confidence": 0.5,
                "parameters": {},
                "alternatives": []
            }
    
    async def _process_create_event(
        self,
        user_id: int,
        text: str,
        user_context: Dict[str, Any],
        current_schedule: List[Dict[str, Any]],
        entities: EntityExtraction
    ) -> SchedulingResponse:
        """Process event creation request"""
        
        try:
            # Use GPT to analyze and suggest event details
            response = await self.llm.apredict(
                self.scheduling_prompt.format(
                    user_context=json.dumps(user_context),
                    request_text=text,
                    current_schedule=json.dumps(current_schedule)
                )
            )
            
            ai_response = json.loads(response)
            
            # Validate and enhance suggestions
            suggested_events = []
            conflicts = []
            
            for suggestion in ai_response.get("suggested_times", []):
                # Check for conflicts
                event_conflicts = await self._check_conflicts(
                    user_id,
                    suggestion["start_time"],
                    suggestion["end_time"]
                )
                
                if event_conflicts:
                    conflicts.extend(event_conflicts)
                else:
                    # Add travel time if location is specified
                    if ai_response["event_details"].get("location"):
                        travel_time = await self.travel_service.estimate_travel_time(
                            user_id=user_id,
                            destination=ai_response["event_details"]["location"],
                            arrival_time=suggestion["start_time"]
                        )
                        suggestion["travel_time_before"] = travel_time
                    
                    suggested_events.append({
                        **ai_response["event_details"],
                        **suggestion
                    })
            
            return SchedulingResponse(
                success=len(suggested_events) > 0,
                message="Event suggestions generated" if suggested_events else "No suitable time slots found",
                confidence_score=ai_response.get("confidence", 0) / 100.0,
                suggested_events=suggested_events,
                conflicts=conflicts,
                processing_time_ms=None  # Will be set by caller
            )
            
        except Exception as e:
            logger.error("Event creation processing failed", error=str(e))
            return SchedulingResponse(
                success=False,
                message=f"Failed to process event creation: {str(e)}"
            )
    
    async def schedule_event(
        self,
        user_id: int,
        event_data: Dict[str, Any],
        preferences: Optional[Dict[str, Any]] = None,
        constraints: Optional[Dict[str, Any]] = None
    ) -> SchedulingResponse:
        """Schedule an event with AI assistance"""
        
        try:
            # Find optimal time slot
            optimal_time = await self._find_optimal_time_slot(
                user_id=user_id,
                duration_minutes=event_data.get("duration_minutes", 60),
                preferences=preferences or {},
                constraints=constraints or {}
            )
            
            if not optimal_time:
                return SchedulingResponse(
                    success=False,
                    message="No suitable time slot found"
                )
            
            # Create the event
            calendar = await self.calendar_service.get_default_calendar(user_id)
            event = await self.calendar_service.create_event(
                calendar_id=calendar.id,
                event_data={
                    **event_data,
                    "start_time": optimal_time["start_time"],
                    "end_time": optimal_time["end_time"],
                    "created_by_ai": True,
                    "ai_confidence": int(optimal_time["confidence"] * 100)
                }
            )
            
            return SchedulingResponse(
                success=True,
                message="Event scheduled successfully",
                confidence_score=optimal_time["confidence"],
                created_event_ids=[event.id]
            )
            
        except Exception as e:
            logger.error("Event scheduling failed", user_id=user_id, error=str(e))
            raise AIServiceException(f"Failed to schedule event: {str(e)}")
    
    async def reschedule_event(
        self,
        user_id: int,
        event_id: int,
        reason: Optional[str] = None
    ) -> SchedulingResponse:
        """Automatically reschedule an event"""
        
        try:
            # Get the event
            event = await self.calendar_service.get_event(event_id)
            if not event or event.calendar.user_id != user_id:
                raise AIServiceException("Event not found or access denied")
            
            # Find new time slot
            optimal_time = await self._find_optimal_time_slot(
                user_id=user_id,
                duration_minutes=int((event.end_time - event.start_time).total_seconds() / 60),
                preferences={"avoid_original_time": True},
                constraints={"after": datetime.utcnow()}
            )
            
            if not optimal_time:
                return SchedulingResponse(
                    success=False,
                    message="No suitable alternative time slot found"
                )
            
            # Update the event
            original_start = event.start_time
            updated_event = await self.calendar_service.update_event(
                event_id=event_id,
                event_data={
                    "start_time": optimal_time["start_time"],
                    "end_time": optimal_time["end_time"],
                    "auto_rescheduled": True,
                    "original_start_time": original_start
                }
            )
            
            return SchedulingResponse(
                success=True,
                message=f"Event rescheduled from {original_start} to {optimal_time['start_time']}",
                confidence_score=optimal_time["confidence"],
                modified_event_ids=[event.id]
            )
            
        except Exception as e:
            logger.error("Event rescheduling failed", user_id=user_id, error=str(e))
            raise AIServiceException(f"Failed to reschedule event: {str(e)}")
    
    async def _get_user_context(self, user_id: int) -> Dict[str, Any]:
        """Get user context for AI processing"""
        
        # Get user preferences
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return {}
        
        # Get scheduling context
        stmt = select(SchedulingContext).where(SchedulingContext.user_id == user_id)
        result = await self.db.execute(stmt)
        context = result.scalar_one_or_none()
        
        return {
            "timezone": user.timezone,
            "work_hours": {
                "start": context.work_hours_start if context else "09:00",
                "end": context.work_hours_end if context else "17:00",
                "days": context.work_days if context else [1, 2, 3, 4, 5]
            },
            "preferences": {
                "meeting_length": context.preferred_meeting_length if context else 30,
                "buffer_time": context.buffer_time_between_meetings if context else 15,
                "lunch_time": {
                    "start": context.lunch_time_start if context else "12:00",
                    "end": context.lunch_time_end if context else "13:00"
                }
            },
            "locations": {
                "home": context.home_address if context else None,
                "work": context.work_address if context else None
            }
        }
    
    async def _get_current_schedule(self, user_id: int, days: int = 7) -> List[Dict[str, Any]]:
        """Get user's current schedule for context"""
        
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=days)
        
        events = await self.calendar_service.get_events(
            user_id=user_id,
            start_time=start_date,
            end_time=end_date
        )
        
        return [
            {
                "id": event.id,
                "title": event.title,
                "start_time": event.start_time.isoformat(),
                "end_time": event.end_time.isoformat(),
                "location": event.location
            }
            for event in events
        ]
    
    async def _check_conflicts(
        self,
        user_id: int,
        start_time: str,
        end_time: str
    ) -> List[Dict[str, Any]]:
        """Check for scheduling conflicts"""
        
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        conflicts = await self.calendar_service.find_conflicts(
            user_id=user_id,
            start_time=start_dt,
            end_time=end_dt
        )
        
        return [
            {
                "event_id": conflict.id,
                "event_title": conflict.title,
                "conflict_type": "overlap"
            }
            for conflict in conflicts
        ]
    
    async def _find_optimal_time_slot(
        self,
        user_id: int,
        duration_minutes: int,
        preferences: Dict[str, Any],
        constraints: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Find optimal time slot for an event"""
        
        # This is a simplified implementation
        # In a real system, this would use more sophisticated AI algorithms
        
        user_context = await self._get_user_context(user_id)
        current_schedule = await self._get_current_schedule(user_id)
        
        # Find free time slots
        free_slots = await self.calendar_service.find_free_time_slots(
            user_id=user_id,
            duration_minutes=duration_minutes,
            start_date=constraints.get("after", datetime.utcnow()),
            end_date=constraints.get("before", datetime.utcnow() + timedelta(days=30))
        )
        
        if not free_slots:
            return None
        
        # Score each slot based on preferences
        best_slot = None
        best_score = 0
        
        for slot in free_slots:
            score = await self._score_time_slot(slot, user_context, preferences)
            if score > best_score:
                best_score = score
                best_slot = slot
        
        if best_slot:
            return {
                "start_time": best_slot["start_time"],
                "end_time": best_slot["end_time"],
                "confidence": best_score,
                "reason": f"Optimal time based on your preferences (score: {best_score:.2f})"
            }
        
        return None
    
    async def _score_time_slot(
        self,
        slot: Dict[str, Any],
        user_context: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> float:
        """Score a time slot based on user preferences"""
        
        score = 0.5  # Base score
        
        # Prefer work hours
        slot_hour = slot["start_time"].hour
        work_start = int(user_context["work_hours"]["start"].split(":")[0])
        work_end = int(user_context["work_hours"]["end"].split(":")[0])
        
        if work_start <= slot_hour <= work_end:
            score += 0.3
        
        # Prefer weekdays if it's a work event
        if slot["start_time"].weekday() < 5:  # Monday = 0, Friday = 4
            score += 0.2
        
        # Avoid lunch time
        lunch_start = int(user_context["preferences"]["lunch_time"]["start"].split(":")[0])
        lunch_end = int(user_context["preferences"]["lunch_time"]["end"].split(":")[0])
        
        if not (lunch_start <= slot_hour <= lunch_end):
            score += 0.1
        
        return min(score, 1.0)
    
    async def _create_ai_log(
        self,
        user_id: int,
        action_type: str,
        input_text: str,
        voice_command_id: Optional[int] = None
    ) -> AISchedulingLog:
        """Create AI scheduling log entry"""
        
        log_entry = AISchedulingLog(
            user_id=user_id,
            voice_command_id=voice_command_id,
            action_type=action_type,
            input_text=input_text
        )
        
        self.db.add(log_entry)
        await self.db.commit()
        await self.db.refresh(log_entry)
        
        return log_entry
    
    async def _update_ai_log(
        self,
        log_id: int,
        success: bool,
        result_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        processing_time_ms: Optional[int] = None
    ):
        """Update AI scheduling log entry"""
        
        stmt = select(AISchedulingLog).where(AISchedulingLog.id == log_id)
        result = await self.db.execute(stmt)
        log_entry = result.scalar_one_or_none()
        
        if log_entry:
            log_entry.success = success
            log_entry.result_data = result_data
            log_entry.error_message = error_message
            log_entry.total_processing_time_ms = processing_time_ms
            log_entry.completed_at = datetime.utcnow()
            
            await self.db.commit()
    
    # Additional methods for other AI features would go here...
    async def _process_reschedule_event(self, user_id, text, user_context, entities):
        """Process reschedule event request"""
        # Implementation for rescheduling logic
        pass
    
    async def _process_find_time(self, user_id, text, user_context, current_schedule, entities):
        """Process find time request"""
        # Implementation for finding available time slots
        pass
    
    async def _process_generic_request(self, user_id, text, user_context, intent, entities):
        """Process generic AI request"""
        # Implementation for other types of requests
        pass