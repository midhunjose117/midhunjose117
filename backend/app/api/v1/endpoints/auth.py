"""
Authentication endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from typing import Optional
import structlog

from app.core.database import get_db
from app.core.config import settings
from app.services.auth.auth_service import AuthService
from app.models.user.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from app.core.exceptions import AuthenticationException

logger = structlog.get_logger(__name__)
router = APIRouter()
security = HTTPBearer()


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    try:
        auth_service = AuthService(db)
        user = await auth_service.register_user(user_data)
        
        logger.info("User registered successfully", user_id=user.id, email=user.email)
        return user
        
    except AuthenticationException as e:
        logger.warning("Registration failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login user and return access token"""
    try:
        auth_service = AuthService(db)
        token_data = await auth_service.authenticate_user(credentials)
        
        logger.info("User logged in successfully", email=credentials.email)
        return token_data
        
    except AuthenticationException as e:
        logger.warning("Login failed", email=credentials.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        auth_service = AuthService(db)
        token_data = await auth_service.refresh_token(credentials.credentials)
        
        logger.info("Token refreshed successfully")
        return token_data
        
    except AuthenticationException as e:
        logger.warning("Token refresh failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Logout user and invalidate token"""
    try:
        auth_service = AuthService(db)
        await auth_service.logout_user(credentials.credentials)
        
        logger.info("User logged out successfully")
        return {"message": "Logged out successfully"}
        
    except AuthenticationException as e:
        logger.warning("Logout failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get current user information"""
    try:
        auth_service = AuthService(db)
        user = await auth_service.get_current_user(credentials.credentials)
        
        return user
        
    except AuthenticationException as e:
        logger.warning("Get current user failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.post("/verify-email")
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Verify user email address"""
    try:
        auth_service = AuthService(db)
        await auth_service.verify_email(token)
        
        logger.info("Email verified successfully")
        return {"message": "Email verified successfully"}
        
    except AuthenticationException as e:
        logger.warning("Email verification failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/forgot-password")
async def forgot_password(
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """Send password reset email"""
    try:
        auth_service = AuthService(db)
        await auth_service.send_password_reset(email)
        
        logger.info("Password reset email sent", email=email)
        return {"message": "Password reset email sent"}
        
    except AuthenticationException as e:
        logger.warning("Password reset failed", email=email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: AsyncSession = Depends(get_db)
):
    """Reset user password"""
    try:
        auth_service = AuthService(db)
        await auth_service.reset_password(token, new_password)
        
        logger.info("Password reset successfully")
        return {"message": "Password reset successfully"}
        
    except AuthenticationException as e:
        logger.warning("Password reset failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )