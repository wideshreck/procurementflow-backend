# app/services/openai_service.py

import json
import logging
from typing import Dict, List, Any
from openai import OpenAI, APIError

from app.core.config import settings

from app.constants.system_prompt import SYSTEM_PROMPT_PROCUREMENT, SYSTEM_PROMPT_BUDGET
from app.schemas.procurement import PurchaseRequest, PurchaseRequestItem

# --- Module-level setup ---
logger = logging.getLogger(__name__)

# Initialize the OpenAI client once
try:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
except Exception as e:
    logger.critical(f"Failed to initialize OpenAI client: {e}")
    client = None

# In-memory cache for conversation histories.
# In a production environment, you would replace this with a persistent store
# like Redis, a database, or a distributed cache.
conversation_histories: Dict[str, List[Dict[str, str]]] = {}

def process_chat_interaction(
    session_id: str, user_message: str, is_done: bool = False
) -> Dict[str, Any]:
    
    if not client:
        raise RuntimeError("OpenAI client is not initialized. Check API key and configuration.")

    if session_id not in conversation_histories:
        logger.info(f"New conversation started with session_id: {session_id}")
        conversation_histories[session_id] = [{"role": "system", "content": SYSTEM_PROMPT_PROCUREMENT}]
    
    history = conversation_histories[session_id]
    history.append({"role": "user", "content": user_message})

    try:
        logger.info(f"Sending request to OpenAI for session_id: {session_id}")
        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.3,
            messages=history,
            response_format={"type": "json_object"}
        )
        
        
        model_response_content = response.choices[0].message.content
        
        history.append({"role": "assistant", "content": model_response_content})
        
        # Eğer görüşme sonlandırıldıysa geçmişi temizle
        if is_done:
            clear_conversation(session_id)

        return model_response_content

    except APIError as e:
        logger.error(f"OpenAI API error for session {session_id}: {e}")
        history.pop()
        raise
    except Exception as e:
        logger.error(f"Unexpected error for session {session_id}: {e}")
        history.pop()
        raise

def estimate_price(
    item: Dict[str, Any]
) -> Dict[str, Any]:
    
    if not client:
        raise RuntimeError("OpenAI client is not initialized. Check API key and configuration.")
    
    item_json_string = json.dumps(item)
    
    SYSTEM_PROMPT_AND_ITEM_COMBO = [{"role": "system", "content": SYSTEM_PROMPT_BUDGET}, {"role": "user", "content": item_json_string}]

    try:
        response = client.chat.completions.create(
            model="gpt-4o-search-preview",
            messages=SYSTEM_PROMPT_AND_ITEM_COMBO,
        )
        
        model_response_content = response.choices[0].message.content

        return json.loads(model_response_content)

    except APIError as e:
        logger.error(f"OpenAI API error in estimate_price: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in estimate_price: {e}", exc_info=True)
        raise

def clear_conversation(session_id: str) -> None:
    """
    Clears the conversation history for a given session.

    Args:
        session_id: The unique identifier for the conversation.
    """
    if session_id in conversation_histories:
        logger.info(f"Clearing conversation history for session_id: {session_id}")
        del conversation_histories[session_id]
    else:
        logger.warning(f"No conversation history found for session_id: {session_id}")