from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import Optional
import tempfile
import os

from core.database import get_db
from models import User
from schemas.nlp import NLPRequest, NLPResponse, VoiceTranscriptionResponse
from services.nlp_service import NLPService
from services.voice_service import VoiceService
from api.auth import get_current_user
from utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter()


@router.post("/parse", response_model=NLPResponse)
async def parse_natural_language(
    request: NLPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Parse natural language input to extract calendar event information"""
    nlp_service = NLPService()
    
    try:
        result = await nlp_service.parse_event_request(
            text=request.text,
            context={
                "user_id": current_user.id,
                "timezone": request.timezone or "UTC",
                "current_time": request.current_time
            }
        )
        
        logger.info(f"NLP parse successful for user {current_user.username}")
        return result
    
    except Exception as e:
        logger.error(f"NLP parse failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse input: {str(e)}"
        )


@router.post("/voice/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(
    audio_file: UploadFile = File(...),
    language: Optional[str] = "en",
    current_user: User = Depends(get_current_user)
):
    """Transcribe voice input to text"""
    if not audio_file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an audio file"
        )
    
    voice_service = VoiceService()
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await audio_file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Transcribe audio
        transcription = await voice_service.transcribe_audio(tmp_file_path, language)
        
        # Clean up
        os.unlink(tmp_file_path)
        
        logger.info(f"Voice transcription successful for user {current_user.username}")
        return {"text": transcription, "language": language}
    
    except Exception as e:
        logger.error(f"Voice transcription failed: {str(e)}")
        if 'tmp_file_path' in locals():
            os.unlink(tmp_file_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to transcribe audio: {str(e)}"
        )


@router.post("/suggest")
async def get_ai_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI suggestions for calendar optimization"""
    nlp_service = NLPService()
    
    try:
        suggestions = await nlp_service.generate_calendar_suggestions(
            user_id=current_user.id,
            db=db
        )
        
        return {"suggestions": suggestions}
    
    except Exception as e:
        logger.error(f"Failed to generate suggestions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate suggestions"
        )