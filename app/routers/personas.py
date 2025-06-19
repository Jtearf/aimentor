"""
Personas API routes for managing AI personas.
"""
import uuid
import logging
from datetime import datetime
from typing import List
from pydantic import UUID4

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.supabase import get_supabase_client
from app.schemas.models import Persona, PersonaBasic, PersonaCreate
from app.utils.auth import get_current_user

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/personas",
    tags=["personas"],
    responses={
        404: {"description": "Not found"},
        401: {"description": "Unauthorized"},
        402: {"description": "Payment required"},
        403: {"description": "Forbidden"},
    },
)


@router.get("/", response_model=List[PersonaBasic])
async def list_personas(user_id: UUID4 = Depends(get_current_user)) -> List[PersonaBasic]:
    """
    List all available personas.
    
    Filters by user's plan - free users get limited selection.
    """
    client = get_supabase_client()
    
    logger.info(f"Listing available personas for user {user_id}")
    
    # Check user's plan to determine which personas to show
    plan = "free"
    user_response = client.table("users") \
        .select("plan") \
        .eq("id", str(user_id)) \
        .execute()
        
    if user_response.data:
        plan = user_response.data[0]["plan"]
        logger.info(f"User {user_id} has plan: {plan}")
    
    # Get personas based on plan
    response = client.table("personas").select("*").execute()
    
    personas = [PersonaBasic(**p) for p in response.data]
    
    # Free users only get first 3 personas
    if plan == "free":
        return personas[:3]
        
    # Premium users get all personas
    return personas


@router.get("/{persona_id}", response_model=Persona)
async def get_persona(persona_id: UUID4, user_id: UUID4 = Depends(get_current_user)) -> Persona:
    """
    Get a specific persona by ID.
    
    Checks if user has access to this persona.
    """
    client = get_supabase_client()
    
    # Get persona
    response = client.table("personas") \
        .select("*") \
        .eq("id", str(persona_id)) \
        .execute()
        
    if not response.data:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    persona = Persona(**response.data[0])
    
    logger.info(f"Retrieving persona {persona_id} for user {user_id}")
            
    # Check if user has access to this persona
    user_response = client.table("users") \
        .select("plan") \
        .eq("id", str(user_id)) \
        .execute()
        
    if user_response.data:
        plan = user_response.data[0]["plan"]
        logger.info(f"User {user_id} has plan: {plan}")
        
        # Free users can only access first 3 personas
        if plan == "free":
            # Get all persona IDs
            all_personas_response = client.table("personas").select("id").execute()
            persona_ids = [p["id"] for p in all_personas_response.data]
            
            # Check if requested persona is in first 3
            if str(persona_id) not in persona_ids[:3]:
                logger.warning(f"User {user_id} attempted to access premium persona {persona_id} with free plan")
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Upgrade to access this persona"
                )
    
    return persona


@router.post("/", response_model=Persona, status_code=status.HTTP_201_CREATED)
async def create_persona(persona: PersonaCreate, user_id: UUID4 = Depends(get_current_user)) -> Persona:
    """
    Create a new persona.
    
    Admin only endpoint - not for regular users.
    """
    # This would typically be restricted to admins only
    logger.info(f"Attempting to create new persona by user {user_id}")
        
    client = get_supabase_client()
    
    # Check if user is admin (simplified check)
    # In a real app, you'd check an admin flag in the user record
    user_response = client.table("users") \
        .select("email") \
        .eq("id", str(user_id)) \
        .execute()
        
    if not user_response.data or "@admin" not in user_response.data[0]["email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
        
    # Create persona
    persona_dict = persona.dict()
    persona_dict["id"] = str(uuid.uuid4())
    persona_dict["created_at"] = datetime.now().isoformat()
    
    client.table("personas").insert(persona_dict).execute()
    
    return Persona(**persona_dict)
