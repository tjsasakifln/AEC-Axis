"""
Pydantic schemas for Project endpoints.
"""
from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    """Base project schema with common fields."""
    name: str = Field(..., min_length=1, description="Project name")
    address: Optional[str] = Field(None, description="Project address")
    start_date: Optional[date] = Field(None, description="Project start date")


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""
    pass


class ProjectResponse(ProjectBase):
    """Schema for project responses."""
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True