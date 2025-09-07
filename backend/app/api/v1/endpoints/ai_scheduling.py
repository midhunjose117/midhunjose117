"""
AI Scheduling endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import structlog

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user.models import User
from app.services.ai.ai_scheduling_service import AISchedulingService
from app.models.ai.schemas import (
    NaturalLanguageRequest,
    SchedulingRequest,
    SchedulingResponse,
    AISchedulingLogResponse,
    ScheduleOptimizationRequest,
    ScheduleAnalysisResponse
)
from app.core.exceptions import AIServiceException

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post("/natural-language", response_model=SchedulingResponse)
async def process_natural_language(
    request: NaturalLanguageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Process natural language scheduling request"""
    try:
        ai_service = AISchedulingService(db)
        result = await ai_service.process_natural_language(
            user_id=current_user.id,
            text=request.text,
            context=request.context
        )
        
        logger.info(
            "Natural language request processed",
            user_id=current_user.id,
            text_length=len(request.text),
            success=result.success
        )
        
        return result
        
    except AIServiceException as e:
        logger.error("AI scheduling failed", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/schedule-event", response_model=SchedulingResponse)
async def schedule_event(
    request: SchedulingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Schedule an event with AI assistance"""
    try:
        ai_service = AISchedulingService(db)
        result = await ai_service.schedule_event(
            user_id=current_user.id,
            event_data=request.event_data,
            preferences=request.preferences,
            constraints=request.constraints
        )
        
        logger.info(
            "Event scheduled with AI",
            user_id=current_user.id,
            event_title=request.event_data.get("title"),
            success=result.success
        )
        
        return result
        
    except AIServiceException as e:
        logger.error("AI event scheduling failed", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/reschedule-event/{event_id}", response_model=SchedulingResponse)
async def reschedule_event(
    event_id: int,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Automatically reschedule an event"""
    try:
        ai_service = AISchedulingService(db)
        result = await ai_service.reschedule_event(
            user_id=current_user.id,
            event_id=event_id,
            reason=reason
        )
        
        logger.info(
            "Event rescheduled with AI",
            user_id=current_user.id,
            event_id=event_id,
            success=result.success
        )
        
        return result
        
    except AIServiceException as e:
        logger.error("AI event rescheduling failed", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/optimize-schedule", response_model=SchedulingResponse)
async def optimize_schedule(
    request: ScheduleOptimizationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Optimize user's schedule for a given time period"""
    try:
        ai_service = AISchedulingService(db)
        result = await ai_service.optimize_schedule(
            user_id=current_user.id,
            start_date=request.start_date,
            end_date=request.end_date,
            optimization_goals=request.optimization_goals,
            constraints=request.constraints
        )
        
        logger.info(
            "Schedule optimized with AI",
            user_id=current_user.id,
            date_range=f"{request.start_date} to {request.end_date}",
            success=result.success
        )
        
        return result
        
    except AIServiceException as e:
        logger.error("Schedule optimization failed", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/analyze-schedule", response_model=ScheduleAnalysisResponse)
async def analyze_schedule(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Analyze user's schedule and provide insights"""
    try:
        ai_service = AISchedulingService(db)
        analysis = await ai_service.analyze_schedule(
            user_id=current_user.id,
            days=days
        )
        
        logger.info(
            "Schedule analyzed",
            user_id=current_user.id,
            days=days
        )
        
        return analysis
        
    except AIServiceException as e:
        logger.error("Schedule analysis failed", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/suggest-times")
async def suggest_meeting_times(
    duration_minutes: int,
    participants: Optional[List[str]] = None,
    preferred_times: Optional[List[str]] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Suggest optimal meeting times"""
    try:
        ai_service = AISchedulingService(db)
        suggestions = await ai_service.suggest_meeting_times(
            user_id=current_user.id,
            duration_minutes=duration_minutes,
            participants=participants or [],
            preferred_times=preferred_times or []
        )
        
        logger.info(
            "Meeting times suggested",
            user_id=current_user.id,
            duration_minutes=duration_minutes,
            suggestions_count=len(suggestions)
        )
        
        return {"suggestions": suggestions}
        
    except AIServiceException as e:
        logger.error("Meeting time suggestion failed", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/logs", response_model=List[AISchedulingLogResponse])
async def get_ai_logs(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI scheduling logs for the user"""
    try:
        ai_service = AISchedulingService(db)
        logs = await ai_service.get_user_ai_logs(
            user_id=current_user.id,
            limit=limit,
            offset=offset
        )
        
        return logs
        
    except Exception as e:
        logger.error("Failed to get AI logs", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve AI logs"
        )


@router.post("/feedback")
async def provide_ai_feedback(
    log_id: int,
    feedback: str,
    rating: int,  # 1-5 stars
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Provide feedback on AI scheduling results"""
    try:
        ai_service = AISchedulingService(db)
        await ai_service.record_feedback(
            user_id=current_user.id,
            log_id=log_id,
            feedback=feedback,
            rating=rating
        )
        
        logger.info(
            "AI feedback recorded",
            user_id=current_user.id,
            log_id=log_id,
            rating=rating
        )
        
        return {"message": "Feedback recorded successfully"}
        
    except Exception as e:
        logger.error("Failed to record AI feedback", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record feedback"
        )