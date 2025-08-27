"""
Pydantic schemas for Quote endpoints.
"""
import uuid
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

from pydantic import BaseModel, Field


class QuoteItemCreate(BaseModel):
    """Schema for creating a quote item."""
    rfq_item_id: uuid.UUID = Field(..., description="RFQ Item ID this quote refers to")
    price: float = Field(..., gt=0, description="Quoted price for the item")
    lead_time_days: int = Field(..., gt=0, description="Lead time in days for delivery")


class QuoteCreate(BaseModel):
    """Schema for creating a quote."""
    items: List[QuoteItemCreate] = Field(..., min_length=1, description="List of quoted items")


class QuoteItemResponse(BaseModel):
    """Schema for quote item responses."""
    id: uuid.UUID
    rfq_item_id: uuid.UUID
    price: Decimal
    lead_time_days: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class QuoteResponse(BaseModel):
    """Schema for quote responses."""
    id: uuid.UUID
    rfq_id: uuid.UUID
    supplier_id: uuid.UUID
    submitted_at: datetime
    created_at: datetime
    quote_items: List[QuoteItemResponse] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


class ProjectInfo(BaseModel):
    """Schema for project information in quote details."""
    id: uuid.UUID
    name: str
    address: Optional[str] = None


class MaterialInfo(BaseModel):
    """Schema for material information in quote details."""
    id: uuid.UUID
    rfq_item_id: uuid.UUID
    description: str
    quantity: Decimal
    unit: str


class QuoteDetailsResponse(BaseModel):
    """Schema for quote details responses (GET endpoint)."""
    rfq_id: uuid.UUID
    project: ProjectInfo
    materials: List[MaterialInfo]


class SupplierInfo(BaseModel):
    """Schema for supplier information in dashboard."""
    id: uuid.UUID
    name: str
    email: str
    cnpj: str


class DashboardQuoteItem(BaseModel):
    """Schema for quote item in dashboard comparison."""
    price: Decimal
    lead_time_days: int
    submitted_at: datetime
    supplier: SupplierInfo


class DashboardMaterial(BaseModel):
    """Schema for material with quotes in dashboard."""
    id: uuid.UUID
    rfq_item_id: uuid.UUID
    description: str
    quantity: Decimal
    unit: str
    quotes: List[DashboardQuoteItem]


class QuoteDashboardResponse(BaseModel):
    """Schema for quote dashboard comparison response."""
    rfq_id: uuid.UUID
    project: ProjectInfo
    materials: List[DashboardMaterial]