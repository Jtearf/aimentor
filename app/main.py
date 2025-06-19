"""
Main entry point for the Chat with a Billionaire application.
"""
import os
import logging
from datetime import datetime
from typing import Dict, Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.db.supabase import get_supabase_client, close_supabase_client
from app.middleware.credits import CreditRequiredMiddleware
from app.middleware.rate_limiting import RateLimitingMiddleware
from app.routers import chat, subscriptions, personas, pitch, conversations, users
from app.utils.auth import get_current_user, validate_jwt

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Check that all required environment variables are set
required_env_vars = [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "OPENAI_API_KEY",
    "FRONTEND_URL",
]

for var in required_env_vars:
    if not os.environ.get(var):
        logger.error(f"Missing required environment variable: {var}")

# Create FastAPI application
app = FastAPI(
    title="Chat with a Billionaire",
    description="AI-powered mentoring platform featuring personas of famous entrepreneurs",
    version="1.0.0",
    docs_url=None if os.environ.get("ENVIRONMENT") == "production" else "/docs",
    redoc_url=None if os.environ.get("ENVIRONMENT") == "production" else "/redoc"
)

# Add CORS middleware
allowed_origins = []

# Add development origins only if not in production
if os.environ.get("ENVIRONMENT") != "production":
    allowed_origins.extend([
        "http://localhost:3000",  # React dev server
        "http://localhost:8000",  # FastAPI server
        "http://localhost:5173",  # Vite dev server
    ])

# Always add configured frontend URL
if frontend_url := os.environ.get("FRONTEND_URL"):
    allowed_origins.append(frontend_url)
else:
    logger.warning("FRONTEND_URL environment variable not set")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Add rate limiting middleware
app.add_middleware(
    RateLimitingMiddleware,
    rate_limit_per_minute=int(os.environ.get("RATE_LIMIT_PER_MINUTE", "60")),
    rate_limited_paths=["/api/"]
)

# Add credit required middleware
app.add_middleware(
    CreditRequiredMiddleware,
    credit_paths={
        "/api/chat": 1,     # 1 credit per chat message
        "/api/pitch": 3,    # 3 credits per pitch evaluation
    }
)



# Include all router modules
app.include_router(chat.router, dependencies=[Depends(get_current_user)])
app.include_router(subscriptions.router, dependencies=[Depends(get_current_user)])
app.include_router(personas.router, dependencies=[Depends(get_current_user)])
app.include_router(pitch.router, dependencies=[Depends(get_current_user)])
app.include_router(conversations.router, dependencies=[Depends(get_current_user)])
app.include_router(users.router, dependencies=[Depends(get_current_user)])

# Mount static files if they exist
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except:
    print("Static directory not found, skipping static file mounting")

@app.get("/")
async def root():
    """Root endpoint returning basic API information."""
    return {
        "name": "Chat with a Billionaire API",
        "status": "online",
        "version": "0.1.0",
        "description": "AI-powered mentoring platform featuring personas of famous entrepreneurs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "environment": os.environ.get("ENVIRONMENT", "development")
    }

@app.on_event("shutdown")
def shutdown_event():
    """Close connections on shutdown."""
    close_supabase_client()

if __name__ == "__main__":
    import uvicorn
    # Only enable reload in development mode
    reload_enabled = os.environ.get("ENVIRONMENT") != "production"
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=int(os.environ.get("PORT", 8000)), 
        reload=reload_enabled,
        log_level="info"
    )

