"""
Pydantic models for database schemas and API requests/responses.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Union
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class PlanType(str, Enum):
    """Subscription plan types."""
    FREE = "free"
    MONTHLY = "monthly"
    ANNUAL = "annual"


class SubscriptionStatus(str, Enum):
    """Subscription status types."""
    ACTIVE = "active"
    CANCELED = "canceled"
    EXPIRED = "expired"


class UserBase(BaseModel):
    """Base user model."""
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    """User creation model."""
    password: str


class UserDB(UserBase):
    """User model as stored in the database."""
    id: UUID
    plan: PlanType = PlanType.FREE
    credits_left: int = 5  # Default 5 free credits
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        orm_mode = True


class User(UserBase):
    """User model returned to client."""
    id: UUID
    plan: PlanType
    credits_left: int
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        orm_mode = True


class PersonaBase(BaseModel):
    """Base persona model."""
    name: str
    avatar_url: str
    prompt_template: str
    description: str
    expertise: List[str]


class PersonaCreate(PersonaBase):
    """Persona creation model."""
    pass


class PersonaDB(PersonaBase):
    """Persona model as stored in the database."""
    id: UUID
    created_at: datetime

    class Config:
        orm_mode = True


class Persona(PersonaBase):
    """Persona model returned to client."""
    id: UUID
    created_at: datetime

    class Config:
        orm_mode = True


class PersonaBasic(BaseModel):
    """Simplified persona model for list views."""
    id: UUID
    name: str
    avatar_url: str
    description: str
    expertise: List[str]

    class Config:
        orm_mode = True


class MessageBase(BaseModel):
    """Base message model."""
    content: str
    is_user: bool = True


class MessageCreate(MessageBase):
    """Message creation model."""
    persona_id: UUID
    conversation_id: Optional[UUID] = None


class MessageDB(MessageBase):
    """Message model as stored in the database."""
    id: UUID
    user_id: UUID
    persona_id: UUID
    conversation_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True


class Message(MessageBase):
    """Message model returned to client."""
    id: UUID
    user_id: UUID
    persona_id: UUID
    conversation_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True


class ConversationBase(BaseModel):
    """Base conversation model."""
    persona_id: UUID
    title: str


class ConversationCreate(ConversationBase):
    """Conversation creation model."""
    pass


class ConversationDB(ConversationBase):
    """Conversation model as stored in the database."""
    id: UUID
    user_id: UUID
    created_at: datetime
    last_message_at: datetime

    class Config:
        orm_mode = True


class Conversation(ConversationBase):
    """Conversation model returned to client."""
    id: UUID
    user_id: UUID
    persona: PersonaBasic
    created_at: datetime
    last_message_at: datetime
    messages: Optional[List[Message]] = None

    class Config:
        orm_mode = True


class ConversationSummary(BaseModel):
    """Summary of a conversation for list views."""
    id: UUID
    title: str
    persona_id: UUID
    persona_name: str
    persona_avatar_url: str
    last_message: Optional[str] = None
    last_message_at: datetime

    class Config:
        orm_mode = True


class SubscriptionBase(BaseModel):
    """Base subscription model."""
    plan: Union[PlanType.MONTHLY, PlanType.ANNUAL]


class SubscriptionCreate(SubscriptionBase):
    """Subscription creation model (from payment webhook)."""
    user_id: UUID
    payment_id: str
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    start_date: datetime
    end_date: datetime


class SubscriptionDB(SubscriptionBase):
    """Subscription model as stored in the database."""
    id: UUID
    user_id: UUID
    status: SubscriptionStatus
    payment_id: str
    start_date: datetime
    end_date: datetime

    class Config:
        orm_mode = True


class Subscription(SubscriptionBase):
    """Subscription model returned to client."""
    id: UUID
    user_id: UUID
    status: SubscriptionStatus
    start_date: datetime
    end_date: datetime
    days_remaining: int

    class Config:
        orm_mode = True


class PaymentRequest(BaseModel):
    """Payment request model."""
    plan: Union[PlanType.MONTHLY, PlanType.ANNUAL]
    payment_method: str = "card"
    amount: int  # in cents
    return_url: str


class PaymentResponse(BaseModel):
    """Payment response model."""
    checkout_url: str
    reference: str


class PitchEvaluationBase(BaseModel):
    """Base pitch evaluation model."""
    persona_id: UUID
    pitch_text: str


class PitchEvaluationCreate(PitchEvaluationBase):
    """Pitch evaluation creation model."""
    pass


class PitchEvaluationDB(PitchEvaluationBase):
    """Pitch evaluation model as stored in the database."""
    id: UUID
    user_id: UUID
    evaluation: str
    created_at: datetime

    class Config:
        orm_mode = True


class PitchEvaluation(PitchEvaluationBase):
    """Pitch evaluation model returned to client."""
    id: UUID
    user_id: UUID
    persona: PersonaBasic
    evaluation: str
    created_at: datetime

    class Config:
        orm_mode = True


class ChatRequest(BaseModel):
    """Chat request model."""
    persona_id: UUID
    message: str
    conversation_id: Optional[UUID] = None


class ChatResponse(BaseModel):
    """Chat response model."""
    message_id: UUID
    conversation_id: UUID
    content: str
    is_user: bool = False
    created_at: datetime
