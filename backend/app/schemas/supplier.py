"""
Pydantic schemas for Supplier endpoints.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SupplierBase(BaseModel):
    """Base supplier schema with common fields."""
    name: str = Field(..., min_length=1, description="Supplier name")
    cnpj: str = Field(..., min_length=1, description="Supplier CNPJ")
    email: str = Field(..., min_length=1, description="Supplier email")


class SupplierCreate(SupplierBase):
    """Schema for creating a new supplier."""
    pass


class SupplierResponse(SupplierBase):
    """Schema for supplier responses."""
    id: uuid.UUID
    company_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True