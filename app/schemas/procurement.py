# app/schemas/procurement_chat.py

from pydantic import BaseModel

class Direct(BaseModel):
    """A generic model for incoming chat message."""
    message: str
    sender: str

class Indirect(BaseModel):
    """A generic model for chat response."""
    response: str