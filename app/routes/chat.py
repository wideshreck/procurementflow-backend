# app/routes/chat.py

import logging
import json
from fastapi import APIRouter, HTTPException, status

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.openai_service import process_chat_interaction
from openai import APIError

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Interact with the AI Chatbot"
)
async def handle_chat(request: ChatRequest):
    try:
        model_response_str = process_chat_interaction(
            session_id=request.session_id,
            user_message=request.user_message,
            is_done=request.is_done
        )
        
        # The service returns a string, we need to parse it into a dict
        # to fit the Pydantic response model.
        model_response_json = json.loads(model_response_str)

        return ChatResponse(
            session_id=request.session_id,
            model_response=model_response_json
        )

    except APIError as e:
        logger.error(f"OpenAI API Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The AI service is currently unavailable: {e.body.get('message')}"
        )
    except RuntimeError as e:
        logger.critical(f"Runtime Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except json.JSONDecodeError:
        logger.error("Failed to parse JSON response from OpenAI model.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The AI model returned an invalid JSON format."
        )