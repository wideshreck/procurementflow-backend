# app/routes/utility.py

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.services.supabase import get_supabase_client
from app.schemas.message import Message
from app.schemas.status import StatusResponse

# Create a logger specific to this module
logger = logging.getLogger(__name__)

# An APIRouter to group the routes of this module
router = APIRouter()

@router.get(
    "/",
    response_model=Message,
    summary="Get a simple welcome message"
)
async def get_root_message():
    """Returns a welcome message for the V1 API root."""
    logger.info("V1 root endpoint was called.")
    return Message(content="API V1 is running")


@router.post(
    "/echo",
    response_model=Message,
    summary="Echo back the received message"
)
async def post_message(message: Message):
    """Receives a message in the request body and returns it."""
    logger.info(f"Echo endpoint was called with: '{message.content}'")
    return message


@router.get(
    "/supabase-status",
    response_model=StatusResponse,
    summary="Check the connection status to Supabase"
)
async def check_supabase_connection(
    supabase: Client = Depends(get_supabase_client)
):
    """
    Checks the database API connection by sending a lightweight HEAD request
    to the 'profiles' table.
    """
    logger.info("Checking Supabase status via endpoint by querying 'profiles' table.")
    try:
        supabase.table("profiles").select("id", head=True).limit(1).execute()
        return StatusResponse(status="ok", message="Supabase connection is successful.")
    
    except Exception as e:
        # Check if the error is from PostgREST and log it with more detail.
        error_message = str(e)
        if hasattr(e, 'json'):
            error_message = e.json().get('message', str(e))

        logger.error(f"Supabase status check failed: {error_message}", exc_info=True)
        
        # Raising an exception is better than returning an error message.
        # This allows for standardized client-side error handling.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not connect to the database service: {error_message}",
        )