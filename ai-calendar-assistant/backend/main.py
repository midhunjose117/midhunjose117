from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api import auth, calendar, nlp, scheduling
from core.config import settings
from core.database import engine, Base
from utils.logger import setup_logger

logger = setup_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("Starting AI Calendar Assistant API")
    # Create database tables
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("Shutting down AI Calendar Assistant API")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["auth"])
app.include_router(calendar.router, prefix=f"{settings.API_PREFIX}/calendar", tags=["calendar"])
app.include_router(nlp.router, prefix=f"{settings.API_PREFIX}/nlp", tags=["nlp"])
app.include_router(scheduling.router, prefix=f"{settings.API_PREFIX}/scheduling", tags=["scheduling"])


@app.get("/")
async def root():
    return {
        "message": "AI Calendar Assistant API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}