"""
PayStack integration for payments and subscriptions.
"""
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from uuid import UUID

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

from app.schemas.models import PaymentResponse, PlanType, SubscriptionCreate, SubscriptionStatus

load_dotenv()

# PayStack configuration
PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY")
PAYSTACK_API_URL = "https://api.paystack.co"

# Plan pricing (in cents)
PLAN_PRICING = {
    PlanType.MONTHLY: 999,  # $9.99/month
    PlanType.ANNUAL: 4900,  # $49/year
}

# Credit values
PLAN_CREDITS = {
    PlanType.FREE: 5,
    PlanType.MONTHLY: 100,
    PlanType.ANNUAL: 1200,
}


class PaystackService:
    """Service for interacting with PayStack API."""

    @staticmethod
    async def _make_request(
        method: str,
        endpoint: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make a request to the PayStack API.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (without base URL)
            payload: Request payload for POST requests
            
        Returns:
            API response as dictionary
        """
        if not PAYSTACK_SECRET_KEY:
            raise HTTPException(
                status_code=500,
                detail="PayStack API key not configured"
            )
            
        url = f"{PAYSTACK_API_URL}/{endpoint.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient() as client:
            try:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=headers, json=payload)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                return response.json()
                
            except httpx.HTTPStatusError as e:
                error_detail = f"PayStack API error: {str(e)}"
                try:
                    error_data = e.response.json()
                    if "message" in error_data:
                        error_detail = f"PayStack API error: {error_data['message']}"
                except Exception:
                    pass
                
                raise HTTPException(
                    status_code=500,
                    detail=error_detail
                )
                
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"PayStack API error: {str(e)}"
                )

    @classmethod
    async def create_payment_session(
        cls,
        user_id: UUID,
        email: str,
        plan: PlanType,
        amount: int,
        return_url: str
    ) -> PaymentResponse:
        """
        Create a payment session with PayStack.
        
        Args:
            user_id: User's UUID
            email: User's email
            plan: Subscription plan type
            amount: Payment amount in cents
            return_url: URL to redirect after payment
            
        Returns:
            Payment response with checkout URL and reference
        """
        # Validate plan
        if plan == PlanType.FREE:
            raise HTTPException(
                status_code=400,
                detail="Cannot create payment for free plan"
            )
            
        # Verify amount matches plan
        expected_amount = PLAN_PRICING.get(plan)
        if expected_amount != amount:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid amount for {plan} plan. Expected: {expected_amount}"
            )
            
        # Create payment
        payload = {
            "amount": amount * 100,  # Convert to kobo (PayStack's smallest unit)
            "email": email,
            "reference": f"{user_id}_{plan}_{int(datetime.now().timestamp())}",
            "callback_url": return_url,
            "metadata": {
                "user_id": str(user_id),
                "plan": plan,
                "custom_fields": [
                    {
                        "display_name": "User ID",
                        "variable_name": "user_id",
                        "value": str(user_id),
                    },
                    {
                        "display_name": "Plan",
                        "variable_name": "plan",
                        "value": plan,
                    },
                ],
            },
        }
        
        response = await cls._make_request("POST", "/transaction/initialize", payload)
        
        if not response.get("status"):
            raise HTTPException(
                status_code=500,
                detail="Failed to create PayStack payment"
            )
            
        data = response.get("data", {})
        return PaymentResponse(
            checkout_url=data.get("authorization_url", ""),
            reference=data.get("reference", ""),
        )

    @classmethod
    async def verify_payment(cls, reference: str) -> Dict[str, Any]:
        """
        Verify a payment with PayStack.
        
        Args:
            reference: Payment reference
            
        Returns:
            Payment verification data
        """
        response = await cls._make_request("GET", f"/transaction/verify/{reference}")
        
        if not response.get("status"):
            raise HTTPException(
                status_code=500,
                detail="Failed to verify PayStack payment"
            )
            
        return response.get("data", {})

    @classmethod
    async def create_subscription_from_webhook(
        cls,
        webhook_data: Dict[str, Any]
    ) -> Optional[SubscriptionCreate]:
        """
        Process a PayStack webhook and create a subscription.
        
        Args:
            webhook_data: Webhook data from PayStack
            
        Returns:
            Subscription create model or None if invalid
        """
        if webhook_data.get("event") != "charge.success":
            return None
            
        data = webhook_data.get("data", {})
        metadata = data.get("metadata", {})
        
        # Extract user_id and plan from metadata
        user_id_str = metadata.get("user_id")
        plan_str = metadata.get("plan")
        
        if not user_id_str or not plan_str:
            return None
            
        try:
            user_id = UUID(user_id_str)
            plan = PlanType(plan_str)
            
            # Calculate subscription period
            start_date = datetime.now()
            if plan == PlanType.MONTHLY:
                end_date = start_date + timedelta(days=30)
            else:  # ANNUAL
                end_date = start_date + timedelta(days=365)
                
            return SubscriptionCreate(
                user_id=user_id,
                plan=plan,
                payment_id=data.get("reference", ""),
                status=SubscriptionStatus.ACTIVE,
                start_date=start_date,
                end_date=end_date,
            )
            
        except (ValueError, KeyError) as e:
            print(f"Error processing webhook: {str(e)}")
            return None
