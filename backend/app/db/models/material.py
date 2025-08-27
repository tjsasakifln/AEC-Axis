"""
Material model for AEC Axis.

This model represents the materials table for storing material data
extracted from processed IFC files.
"""
import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Material(Base):
    """
    Material model representing materials extracted from IFC files.
    
    This table stores material information including descriptions, quantities,
    and units extracted during IFC file processing.
    """
    __tablename__ = "materials"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    description = Column(String, nullable=False)
    quantity = Column(Numeric, nullable=False)
    unit = Column(String, nullable=False)
    
    # Foreign key to ifc_files table
    ifc_file_id = Column(PG_UUID(as_uuid=True), ForeignKey("ifc_files.id"), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to IFCFile
    ifc_file = relationship("IFCFile", back_populates="materials")
    
    # Relationship to RFQItems
    rfq_items = relationship("RFQItem", back_populates="material")
    
    def __repr__(self) -> str:
        return f"<Material(id={self.id}, description='{self.description}', quantity={self.quantity}, unit='{self.unit}', ifc_file_id={self.ifc_file_id})>"