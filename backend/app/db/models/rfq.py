"""
RFQ (Request for Quotation) models for AEC Axis.

This module contains models for RFQ functionality, including RFQ requests
and their associated items linking to materials from IFC file processing.
"""
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class RFQ(Base):
    """
    RFQ model representing quotation requests for construction projects.
    
    This table stores quotation requests created from processed materials
    in construction projects. Each RFQ belongs to a specific project and
    can contain multiple materials for suppliers to quote.
    """
    __tablename__ = "rfqs"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    status = Column(String, nullable=False, default="OPEN", index=True)
    
    # Foreign key to projects table
    project_id = Column(PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="rfqs")
    rfq_items = relationship("RFQItem", back_populates="rfq", cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="rfq", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<RFQ(id={self.id}, project_id={self.project_id}, status='{self.status}')>"


class RFQItem(Base):
    """
    RFQ Item model representing individual materials within an RFQ.
    
    This table creates a many-to-many relationship between RFQs and Materials,
    allowing multiple materials to be included in a single quotation request.
    """
    __tablename__ = "rfq_items"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys
    rfq_id = Column(PG_UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False, index=True)
    material_id = Column(PG_UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    rfq = relationship("RFQ", back_populates="rfq_items")
    material = relationship("Material", back_populates="rfq_items")
    quote_items = relationship("QuoteItem", back_populates="rfq_item", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<RFQItem(id={self.id}, rfq_id={self.rfq_id}, material_id={self.material_id})>"