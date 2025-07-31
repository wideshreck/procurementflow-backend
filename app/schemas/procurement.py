from pydantic import BaseModel, Field
from typing import List, Optional

class ItemProperty(BaseModel):
    """Represents a single property of an item, like 'RAM' or 'Color'."""
    name: str = Field(..., description="The name of the property (e.g., 'RAM', 'Screen Size').")
    value: str = Field(..., description="The value of the property (e.g., '16GB', '15-inch').")

class PurchaseRequestItem(BaseModel):
    """Defines a single item or service within a purchase request."""
    type: str = Field(..., description="The type of the item, either 'good' or 'service'.")
    category: str = Field(..., description="The main category of the item (e.g., 'IT Equipment', 'Software').")
    subcategory: str = Field(..., description="The subcategory of the item (e.g., 'Laptop', 'License').")
    description: str = Field(..., description="A detailed description of the item or service.")
    quantity: int = Field(..., gt=0, description="The quantity of the item, must be greater than 0.")
    unitOfMeasure: str = Field(..., description="The unit of measure for the quantity (e.g., 'adet', 'lisans', 'saat').")
    notes: Optional[str] = Field(None, description="Additional notes or specifications for the item.")
    properties: Optional[List[ItemProperty]] = Field(None, description="A list of specific properties for the item.")
    userInputUnitPrice: Optional[float] = Field(None, description="Unit price for the item, manually entered by the user.", gt=0)

class PurchaseRequest(BaseModel):
    """Represents the entire purchase request created by the user through the chat interface."""
    title: str = Field(..., description="A concise title for the purchase request.")
    description: str = Field(..., description="A more detailed description of the overall request.")
    priority: str = Field("Medium", description="The priority of the request (e.g., 'Low', 'Medium', 'High').")
    neededBy: Optional[str] = Field(None, description="The date by which the items/services are needed (YYYY-MM-DD).")
    items: List[PurchaseRequestItem] = Field(..., description="A list of items or services included in the request.")