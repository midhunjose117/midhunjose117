import openai
from datetime import datetime, timedelta
import re
from typing import Dict, Any, List, Optional
import json

from core.config import settings
from schemas.nlp import ParsedEvent, NLPResponse
from utils.logger import setup_logger

logger = setup_logger(__name__)


class NLPService:
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
    
    async def parse_event_request(self, text: str, context: Dict[str, Any]) -> NLPResponse:
        """Parse natural language text to extract event information"""
        
        system_prompt = """You are an AI calendar assistant. Extract calendar event information from natural language.
        
        Extract the following information:
        - Event title
        - Date and time (be smart about relative dates like "tomorrow", "next Monday")
        - Duration (if not specified, suggest appropriate duration)
        - Location
        - Description
        - Participants
        - Categories (meeting, personal, work, etc.)
        - Priority (1-5, 1 being highest)
        - Recurrence pattern
        
        Also identify the intent: create, update, delete, or query.
        
        Current context:
        - User timezone: {timezone}
        - Current time: {current_time}
        
        Return as JSON with the structure matching the ParsedEvent schema."""
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt.format(
                            timezone=context.get("timezone", "UTC"),
                            current_time=context.get("current_time", datetime.utcnow())
                        )
                    },
                    {
                        "role": "user",
                        "content": text
                    }
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            parsed_data = json.loads(response.choices[0].message.content)
            
            # Process the parsed data
            parsed_event = self._create_parsed_event(parsed_data, context)
            
            # Determine if clarification is needed
            requires_clarification = self._check_clarification_needed(parsed_event)
            clarification_prompts = self._generate_clarification_prompts(parsed_event)
            
            return NLPResponse(
                parsed_event=parsed_event,
                intent=parsed_data.get("intent", "create"),
                entities=parsed_data.get("entities", {}),
                suggestions=self._generate_suggestions(parsed_event),
                requires_clarification=requires_clarification,
                clarification_prompts=clarification_prompts
            )
            
        except Exception as e:
            logger.error(f"Failed to parse event request: {str(e)}")
            raise
    
    def _create_parsed_event(self, data: Dict[str, Any], context: Dict[str, Any]) -> ParsedEvent:
        """Create ParsedEvent from parsed data"""
        # Parse dates with context awareness
        start_time = self._parse_datetime(
            data.get("date"),
            data.get("time"),
            context.get("timezone", "UTC"),
            context.get("current_time")
        )
        
        duration = data.get("duration_minutes", 30)
        end_time = None
        if start_time and duration:
            end_time = start_time + timedelta(minutes=duration)
        
        return ParsedEvent(
            title=data.get("title", "Untitled Event"),
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration,
            location=data.get("location"),
            description=data.get("description"),
            participants=data.get("participants", []),
            categories=data.get("categories", []),
            priority=data.get("priority", 3),
            recurrence=data.get("recurrence"),
            confidence=data.get("confidence", 0.8)
        )
    
    def _parse_datetime(self, date_str: Optional[str], time_str: Optional[str], 
                       timezone: str, current_time: Optional[datetime]) -> Optional[datetime]:
        """Parse date and time from natural language"""
        if not date_str:
            return None
        
        current = current_time or datetime.utcnow()
        
        # Handle relative dates
        if "tomorrow" in date_str.lower():
            date = current.date() + timedelta(days=1)
        elif "today" in date_str.lower():
            date = current.date()
        elif "next" in date_str.lower():
            # Simple next weekday parsing
            weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            for i, day in enumerate(weekdays):
                if day in date_str.lower():
                    days_ahead = i - current.weekday()
                    if days_ahead <= 0:
                        days_ahead += 7
                    date = current.date() + timedelta(days=days_ahead)
                    break
        else:
            # Try to parse absolute date
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except:
                return None
        
        # Parse time
        if time_str:
            try:
                time = datetime.strptime(time_str, "%H:%M").time()
            except:
                # Try parsing with AM/PM
                try:
                    time = datetime.strptime(time_str, "%I:%M %p").time()
                except:
                    time = datetime.strptime("09:00", "%H:%M").time()  # Default time
        else:
            time = datetime.strptime("09:00", "%H:%M").time()  # Default time
        
        return datetime.combine(date, time)
    
    def _check_clarification_needed(self, event: ParsedEvent) -> bool:
        """Check if clarification is needed for the parsed event"""
        if not event.title or event.title == "Untitled Event":
            return True
        if not event.start_time:
            return True
        if event.confidence < 0.7:
            return True
        return False
    
    def _generate_clarification_prompts(self, event: ParsedEvent) -> List[str]:
        """Generate clarification prompts based on missing information"""
        prompts = []
        
        if not event.title or event.title == "Untitled Event":
            prompts.append("What would you like to call this event?")
        
        if not event.start_time:
            prompts.append("When would you like to schedule this event?")
        
        if not event.duration_minutes:
            prompts.append("How long should this event last?")
        
        if event.confidence < 0.7:
            prompts.append("I'm not entirely sure I understood correctly. Could you please clarify?")
        
        return prompts
    
    def _generate_suggestions(self, event: ParsedEvent) -> List[str]:
        """Generate helpful suggestions for the event"""
        suggestions = []
        
        if event.location and not event.travel_time_before:
            suggestions.append("Consider adding travel time before this event")
        
        if event.duration_minutes and event.duration_minutes > 120:
            suggestions.append("This is a long event. Consider scheduling a break")
        
        if event.priority == 1:
            suggestions.append("This is marked as high priority. Should I block time for preparation?")
        
        return suggestions
    
    async def generate_calendar_suggestions(self, user_id: int, db) -> List[Dict[str, Any]]:
        """Generate AI suggestions for calendar optimization"""
        # This would analyze the user's calendar and provide suggestions
        # For now, return sample suggestions
        return [
            {
                "type": "optimization",
                "title": "Meeting consolidation",
                "description": "You have 3 back-to-back meetings. Consider combining or adding breaks.",
                "action": "reschedule"
            },
            {
                "type": "pattern",
                "title": "Recurring pattern detected",
                "description": "You meet with the team every Tuesday. Should I create a recurring event?",
                "action": "create_recurring"
            }
        ]