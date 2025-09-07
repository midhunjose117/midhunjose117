from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Application Settings
    APP_NAME: str = "AI Calendar Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str
    API_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    
    # OpenAI API
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # Nextcloud/CalDAV
    CALDAV_URL: str
    CALDAV_USERNAME: str
    CALDAV_PASSWORD: str
    
    # Google Maps API
    GOOGLE_MAPS_API_KEY: str
    
    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS Origins
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()