"""
OpenAI integration for AI personas.
"""
import os
from typing import AsyncGenerator, List, Optional
from uuid import UUID

import openai
from dotenv import load_dotenv
from fastapi import HTTPException

from app.schemas.models import Message, Persona

load_dotenv()

# Configure OpenAI API
openai.api_key = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")


class OpenAIService:
    """Service for interacting with OpenAI API."""

    @staticmethod
    async def get_persona_completion(
        persona: Persona,
        user_message: str,
        conversation_history: Optional[List[Message]] = None,
        temperature: float = 0.7,
        frequency_penalty: float = 0.3,
        presence_penalty: float = 0.2,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming completion from OpenAI based on persona and conversation history.
        
        Args:
            persona: The AI persona to use
            user_message: The user's current message
            conversation_history: Previous messages in the conversation
            temperature: Controls randomness (0-2)
            frequency_penalty: Decreases likelihood of repetition (0-2)
            presence_penalty: Increases likelihood of new topics (0-2)
            max_tokens: Maximum tokens in response
            
        Yields:
            Chunks of the generated text as they are received
        """
        if not openai.api_key:
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured"
            )
        
        # Format conversation history if provided
        messages = []
        
        # Add system message with persona prompt template
        messages.append({
            "role": "system",
            "content": persona.prompt_template
        })
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-10:]:  # Last 10 messages for context
                role = "user" if msg.is_user else "assistant"
                messages.append({
                    "role": role,
                    "content": msg.content
                })
                
        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        try:
            # Make streaming API call
            response = await openai.ChatCompletion.acreate(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=temperature,
                frequency_penalty=frequency_penalty,
                presence_penalty=presence_penalty,
                max_tokens=max_tokens,
                stream=True,
            )
            
            collected_chunks = []
            collected_message = ""
            
            # Process streaming response
            async for chunk in response:
                if chunk and hasattr(chunk, 'choices') and chunk.choices:
                    content = chunk.choices[0].delta.get("content", "")
                    if content:
                        collected_chunks.append(content)
                        collected_message += content
                        yield content
                        
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"OpenAI API error: {str(e)}"
            )

    @staticmethod
    async def evaluate_pitch(
        persona: Persona,
        pitch_text: str,
        temperature: float = 0.7,
    ) -> str:
        """
        Generate a pitch evaluation from the specified persona.
        
        Args:
            persona: The AI persona to use
            pitch_text: The pitch to evaluate
            temperature: Controls randomness (0-2)
            
        Returns:
            The full evaluation text
        """
        if not openai.api_key:
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured"
            )
            
        messages = [
            {
                "role": "system",
                "content": f"{persona.prompt_template}\n\nYou are evaluating a startup pitch. "
                           f"Provide detailed, constructive feedback as {persona.name} would. "
                           f"Be specific about strengths and weaknesses. Offer actionable advice."
            },
            {
                "role": "user",
                "content": f"Here's my startup pitch:\n\n{pitch_text}\n\nPlease evaluate it and provide feedback."
            }
        ]
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=1500,
                stream=False,
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"OpenAI API error: {str(e)}"
            )
