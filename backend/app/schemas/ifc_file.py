"""
Pydantic schemas for IFC File endpoints.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IFCFileBase(BaseModel):
    """Base IFC File schema with common fields."""
    original_filename: str = Field(..., description="Original filename of the uploaded IFC file")
    status: str = Field(default="PENDING", description="Processing status of the IFC file")


class IFCFileResponse(IFCFileBase):
    """Schema for IFC File responses."""
    id: uuid.UUID
    file_path: Optional[str] = None
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True