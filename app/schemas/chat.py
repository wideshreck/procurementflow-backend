from pydantic import BaseModel, Field
from typing import Optional
from .procurement import PurchaseRequest

class ChatRequest(BaseModel):
    """Defines the request model for the chat endpoint."""
    session_id: str = Field(..., description="A unique identifier for the conversation session.")
    user_message: str = Field(..., description="The message from the user.")

class InternalChatResponse(BaseModel):
    """Defines the actual content of the model's response."""
    type: str
    message: Optional[str] = None
    purchaseRequest: Optional[PurchaseRequest] = None
    is_done: bool

class APIChatResponse(BaseModel):
    """Defines the final API response structure for the chat endpoint."""
    session_id: str
    model_response: InternalChatResponse