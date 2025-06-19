"""
Authentication utilities for JWT validation and user management.
"""
import os
import logging
from typing import Optional
from uuid import UUID

import jwt
from fastapi import Request, HTTPException, status
from supabase.client import Client

from app.db.supabase import get_supabase_client

# Set up logger
logger = logging.getLogger(__name__)

# JWT configuration
JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
if not JWT_SECRET and os.environ.get("ENVIRONMENT") == "production":
    logger.error("Missing SUPABASE_JWT_SECRET environment variable in production")


async def validate_jwt(token: str) -> dict:
    """
    Validate a JWT token and return its payload.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded JWT payload
    
    Raises:
        HTTPException: If token is invalid
    """
    try:
        # For Supabase JWT validation
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_signature": bool(JWT_SECRET)}
        )
        return payload
    except jwt.PyJWTError as e:
        logger.warning(f"JWT validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(request: Request) -> Optional[UUID]:
    """
    Extract and validate the user ID from the authentication header.
    
    Args:
        request: FastAPI Request object
    
    Returns:
        UUID of the authenticated user or None if not authenticated
    
    Raises:
        HTTPException: If authentication fails
    """
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = auth_header.replace("Bearer ", "")
    
    # Validate the JWT token
    payload = await validate_jwt(token)
    
    # Extract user ID from the token
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify the user exists in the database
    try:
        client = get_supabase_client()
        response = client.table("users").select("id").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return UUID(user_id)
    except Exception as e:
        logger.error(f"Error verifying user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error",
        )
