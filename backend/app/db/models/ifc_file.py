"""
IFC File model for AEC Axis.

This model represents the ifc_files table for tracking uploaded IFC files
and their processing status within projects.
"""
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class IFCFile(Base):
    """
    IFC File model representing uploaded IFC files.
    
    This table stores metadata of IFC files uploaded to projects,
    tracking their processing status and storage location.
    """
    __tablename__ = "ifc_files"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=True)  # Path in storage, nullable until processed
    status = Column(String, default="PENDING", nullable=False)  # PENDING, PROCESSING, COMPLETED, FAILED
    
    # Foreign key to projects table
    project_id = Column(PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to Project
    project = relationship("Project", back_populates="ifc_files")
    
    # Relationship to Materials
    materials = relationship("Material", back_populates="ifc_file")
    
    def __repr__(self) -> str:
        return f"<IFCFile(id={self.id}, filename='{self.original_filename}', status='{self.status}', project_id={self.project_id})>"