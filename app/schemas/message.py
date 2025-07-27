# app/schemas/message.py

from pydantic import BaseModel

class Message(BaseModel):
    """Represents a simple text message."""
    content: str