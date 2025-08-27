"""
Pydantic schemas for RFQ endpoints.
"""
import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class RFQCreate(BaseModel):
    """Schema for creating a new RFQ."""
    project_id: uuid.UUID = Field(..., description="Project ID for the RFQ")
    material_ids: List[uuid.UUID] = Field(..., min_items=1, description="List of material IDs to include in RFQ")
    supplier_ids: List[uuid.UUID] = Field(..., min_items=1, description="List of supplier IDs to send RFQ to")


class RFQItemResponse(BaseModel):
    """Schema for RFQ item responses."""
    id: uuid.UUID
    material_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class RFQResponse(BaseModel):
    """Schema for RFQ responses."""
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime
    rfq_items: List[RFQItemResponse] = Field(default_factory=list)
    
    class Config:
        from_attributes = True