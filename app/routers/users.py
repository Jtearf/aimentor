"""
Users API routes for user management.
"""
import uuid
from datetime import datetime
import logging
from typing import Dict
from pydantic import UUID4

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.supabase import get_supabase_client
from app.schemas.models import User, UserCreate, PlanType
from app.utils.auth import get_current_user

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
    responses={
        404: {"description": "Not found"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        400: {"description": "Bad request"}
    },
)


@router.get("/me", response_model=User)
async def get_user_profile(user_id: UUID4 = Depends(get_current_user)) -> User:
    """
    Get current authenticated user.
    """
    # User ID is now securely obtained from the JWT token
    logger.info(f"Getting user profile for user {user_id}")
        
    client = get_supabase_client()
    response = client.table("users") \
        .select("*") \
        .eq("id", str(user_id)) \
        .execute()
        
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return User(**response.data[0])


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate) -> User:
    """
    Register a new user.
    
    This endpoint is for development purposes only.
    In production, use Supabase Auth.
    """
    client = get_supabase_client()
    
    # Check if email is already registered
    email_check = client.table("users") \
        .select("id") \
        .eq("email", user_data.email) \
        .execute()
        
    if email_check.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Create user
    now = datetime.now().isoformat()
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "avatar_url": user_data.avatar_url,
        "plan": PlanType.FREE.value,
        "credits_left": 5,  # Default 5 free credits
        "created_at": now,
        "last_login": now
    }
    
    # In a real app, you'd hash the password and use proper auth
    # For development purposes, we're skipping that
    
    client.table("users").insert(user_dict).execute()
    
    return User(**user_dict)


@router.post("/add-credits")
async def add_credits(
    credits: int,
    user_id: UUID4 = Depends(get_current_user)
) -> Dict[str, int]:
    """
    Add credits to a user's account.
    
    Dev endpoint for testing.
    """
    # User ID is now securely obtained from the JWT token
    logger.info(f"Adding {credits} credits to user {user_id}")
        
    if credits <= 0 or credits > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credit amount (1-100)"
        )
        
    client = get_supabase_client()
    
    # Get current credits
    user_response = client.table("users") \
        .select("credits_left") \
        .eq("id", str(user_id)) \
        .execute()
        
    if not user_response.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    current_credits = user_response.data[0]["credits_left"]
    new_credits = current_credits + credits
    
    # Update credits
    client.table("users") \
        .update({"credits_left": new_credits}) \
        .eq("id", str(user_id)) \
        .execute()
        
    return {"credits": new_credits}


@router.put("/update-plan")
async def update_plan(
    plan: PlanType,
    user_id: UUID4 = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Update user's subscription plan.
    
    Dev endpoint for testing.
    """
    # User ID is now securely obtained from the JWT token
    logger.info(f"Updating plan for user {user_id} to {plan.value}")
        
    client = get_supabase_client()
    
    # Set credits based on plan
    credits = 5  # Default for free plan
    if plan == PlanType.MONTHLY:
        credits = 100
    elif plan == PlanType.ANNUAL:
        credits = 1200
        
    # Update plan and credits
    client.table("users") \
        .update({
            "plan": plan.value,
            "credits_left": credits
        }) \
        .eq("id", str(user_id)) \
        .execute()
        
    return {"plan": plan.value, "message": "Plan updated successfully"}
