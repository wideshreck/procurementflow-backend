import json
import logging
from fastapi import APIRouter, HTTPException
from app.schemas.chat import APIChatResponse 
from app.schemas.procurement import PriceEstimationResponse, PriceOfSingleItem, PurchaseRequestItem, PriceOfTotal
from app.services.openai_service import estimate_price

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=PriceEstimationResponse, summary="Estimate price of single item")
async def estimate_price_endpoint(request: PurchaseRequestItem):
    try:
        # get_chat_response çağrısından 'is_done' parametresini kaldırıyoruz.
        # Bu değişiklik hatayı çözecektir.
        model_response_data = estimate_price(item=request.model_dump())

        return PriceEstimationResponse(
            unitPrice=PriceOfSingleItem(amount=model_response_data["unitPrice"]["amount"], currency=model_response_data["unitPrice"]["currency"]),
            totalCost=PriceOfTotal(amount=model_response_data["totalCost"]["amount"], currency=model_response_data["totalCost"]["currency"]),
            justification=model_response_data["justification"],
            notes=model_response_data["notes"]
        )
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred in the chat service.")