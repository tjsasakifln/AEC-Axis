"""
Pydantic schemas for User endpoints.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr = Field(..., description="User email")
    full_name: str = Field(..., min_length=1, description="User full name")
    company_id: uuid.UUID = Field(..., description="Company ID")


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, description="User password")


class UserResponse(UserBase):
    """Schema for user responses."""
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True