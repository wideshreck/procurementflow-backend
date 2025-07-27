# procurementflow-backend/app/schemas/budget.py

from pydantic import BaseModel, Field
from typing import List, Optional

class PurchaseRequestItem(BaseModel):
    """Bir satınalma talebindeki tek bir kalemi tanımlar."""
    type: str = Field(..., description="Kalemin türü (mal, hizmet, danışmanlık).", examples=["good", "service", "consultancy"])
    category: str
    subcategory: str
    description: str
    quantity: int
    unitOfMeasure: str = Field(..., description="Ölçü birimi.", examples=["adet", "kg", "paket"])
    notes: Optional[str] = None

class PurchaseRequest(BaseModel):
    """AI tarafından oluşturulan satınalma talebinin detaylarını içerir."""
    title: str
    description: str
    priority: str = Field(..., description="Talebin önceliği.", examples=["Low", "Medium", "High"])
    neededBy: str = Field(..., description="Talep edilen son teslim tarihi.")
    item: PurchaseRequestItem

class BudgetRequest(BaseModel):
    """Bütçe endpoint'i için istek modeli."""
    purchaseRequest: PurchaseRequest

class UnitPrice(BaseModel):
    """Birim fiyat modelini tanımlar."""
    amount: float
    currency: str = "TRY"

class TotalCost(BaseModel):
    """Toplam maliyet modelini tanımlar."""
    amount: float
    currency: str = "TRY"

class BudgetResponse(BaseModel):
    """Bütçe endpoint'i için yanıt modeli."""
    unitPrice: UnitPrice
    total_cost: TotalCost
    justification: str
    notes: List[str]