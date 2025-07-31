# app/routes/budget.py
import logging
from fastapi import APIRouter, HTTPException
from app.schemas.budget import BudgetRequest, BudgetResponse
from app.services.openai_service import get_budget_for_request

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=BudgetResponse, summary="Finalize Request and Get Budget")
async def finalize_and_get_budget(request: BudgetRequest):
    """
    Receives a full purchase request, uses user-inputted prices where available,
    gets AI estimates for the rest, and returns a final budget.
    """
    try:
        # 'await' buradan kaldırıldı
        final_budget = get_budget_for_request(request.purchaseRequest)
        return final_budget
    except Exception as e:
        logger.error(f"Error finalizing budget for request {request.purchaseRequest.title}: {e}")
        raise HTTPException(status_code=500, detail=str(e))