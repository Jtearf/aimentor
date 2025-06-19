"""
Rate limiting middleware for API protection.
"""
import time
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

# In-memory store for rate limiting
# In a production environment, this should be replaced with Redis or similar
# Format: {user_id: [(timestamp1), (timestamp2), ...]}
REQUEST_HISTORY: Dict[str, List[float]] = {}


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that implements rate limiting for API endpoints.
    """
    def __init__(
        self, 
        app, 
        rate_limit_per_minute: int = 60,  # 60 requests per minute by default
        rate_limited_paths: List[str] = None
    ):
        super().__init__(app)
        self.rate_limit_per_minute = rate_limit_per_minute
        self.rate_limited_paths = rate_limited_paths or ["/api/"]
        self.window_size = 60  # 1 minute window
    
    def _should_rate_limit(self, path: str) -> bool:
        """Check if the path should be rate limited."""
        return any(path.startswith(prefix) for prefix in self.rate_limited_paths)
    
    def _is_rate_limited(self, user_id: str) -> bool:
        """Check if the user has exceeded their rate limit."""
        now = time.time()
        
        # Get user's request history
        user_history = REQUEST_HISTORY.get(user_id, [])
        
        # Filter out requests older than the window
        recent_requests = [ts for ts in user_history if ts > now - self.window_size]
        
        # Update the history
        REQUEST_HISTORY[user_id] = recent_requests
        
        # Check if user has exceeded rate limit
        return len(recent_requests) >= self.rate_limit_per_minute
    
    def _add_request(self, user_id: str):
        """Add a request to the user's history."""
        now = time.time()
        
        if user_id not in REQUEST_HISTORY:
            REQUEST_HISTORY[user_id] = []
        
        REQUEST_HISTORY[user_id].append(now)
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Skip rate limiting for non-limited paths
        path = request.url.path
        if not self._should_rate_limit(path):
            return await call_next(request)
        
        # Check for authorization header to identify user
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            # For anonymous users, use IP address for rate limiting
            client_host = request.client.host if request.client else "unknown"
            user_id = f"anon:{client_host}"
        else:
            # Extract user ID from token (simplified)
            # In a real implementation, properly validate the token
            # and extract the user ID
            user_id = auth_header  # Use the full auth header as an identifier
        
        # Check if user is rate limited
        if self._is_rate_limited(user_id):
            return HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": str(self.window_size)},
            )
        
        # Add this request to history
        self._add_request(user_id)
        
        # Continue with the request
        return await call_next(request)
