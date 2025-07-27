# app/schemas/status.py

from pydantic import BaseModel

class StatusResponse(BaseModel):
    """A generic model for status responses."""
    status: str
    message: str