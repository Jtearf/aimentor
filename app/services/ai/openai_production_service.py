"""
Production-ready OpenAI integration service.
"""
import logging
import os
import time
from typing import AsyncGenerator, Dict, List, Optional
import asyncio

import openai
import tenacity
from dotenv import load_dotenv
from fastapi import HTTPException

from app.schemas.models import Message, Persona

# Set up logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure OpenAI API
openai.api_key = os.environ.get("OPENAI_API_KEY")
DEFAULT_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")

# Configure timeouts and retries
REQUEST_TIMEOUT = int(os.environ.get("OPENAI_REQUEST_TIMEOUT_SECONDS", "30"))
MAX_RETRIES = int(os.environ.get("OPENAI_MAX_RETRIES", "3"))
RETRY_DELAY = int(os.environ.get("OPENAI_RETRY_DELAY_SECONDS", "2"))


class OpenAIService:
    """Production-ready service for interacting with OpenAI API."""

    @classmethod
    @tenacity.retry(
        stop=tenacity.stop_after_attempt(MAX_RETRIES),
        wait=tenacity.wait_exponential(multiplier=RETRY_DELAY, min=1, max=10),
        retry=tenacity.retry_if_exception_type(
            (openai.error.APIError, openai.error.APIConnectionError, openai.error.RateLimitError, 
             openai.error.ServiceUnavailableError, openai.error.Timeout)
        ),
        reraise=True,
        before_sleep=lambda retry_state: logger.warning(
            f"OpenAI API request failed. Retrying in {retry_state.next_action.sleep} seconds..."
        )
    )
    async def _make_api_request(cls, **kwargs) -> AsyncGenerator:
        """
        Make API request with retries and proper error handling.
        """
        try:
            response = await openai.ChatCompletion.acreate(**kwargs)
            return response
        except (openai.error.APIError, openai.error.APIConnectionError,
                openai.error.RateLimitError, openai.error.ServiceUnavailableError) as e:
            logger.error(f"OpenAI API error after retries: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail="AI service temporarily unavailable. Please try again shortly."
            )
        except openai.error.InvalidRequestError as e:
            logger.error(f"Invalid OpenAI request: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Invalid request to AI service."
            )
        except openai.error.AuthenticationError as e:
            logger.critical(f"OpenAI authentication error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="AI service configuration error."
            )
        except Exception as e:
            logger.exception(f"Unexpected error in OpenAI request: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="An unexpected error occurred. Please try again later."
            )

    @staticmethod
    def validate_configuration():
        """Validate that OpenAI API is properly configured."""
        if not openai.api_key:
            logger.critical("OpenAI API key not configured")
            raise ValueError("OpenAI API key not configured")
            
    @staticmethod
    def format_conversation_history(
        persona: Persona,
        user_message: str,
        conversation_history: Optional[List[Message]] = None
    ) -> List[Dict]:
        """
        Format conversation history for OpenAI API.
        
        Args:
            persona: The AI persona to use
            user_message: The user's current message
            conversation_history: Previous messages in the conversation
            
        Returns:
            Formatted message list for OpenAI API
        """
        messages = []
        
        # Add system message with persona prompt template
        messages.append({
            "role": "system",
            "content": persona.prompt_template
        })
        
        # Add conversation history if provided
        if conversation_history:
            # Only include the last 10 messages for context to save tokens
            for msg in conversation_history[-10:]:
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
        
        return messages

    @classmethod
    async def get_persona_completion(
        cls,
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
        start_time = time.time()
        logger.info(f"Starting completion for persona: {persona.name}, message: {user_message[:30]}...")
        
        # Validate API key is set
        cls.validate_configuration()
        
        # Format conversation history
        messages = cls.format_conversation_history(persona, user_message, conversation_history)
        
        try:
            # Make streaming API call
            response = await openai.ChatCompletion.acreate(
                model=DEFAULT_MODEL,
                messages=messages,
                temperature=temperature,
                frequency_penalty=frequency_penalty,
                presence_penalty=presence_penalty,
                max_tokens=max_tokens,
                stream=True,
                request_timeout=REQUEST_TIMEOUT
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
            
            request_time = time.time() - start_time
            logger.info(
                f"Completion finished in {request_time:.2f}s. "
                f"Generated {len(collected_message)} chars."
            )
                        
        except asyncio.TimeoutError:
            logger.error(f"Timeout error after {time.time() - start_time:.2f}s")
            raise HTTPException(
                status_code=504,
                detail="AI service request timed out. Please try again."
            )
        except Exception as e:
            logger.exception(f"Error in completion after {time.time() - start_time:.2f}s: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"OpenAI API error: {str(e)}"
            )

    @classmethod
    async def evaluate_pitch(
        cls,
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
        start_time = time.time()
        logger.info(f"Starting pitch evaluation for persona: {persona.name}")
        
        # Validate API key is set
        cls.validate_configuration()
            
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
            response = await cls._make_api_request(
                model=DEFAULT_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=1500,
                stream=False,
                request_timeout=REQUEST_TIMEOUT
            )
            
            evaluation = response.choices[0].message.content
            request_time = time.time() - start_time
            logger.info(f"Pitch evaluation finished in {request_time:.2f}s.")
            
            return evaluation
            
        except Exception as e:
            logger.exception(f"Error in pitch evaluation after {time.time() - start_time:.2f}s: {str(e)}")
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"AI service error: {str(e)}"
            )
