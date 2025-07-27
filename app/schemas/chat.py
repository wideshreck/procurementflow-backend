# app/schemas/chat.py

from pydantic import BaseModel, Field
from typing import Dict, Any

class ChatRequest(BaseModel):
    """Defines the request model for the chat endpoint."""
    session_id: str = Field(
        ...,
        description="A unique identifier for the conversation session.",
        examples=["session-12345"]
    )
    user_message: str = Field(
        ...,
        description="The message from the user.",
        examples=["Can you give me three ideas for a new startup?"]
    )
    is_done: bool = Field(
        default=False,
        description="Set to true to end the conversation and clear its history."
    )

class ChatResponse(BaseModel):
    """Defines the response model for the chat endpoint."""
    session_id: str
    model_response: Dict[str, Any]