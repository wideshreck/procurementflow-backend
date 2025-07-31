import logging
from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, APIChatResponse 
from app.services.chat_service import get_chat_response

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=APIChatResponse, summary="Handle Chat Interaction")
async def handle_chat(request: ChatRequest):
    """
    Handles the main chat interaction with the user.
    Receives a user message and returns a structured response from the AI model.
    """
    try:
        # get_chat_response çağrısından 'is_done' parametresini kaldırıyoruz.
        # Bu değişiklik hatayı çözecektir.
        model_response_data = get_chat_response(
            session_id=request.session_id,
            user_message=request.user_message
        )
        
        return APIChatResponse(
            session_id=request.session_id,
            model_response=model_response_data
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred in the chat service.")