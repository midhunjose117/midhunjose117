"""
Configuration settings for the AI Calendar Assistant
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    DEBUG: bool = False
    SECRET_KEY: str = "your-secret-key-change-in-production"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    # Database
    DATABASE_URL: str = "postgresql://calendar_user:calendar_pass@localhost:5432/calendar_ai"
    REDIS_URL: str = "redis://localhost:6379"
    
    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_MAX_TOKENS: int = 2000
    
    # Nextcloud CalDAV
    NEXTCLOUD_URL: Optional[str] = None
    NEXTCLOUD_USERNAME: Optional[str] = None
    NEXTCLOUD_PASSWORD: Optional[str] = None
    CALDAV_CALENDAR_NAME: str = "personal"
    
    # Voice Processing
    WHISPER_API_KEY: Optional[str] = None
    SPEECH_LANGUAGE: str = "en-US"
    ENABLE_VOICE_PROCESSING: bool = True
    
    # Travel Time
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    MAPBOX_ACCESS_TOKEN: Optional[str] = None
    DEFAULT_TRAVEL_MODE: str = "driving"
    
    # JWT
    JWT_SECRET_KEY: str = "your-jwt-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    
    # AWS (for deployment)
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Feature Flags
    ENABLE_AI_SCHEDULING: bool = True
    ENABLE_TRAVEL_TIME: bool = True
    ENABLE_WEEKLY_ROUTINES: bool = True
    ENABLE_AUTO_RESCHEDULE: bool = True
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # Cache Settings
    CACHE_TTL_SECONDS: int = 3600
    CACHE_MAX_CONNECTIONS: int = 10
    
    # Sync Settings
    SYNC_INTERVAL_SECONDS: int = 300  # 5 minutes
    SYNC_BATCH_SIZE: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()