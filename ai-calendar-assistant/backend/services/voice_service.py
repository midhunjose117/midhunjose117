import openai
import asyncio
from typing import Optional

from core.config import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)


class VoiceService:
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY
    
    async def transcribe_audio(self, audio_file_path: str, language: str = "en") -> str:
        """Transcribe audio file to text using OpenAI Whisper API"""
        try:
            with open(audio_file_path, "rb") as audio_file:
                response = await asyncio.to_thread(
                    openai.Audio.transcribe,
                    model="whisper-1",
                    file=audio_file,
                    language=language
                )
            
            transcribed_text = response.get("text", "")
            logger.info(f"Successfully transcribed audio: {len(transcribed_text)} characters")
            
            return transcribed_text
            
        except Exception as e:
            logger.error(f"Failed to transcribe audio: {str(e)}")
            raise
    
    async def generate_speech(self, text: str, voice: str = "alloy") -> bytes:
        """Generate speech from text using OpenAI TTS API"""
        try:
            response = await asyncio.to_thread(
                openai.Audio.speech.create,
                model="tts-1",
                voice=voice,
                input=text
            )
            
            return response.content
            
        except Exception as e:
            logger.error(f"Failed to generate speech: {str(e)}")
            raise