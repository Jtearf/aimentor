"""
Subscription API routes for handling PayStack payments and subscriptions.
"""
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import UUID4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.db.supabase import get_supabase_client
from app.schemas.models import PaymentRequest, PaymentResponse, PlanType, Subscription, SubscriptionCreate
from app.services.payment.paystack_service import PaystackService, PLAN_CREDITS
from app.utils.auth import get_current_user

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/subscriptions",
    tags=["subscriptions"],
    responses={
        404: {"description": "Not found"},
        401: {"description": "Unauthorized"},
        402: {"description": "Payment required"},
        403: {"description": "Forbidden"},
    },
)


async def get_user_email(user_id: UUID4) -> str:
    """Get user email from database."""
    client = get_supabase_client()
    response = client.table("users").select("email").eq("id", str(user_id)).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return response.data[0]["email"]


@router.post("/payment", response_model=PaymentResponse)
async def create_payment_session(
    payment_request: PaymentRequest, 
    user_id: UUID4 = Depends(get_current_user)
) -> PaymentResponse:
    """
    Create a PayStack payment session for subscription.
    """
    logger.info(f"Creating payment session for user {user_id}, plan: {payment_request.plan}")
        
    # Get user email
    email = await get_user_email(user_id)
    
    # Create payment session
    return await PaystackService.create_payment_session(
        user_id=user_id,
        email=email,
        plan=payment_request.plan,
        amount=payment_request.amount,
        return_url=payment_request.return_url
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def paystack_webhook(request: Request) -> Dict[str, str]:
    """
    Handle PayStack webhook for successful payments.
    """
    try:
        # Parse webhook payload
        payload = await request.json()
        
        # Process payment successful event
        subscription_data = await PaystackService.create_subscription_from_webhook(payload)
        
        if subscription_data:
            logger.info(f"Processing successful payment webhook for user {subscription_data.user_id}, plan: {subscription_data.plan}")
            
            # Save subscription to database
            client = get_supabase_client()
            subscription_dict = subscription_data.dict()
            
            # Convert UUID to string
            subscription_dict["id"] = str(uuid.uuid4())
            subscription_dict["user_id"] = str(subscription_dict["user_id"])
            
            # Convert datetime to string
            subscription_dict["start_date"] = subscription_dict["start_date"].isoformat()
            subscription_dict["end_date"] = subscription_dict["end_date"].isoformat()
            
            # Insert subscription
            client.table("subscriptions").insert(subscription_dict).execute()
            
            # Update user plan and credits
            plan = subscription_data.plan
            credits = PLAN_CREDITS.get(plan, 0)
            
            client.table("users") \
                .update({"plan": plan, "credits_left": credits}) \
                .eq("id", str(subscription_data.user_id)) \
                .execute()
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        # Always return 200 OK to PayStack even if processing fails
        # Log the error instead of returning an error response
        return {"status": "success"}


@router.get("/active", response_model=Optional[Subscription])
async def get_active_subscription(user_id: UUID4 = Depends(get_current_user)) -> Optional[Subscription]:
    """
    Get user's active subscription if any.
    """
    logger.info(f"Getting active subscription for user {user_id}")
        
    client = get_supabase_client()
    response = client.table("subscriptions") \
        .select("*") \
        .eq("user_id", str(user_id)) \
        .eq("status", "active") \
        .order("end_date", desc=True) \
        .limit(1) \
        .execute()
        
    if not response.data:
        return None
        
    subscription = response.data[0]
    
    # Calculate days remaining
    end_date = datetime.fromisoformat(subscription["end_date"].replace("Z", "+00:00"))
    now = datetime.now()
    days_remaining = (end_date - now).days
    
    # Include days_remaining in the response
    subscription["days_remaining"] = max(0, days_remaining)
    
    return Subscription(**subscription)


@router.get("/credits")
async def get_user_credits(user_id: UUID4 = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get user's remaining credits and plan information.
    """
    logger.info(f"Getting credits info for user {user_id}")
        
    client = get_supabase_client()
    response = client.table("users") \
        .select("plan, credits_left") \
        .eq("id", str(user_id)) \
        .execute()
        
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    user = response.data[0]
    
    # Check if user has active subscription
    has_subscription = await get_active_subscription(user_id) is not None
    
    return {
        "plan": user["plan"],
        "credits": user["credits_left"],
        "has_active_subscription": has_subscription,
        "is_unlimited": user["plan"] in [PlanType.MONTHLY.value, PlanType.ANNUAL.value],
    }
