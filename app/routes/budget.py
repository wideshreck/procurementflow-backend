# procurementflow-backend/app/routes/budget.py

import logging
import json
from fastapi import APIRouter, HTTPException, status
from openai import APIError

from app.schemas.budget import BudgetRequest, BudgetResponse
from app.services.openai_service import get_budget

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post(
    "/budget",
    response_model=BudgetResponse,
    summary="Get a budget estimation for a purchase request"
)
async def handle_budget_request(request: BudgetRequest):
    """
    Bir satınalma talebi JSON'u alır, yapay zekaya göndererek bütçe analizi yaptırır
    ve sonucu standart bir formatta döndürür.
    """
    try:
        # Servis string olarak JSON döndürdüğü için parse ediyoruz.
        budget_response_str = get_budget(
            purchase_request=request.purchaseRequest
        )
        
        budget_response_json = json.loads(budget_response_str)

        # Pydantic, dönüş sırasında bu veriyi BudgetResponse modeline göre doğrulayacaktır.
        return budget_response_json

    except APIError as e:
        logger.error(f"OpenAI API Error on budget request: {e}")
        error_detail = "The AI service is currently unavailable."
        if e.body and 'message' in e.body:
            error_detail += f" {e.body.get('message')}"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=error_detail
        )
    except RuntimeError as e:
        logger.critical(f"Runtime Error on budget request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except json.JSONDecodeError:
        logger.error("Failed to parse JSON response from OpenAI model for budget.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The AI model returned an invalid JSON format for the budget."
        )
    except Exception as e:
        logger.error(f"An unexpected error occurred during budget handling: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )