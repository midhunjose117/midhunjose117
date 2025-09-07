"""
Custom exceptions and error handlers
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import structlog
from typing import Union

logger = structlog.get_logger(__name__)


class CalendarAssistantException(Exception):
    """Base exception for Calendar Assistant"""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class AIServiceException(CalendarAssistantException):
    """Exception for AI service errors"""
    pass


class CalendarSyncException(CalendarAssistantException):
    """Exception for calendar sync errors"""
    pass


class VoiceProcessingException(CalendarAssistantException):
    """Exception for voice processing errors"""
    pass


class TravelTimeException(CalendarAssistantException):
    """Exception for travel time estimation errors"""
    pass


class AuthenticationException(CalendarAssistantException):
    """Exception for authentication errors"""
    pass


class RateLimitException(CalendarAssistantException):
    """Exception for rate limiting errors"""
    pass


async def calendar_assistant_exception_handler(
    request: Request, 
    exc: CalendarAssistantException
) -> JSONResponse:
    """Handle custom Calendar Assistant exceptions"""
    logger.error(
        "Calendar Assistant exception",
        error_code=exc.error_code,
        message=exc.message,
        path=request.url.path
    )
    
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.error_code or "calendar_assistant_error",
            "message": exc.message,
            "path": request.url.path
        }
    )


async def http_exception_handler(
    request: Request, 
    exc: Union[HTTPException, StarletteHTTPException]
) -> JSONResponse:
    """Handle HTTP exceptions"""
    logger.warning(
        "HTTP exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "http_error",
            "message": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path
        }
    )


async def validation_exception_handler(
    request: Request, 
    exc: RequestValidationError
) -> JSONResponse:
    """Handle request validation errors"""
    logger.warning(
        "Validation error",
        errors=exc.errors(),
        path=request.url.path
    )
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": "Request validation failed",
            "details": exc.errors(),
            "path": request.url.path
        }
    )


async def general_exception_handler(
    request: Request, 
    exc: Exception
) -> JSONResponse:
    """Handle general exceptions"""
    logger.error(
        "Unhandled exception",
        exception=str(exc),
        exception_type=type(exc).__name__,
        path=request.url.path,
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An internal server error occurred",
            "path": request.url.path
        }
    )


def setup_exception_handlers(app):
    """Setup exception handlers for the FastAPI app"""
    app.add_exception_handler(CalendarAssistantException, calendar_assistant_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)