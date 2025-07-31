# app/routes/items.py
import logging
from fastapi import APIRouter, HTTPException
from app.schemas.procurement import PurchaseRequestItem
from app.services.openai_service import get_single_item_price_suggestion

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/estimate-price", summary="Estimate Price for a Single Item")
async def estimate_item_price(item: PurchaseRequestItem):
    """
    Receives a single purchase request item and returns an AI-generated price estimate.
    """
    try:
        logger.info(f"Estimating price for item: {item.description}")
        # 'await' buradan kaldırıldı, çünkü çağırdığımız fonksiyon artık senkron
        budget_suggestion = get_single_item_price_suggestion(item)
        return {"estimatedUnitPrice": budget_suggestion}
    except Exception as e:
        logger.error(f"Error estimating price for item {item.description}: {e}")
        raise HTTPException(status_code=500, detail=str(e))