"""
Conversations API routes for managing chat conversations.
"""
from datetime import datetime
import logging
from typing import List, Optional
from pydantic import UUID4

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.supabase import get_supabase_client
from app.schemas.models import Conversation, ConversationCreate, ConversationSummary, Message, PersonaBasic
from app.utils.auth import get_current_user

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/conversations",
    tags=["conversations"],
    responses={
        404: {"description": "Not found"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"}
    },
)


@router.get("/", response_model=List[ConversationSummary])
async def list_conversations(
    user_id: UUID4 = Depends(get_current_user),
    limit: int = 10,
    offset: int = 0
) -> List[ConversationSummary]:
    """
    List user's conversations with pagination.
    """
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
        
    client = get_supabase_client()
    
    # Get conversations
    conv_response = client.table("conversations") \
        .select("*") \
        .eq("user_id", str(user_id)) \
        .order("last_message_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
        
    conversations = conv_response.data
    
    # Get personas for these conversations
    persona_ids = [c["persona_id"] for c in conversations]
    persona_response = client.table("personas") \
        .select("id, name, avatar_url") \
        .in_("id", persona_ids) \
        .execute()
        
    persona_dict = {p["id"]: p for p in persona_response.data}
    
    # Get last message for each conversation
    conversation_summaries = []
    for conv in conversations:
        # Get persona
        persona_id = conv["persona_id"]
        persona = persona_dict.get(persona_id, {})
        
        # Get latest message
        msg_response = client.table("messages") \
            .select("content") \
            .eq("conversation_id", conv["id"]) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
            
        last_message = None
        if msg_response.data:
            last_message = msg_response.data[0]["content"]
            # Truncate long messages
            if last_message and len(last_message) > 50:
                last_message = last_message[:50] + "..."
        
        conversation_summaries.append(
            ConversationSummary(
                id=UUID4(conv["id"]),
                title=conv["title"],
                persona_id=UUID4(persona_id),
                persona_name=persona.get("name", "Unknown"),
                persona_avatar_url=persona.get("avatar_url", ""),
                last_message=last_message,
                last_message_at=datetime.fromisoformat(conv["last_message_at"].replace("Z", "+00:00"))
            )
        )
        
    return conversation_summaries


@router.get("/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: UUID4,
    user_id: UUID4 = Depends(get_current_user),
    message_limit: int = 50
) -> Conversation:
    """
    Get a specific conversation with messages.
    """
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
        
    client = get_supabase_client()
    
    # Get conversation
    conv_response = client.table("conversations") \
        .select("*") \
        .eq("id", str(conversation_id)) \
        .eq("user_id", str(user_id)) \
        .execute()
        
    if not conv_response.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    conv_data = conv_response.data[0]
    
    # Get persona
    persona_id = conv_data["persona_id"]
    persona_response = client.table("personas") \
        .select("id, name, avatar_url, description, expertise") \
        .eq("id", persona_id) \
        .execute()
        
    if not persona_response.data:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    persona = PersonaBasic(**persona_response.data[0])
    
    # Get messages
    msg_response = client.table("messages") \
        .select("*") \
        .eq("conversation_id", str(conversation_id)) \
        .order("created_at", desc=False) \
        .limit(message_limit) \
        .execute()
        
    messages = [Message(**msg) for msg in msg_response.data]
    
    # Return combined data
    logger.info(f"Successfully retrieved conversation {conversation_id} with {len(messages)} messages")
    return Conversation(
        id=UUID4(conv_data["id"]),
        user_id=user_id,
        persona_id=UUID4(persona_id),
        title=conv_data["title"],
        created_at=datetime.fromisoformat(conv_data["created_at"].replace("Z", "+00:00")),
        last_message_at=datetime.fromisoformat(conv_data["last_message_at"].replace("Z", "+00:00")),
        persona=persona,
        messages=messages
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID4,
    user_id: UUID4 = Depends(get_current_user)
):
    """
    Delete a conversation and all its messages.
    """
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
        
    client = get_supabase_client()
    
    # Verify conversation belongs to user
    conv_response = client.table("conversations") \
        .select("id") \
        .eq("id", str(conversation_id)) \
        .eq("user_id", str(user_id)) \
        .execute()
        
    if not conv_response.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    # Delete messages first (foreign key constraint)
    client.table("messages") \
        .delete() \
        .eq("conversation_id", str(conversation_id)) \
        .execute()
        
    # Delete conversation
    client.table("conversations") \
        .delete() \
        .eq("id", str(conversation_id)) \
        .execute()
        
    logger.info(f"Successfully deleted conversation {conversation_id} for user {user_id}")
    
    return None
