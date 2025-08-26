"""
Pydantic schemas for Company endpoints.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CompanyBase(BaseModel):
    """Base company schema with common fields."""
    name: str = Field(..., min_length=1, description="Company name")
    cnpj: str = Field(..., min_length=1, description="Company CNPJ")
    email: Optional[str] = Field(None, description="Company email")
    address: Optional[str] = Field(None, description="Company address")
    phone: Optional[str] = Field(None, description="Company phone")


class CompanyCreate(CompanyBase):
    """Schema for creating a new company."""
    pass


class CompanyResponse(CompanyBase):
    """Schema for company responses."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True