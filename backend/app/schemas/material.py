"""
Pydantic schemas for Material endpoints.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class MaterialBase(BaseModel):
    """Base material schema with common fields."""
    description: str = Field(..., min_length=1, description="Material description")
    quantity: Decimal = Field(..., gt=0, description="Material quantity")
    unit: str = Field(..., min_length=1, description="Material unit")


class MaterialUpdate(BaseModel):
    """Schema for updating a material."""
    description: Optional[str] = Field(None, min_length=1, description="Material description")
    quantity: Optional[Decimal] = Field(None, gt=0, description="Material quantity")
    unit: Optional[str] = Field(None, min_length=1, description="Material unit")


class MaterialResponse(MaterialBase):
    """Schema for material responses."""
    id: uuid.UUID
    ifc_file_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True