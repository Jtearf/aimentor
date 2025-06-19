"""
Credit counting middleware for API rate limiting and subscription management.
"""
from typing import Callable, Dict, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.supabase import get_supabase_client

# Initialize security scheme for token authentication
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """
    Validate JWT token and return user information.
    """
    client = get_supabase_client()
    
    try:
        # Verify JWT token with Supabase
        response = client.auth.get_user(credentials.credentials)
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user details from database
        user_response = client.table("users") \
            .select("*") \
            .eq("id", response.user.id) \
            .execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
            
        return user_response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def check_user_credits(user_id: UUID) -> bool:
    """
    Check if user has enough credits or is on a premium plan.
    """
    client = get_supabase_client()
    response = client.table("users") \
        .select("plan, credits_left") \
        .eq("id", str(user_id)) \
        .execute()
        
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    user = response.data[0]
    
    # Premium users (monthly/annual) have unlimited credits
    if user["plan"] in ["monthly", "annual"]:
        return True
        
    # Free users need positive credits
    return user["credits_left"] > 0


async def get_user_credits(user_id: UUID) -> int:
    """
    Get current user credits.
    """
    client = get_supabase_client()
    response = client.table("users") \
        .select("credits_left") \
        .eq("id", str(user_id)) \
        .execute()
        
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return response.data[0]["credits_left"]


class CreditRequiredMiddleware(BaseHTTPMiddleware):
    """
    Middleware that checks if the user has enough credits for paid endpoints.
    """
    def __init__(self, app, credit_paths: Dict[str, int] = None):
        super().__init__(app)
        # Dictionary of paths that require credits and how many credits they cost
        # Default is 1 credit per request
        self.credit_paths = credit_paths or {
            "/api/chat": 1,  # 1 credit per chat message
            "/api/pitch": 3,  # 3 credits per pitch evaluation
        }
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Skip credit check for non-credit paths
        path = request.url.path
        if not any(path.startswith(credit_path) for credit_path in self.credit_paths):
            return await call_next(request)
        
        # Check for authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing or invalid",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = auth_header.replace("Bearer ", "")
        
        try:
            # Get user from token
            client = get_supabase_client()
            response = client.auth.get_user(token)
            user_id = response.user.id
            
            # Check user credits
            has_credits = await check_user_credits(UUID(user_id))
            
            if not has_credits:
                return HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Insufficient credits",
                )
            
            # Continue with the request
            return await call_next(request)
        except Exception as e:
            return HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication error: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
