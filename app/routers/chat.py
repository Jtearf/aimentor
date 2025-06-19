"""
Chat API routes for billionaire mentor conversations.
"""
import uuid
from datetime import datetime
from typing import List, Optional
from typing import Dict, List, Optional
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import UUID4
import uuid

from app.db.supabase import get_supabase_client
from app.schemas.models import ChatRequest, Message, Persona
from app.services.ai.openai_production_service import OpenAIService
from app.utils.auth import get_current_user

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
    responses={
        404: {"description": "Not found"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
    },
)


async def get_persona(persona_id: UUID4) -> Persona:
    """Get persona from database."""
    client = get_supabase_client()
    response = client.table("personas").select("*").eq("id", str(persona_id)).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    return Persona(**response.data[0])


async def get_conversation_history(
    conversation_id: Optional[UUID4] = None,
    user_id: UUID4 = Depends(get_current_user),
    limit: int = 10
) -> List[Message]:
    """Get conversation history from database."""
    client = get_supabase_client()
    response = client.table("messages") \
        .select("*") \
        .eq("conversation_id", str(conversation_id)) \
        .eq("user_id", str(user_id)) \
        .order("created_at", desc=False) \
        .limit(limit) \
        .execute()
        
    return [Message(**msg) for msg in response.data]


async def check_user_credits(user_id: UUID4) -> bool:
    """Check if user has enough credits."""
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


async def decrement_user_credits(user_id: UUID4) -> int:
    """Decrement user credits and return new value."""
    client = get_supabase_client()
    
    # Only decrement for free users
    user_response = client.table("users") \
        .select("plan, credits_left") \
        .eq("id", str(user_id)) \
        .execute()
        
    if not user_response.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    user = user_response.data[0]
    
    # Don't decrement for premium users
    if user["plan"] in ["monthly", "annual"]:
        return user["credits_left"]
        
    # Decrement for free users
    new_credits = max(0, user["credits_left"] - 1)
    
    client.table("users") \
        .update({"credits_left": new_credits}) \
        .eq("id", str(user_id)) \
        .execute()
        
    return new_credits


@router.post("", status_code=status.HTTP_200_OK)
async def chat(
    request: Request,
    chat_request: ChatRequest,
    user_id: UUID4 = Depends(get_current_user),
):
    """
    Send a message to an AI persona and get a streaming response.
    """
    # User ID is now securely obtained from the JWT token
    logger.info(f"Chat request from user {user_id}")
        
    # Check if user has credits
    has_credits = await check_user_credits(user_id)
    if not has_credits:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits"
        )
        
    # Get persona
    persona = await get_persona(chat_request.persona_id)
    
    # Get or create conversation
    client = get_supabase_client()
    conversation_id = chat_request.conversation_id
    
    if not conversation_id:
        # Create new conversation
        now = datetime.now().isoformat()
        conversation_data = {
            "id": str(uuid.uuid4()),
            "user_id": str(user_id),
            "persona_id": str(chat_request.persona_id),
            "title": chat_request.message[:30] + "..." if len(chat_request.message) > 30 else chat_request.message,
            "created_at": now,
            "last_message_at": now,
        }
        client.table("conversations").insert(conversation_data).execute()
        conversation_id = UUID4(conversation_data["id"])
    else:
        # Update conversation timestamp
        client.table("conversations") \
            .update({"last_message_at": datetime.now().isoformat()}) \
            .eq("id", str(conversation_id)) \
            .execute()
    
    # Save user message
    message_id = uuid.uuid4()
    message_data = {
        "id": str(message_id),
        "user_id": str(user_id),
        "persona_id": str(chat_request.persona_id),
        "conversation_id": str(conversation_id),
        "content": chat_request.message,
        "is_user": True,
        "created_at": datetime.now().isoformat()
    }
    
    client.table("messages").insert(message_data).execute()
    
    # Decrement user credits
    await decrement_user_credits(user_id)
    
    # Get conversation history
    history = await get_conversation_history(user_id, conversation_id)
    
    # Stream AI response
    async def response_generator():
        # Save AI message placeholder
        ai_message_id = uuid.uuid4()
        ai_message_data = {
            "id": str(ai_message_id),
            "user_id": str(user_id),
            "persona_id": str(chat_request.persona_id),
            "conversation_id": str(conversation_id),
            "content": "",  # Will be updated when complete
            "is_user": False,
            "created_at": datetime.now().isoformat()
        }
        
        client.table("messages").insert(ai_message_data).execute()
        
        # Stream response chunks
        full_response = ""
        async for chunk in OpenAIService.get_persona_completion(
            persona,
            chat_request.message,
            history,
        ):
            full_response += chunk
            yield f"data: {chunk}\n\n"
            
        # Update AI message with complete content
        client.table("messages") \
            .update({"content": full_response}) \
            .eq("id", str(ai_message_id)) \
            .execute()
            
        yield f"data: [DONE]\n\n"
        
    return StreamingResponse(
        response_generator(),
        media_type="text/event-stream"
    )
