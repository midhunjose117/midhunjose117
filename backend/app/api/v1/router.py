"""
Main API router for v1 endpoints
"""

from fastapi import APIRouter

from .endpoints import (
    auth,
    calendars,
    events,
    routines,
    ai_scheduling,
    voice,
    sync,
    travel,
    users
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["authentication"]
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"]
)

api_router.include_router(
    calendars.router,
    prefix="/calendars",
    tags=["calendars"]
)

api_router.include_router(
    events.router,
    prefix="/events",
    tags=["events"]
)

api_router.include_router(
    routines.router,
    prefix="/routines",
    tags=["routines"]
)

api_router.include_router(
    ai_scheduling.router,
    prefix="/ai",
    tags=["ai-scheduling"]
)

api_router.include_router(
    voice.router,
    prefix="/voice",
    tags=["voice-processing"]
)

api_router.include_router(
    sync.router,
    prefix="/sync",
    tags=["synchronization"]
)

api_router.include_router(
    travel.router,
    prefix="/travel",
    tags=["travel-time"]
)