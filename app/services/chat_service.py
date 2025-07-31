import json
import logging
from app.services.openai_service import process_chat_interaction, clear_conversation
from app.schemas.chat import InternalChatResponse # Modeli buradan import ediyoruz

logger = logging.getLogger(__name__)

# Fonksiyon imzasının 'is_done' parametresini İÇERMEDİĞİNDEN emin olun
def get_chat_response(session_id: str, user_message: str) -> InternalChatResponse:
    """
    Kullanıcı mesajını alır, OpenAI'den gelen yanıtı işler ve
    API için standart bir InternalChatResponse nesnesi döndürür.
    """
    raw_response_str = process_chat_interaction(session_id, user_message)

    try:
        data = json.loads(raw_response_str)
        response_model = InternalChatResponse(**data)
        
        if response_model.is_done:
            clear_conversation(session_id)
            
        return response_model

    except (json.JSONDecodeError, TypeError):
        logger.warning(f"OpenAI response was not a valid JSON. Treating as a simple question. Content: '{raw_response_str}'")
        return InternalChatResponse(
            type="question",
            message=raw_response_str,
            is_done=False
        )