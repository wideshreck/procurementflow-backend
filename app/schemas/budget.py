from pydantic import BaseModel, Field
from typing import List, Optional
from .procurement import PurchaseRequest # Ana talep şemasını import ediyoruz

# --- Request Models ---

class BudgetRequest(BaseModel):
    """
    Defines the request body sent to the main budget endpoint.
    It contains the entire purchase request object.
    """
    purchaseRequest: PurchaseRequest = Field(..., description="The complete purchase request object to be processed.")


# --- Response Models ---

class PriceDetail(BaseModel):
    """
    Represents a monetary amount with its currency.
    """
    amount: float
    currency: str = "TRY"

class BudgetItem(BaseModel):
    """
    Defines the structure for a single item within the final budget response.
    """
    description: str = Field(..., description="The description of the item.")
    quantity: int = Field(..., description="The quantity of the item.")
    unitOfMeasure: str = Field(..., description="The unit of measure for the item.")
    unitPrice: PriceDetail = Field(..., description="The final unit price (either user-inputted or AI-estimated).")
    total_cost: PriceDetail = Field(..., description="The total calculated cost for this item line.")
    justification: str = Field(..., description="The justification for the price (e.g., 'User-provided' or 'AI-estimated').")

class BudgetResponse(BaseModel):
    """
    Defines the final response structure from the budget finalization endpoint.
    """
    title: str = Field(..., description="The title of the purchase request.")
    total_estimated_cost: PriceDetail = Field(..., description="The grand total estimated cost for the entire request.")
    items: List[BudgetItem] = Field(..., description="A detailed list of items with their final costs and justifications.")