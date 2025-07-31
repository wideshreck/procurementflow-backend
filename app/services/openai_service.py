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
            messages=history,
            temperature=0.7,
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

def get_single_item_price_suggestion(item: PurchaseRequestItem) -> dict:
    """
    Tek bir ürün için OpenAI kullanarak fiyat tahmini yapar. (Senkron Versiyon)
    """
    if not client:
        raise RuntimeError("OpenAI client is not initialized.")

    prompt = f"""
    Lütfen aşağıdaki ürün için Türkiye pazar koşullarında, KDV hariç, makul bir birim fiyat tahmini yap.
    Sadece birim fiyatı içeren bir JSON nesnesi döndür. Örneğin: {{"amount": 150.50, "currency": "TRY"}}

    Ürün Detayları:
    - Açıklama: {item.description}
    - Kategori: {item.category} / {item.subcategory}
    - Miktar: {item.quantity} {item.unitOfMeasure}
    - Notlar: {item.notes or 'Yok'}
    - Özellikler: {item.properties or 'Belirtilmemiş'}
    """
    messages = [{"role": "system", "content": prompt}]

    logger.info(f"Requesting single item price estimate from OpenAI for: {item.description}")
    # 'await' kaldırıldı
    response = client.chat.completions.create(
        model="gpt-4o-search-preview",
        messages=messages,
    )
    
    content = response.choices[0].message.content
    return json.loads(content)

# Fonksiyondan 'async' kaldırıldı
def get_budget_for_request(purchase_request: PurchaseRequest) -> dict:
    """
    Bir satınalma talebini işler. Kullanıcının girdiği fiyatları kullanır,
    girilmeyenler için yapay zeka tahmini yapar. (Senkron Versiyon)
    """
    total_cost = 0.0
    final_items = []

    for item in purchase_request.items:
        if item.userInputUnitPrice is not None and item.userInputUnitPrice > 0:
            logger.info(f"Using user-provided price for item: {item.description}")
            unit_price = item.userInputUnitPrice
            justification = "Kullanıcı tarafından belirtilen birim fiyat."
        else:
            logger.info(f"Requesting AI price estimate for item: {item.description}")
            # 'await' kaldırıldı
            price_suggestion = get_single_item_price_suggestion(item)
            unit_price = price_suggestion.get("amount", 0)
            justification = "Yapay zeka tarafından tahmin edilen birim fiyat."

        item_total_cost = unit_price * item.quantity
        total_cost += item_total_cost
        
        final_items.append({
            "description": item.description,
            "quantity": item.quantity,
            "unitOfMeasure": item.unitOfMeasure,
            "unitPrice": {"amount": unit_price, "currency": "TRY"},
            "total_cost": {"amount": item_total_cost, "currency": "TRY"},
            "justification": justification
        })

    return {
        "title": purchase_request.title,
        "total_estimated_cost": {"amount": total_cost, "currency": "TRY"},
        "items": final_items
    }

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