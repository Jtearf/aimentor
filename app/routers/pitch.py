"""
Pitch evaluation API routes for startup pitch feedback.
"""
import uuid
from datetime import datetime
import logging
from typing import List
from pydantic import UUID4

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.supabase import get_supabase_client
from app.schemas.models import PitchEvaluation, PitchEvaluationCreate, PersonaBasic
from app.services.ai.openai_production_service import OpenAIService
from app.utils.auth import get_current_user

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/pitch",
    tags=["pitch"],
    responses={
        404: {"description": "Not found"},
        401: {"description": "Unauthorized"},
        402: {"description": "Payment required"},
        403: {"description": "Forbidden"},
    },
)


async def get_persona(persona_id: UUID4):
    """Get persona from database."""
    client = get_supabase_client()
    response = client.table("personas") \
        .select("*") \
        .eq("id", str(persona_id)) \
        .execute()
        
    if not response.data:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    return response.data[0]


async def check_premium_access(user_id: UUID4) -> bool:
    """Check if user has premium access."""
    client = get_supabase_client()
    response = client.table("users") \
        .select("plan") \
        .eq("id", str(user_id)) \
        .execute()
        
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return response.data[0]["plan"] in ["monthly", "annual"]


@router.post("/evaluate", response_model=PitchEvaluation, status_code=status.HTTP_201_CREATED)
async def evaluate_pitch(
    pitch_data: PitchEvaluationCreate,
    user_id: UUID4 = Depends(get_current_user)
) -> PitchEvaluation:
    """
    Evaluate a startup pitch using the selected persona.
    
    Premium users only feature.
    """
    # User ID is now securely obtained from the JWT token
    logger.info(f"Pitch evaluation request from user {user_id}")
        
    # Check if user has premium access
    is_premium = await check_premium_access(user_id)
    if not is_premium:
        logger.warning(f"User {user_id} attempted to access premium pitch evaluation without subscription")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Premium subscription required for pitch evaluation"
        )
        
    # Get persona
    persona_data = await get_persona(pitch_data.persona_id)
    persona = PersonaBasic(**persona_data)
    
    # Generate evaluation with AI
    logger.info(f"Generating pitch evaluation using persona {pitch_data.persona_id} for user {user_id}")
    evaluation = await OpenAIService.evaluate_pitch(
        persona,
        pitch_data.pitch_text
    )
    
    # Save to database
    client = get_supabase_client()
    pitch_eval_dict = {
        "id": str(uuid.uuid4()),
        "user_id": str(user_id),
        "persona_id": str(pitch_data.persona_id),
        "pitch_text": pitch_data.pitch_text,
        "evaluation": evaluation,
        "created_at": datetime.now().isoformat()
    }
    
    client.table("pitch_evaluations").insert(pitch_eval_dict).execute()
    logger.info(f"Saved pitch evaluation for user {user_id}")
    
    # Return with persona data included
    return PitchEvaluation(
        **pitch_eval_dict,
        persona=persona
    )


@router.get("/history", response_model=List[PitchEvaluation])
async def get_pitch_history(
    user_id: UUID4 = Depends(get_current_user)
) -> List[PitchEvaluation]:
    """
    Get history of user's pitch evaluations.
    """
    # User ID is now securely obtained from the JWT token
    logger.info(f"Getting pitch evaluation history for user {user_id}")
        
    client = get_supabase_client()
    
    # Get all user's pitch evaluations
    eval_response = client.table("pitch_evaluations") \
        .select("*") \
        .eq("user_id", str(user_id)) \
        .order("created_at", desc=True) \
        .execute()
        
    if not eval_response.data:
        return []
        
    # Get all referenced personas
    persona_ids = [e["persona_id"] for e in eval_response.data]
    persona_response = client.table("personas") \
        .select("id, name, avatar_url, description, expertise") \
        .in_("id", persona_ids) \
        .execute()
        
    # Create lookup dictionary
    personas = {p["id"]: PersonaBasic(**p) for p in persona_response.data}
    
    # Combine data
    evaluations = []
    for eval_data in eval_response.data:
        persona_id = eval_data["persona_id"]
        persona = personas.get(persona_id)
        
        evaluation = PitchEvaluation(
            **eval_data,
            persona=persona
        )
        evaluations.append(evaluation)
        
    return evaluations


@router.get("/{evaluation_id}", response_model=PitchEvaluation)
async def get_pitch_evaluation(
    evaluation_id: UUID4,
    user_id: UUID4 = Depends(get_current_user)
) -> PitchEvaluation:
    """
    Get a specific pitch evaluation by ID.
    """
    # User ID is now securely obtained from the JWT token
    logger.info(f"Getting pitch evaluation {evaluation_id} for user {user_id}")
        
    client = get_supabase_client()
    
    # Get evaluation
    eval_response = client.table("pitch_evaluations") \
        .select("*") \
        .eq("id", str(evaluation_id)) \
        .eq("user_id", str(user_id)) \
        .execute()
        
    if not eval_response.data:
        raise HTTPException(status_code=404, detail="Evaluation not found")
        
    eval_data = eval_response.data[0]
    
    # Get persona
    persona_id = eval_data["persona_id"]
    persona_response = client.table("personas") \
        .select("id, name, avatar_url, description, expertise") \
        .eq("id", persona_id) \
        .execute()
        
    if not persona_response.data:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    persona = PersonaBasic(**persona_response.data[0])
    
    # Return combined data
    return PitchEvaluation(
        **eval_data,
        persona=persona
    )
