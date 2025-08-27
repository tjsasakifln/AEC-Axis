"""
Project model for AEC Axis.

This model represents the projects table as specified in the PRD requirements.
Projects are construction projects managed by companies on the AEC Axis platform.
"""
import uuid
from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class Project(Base):
    """
    Project model representing construction projects.
    
    This table stores data of construction projects that are managed
    by companies through the AEC Axis platform. Each project belongs
    to a company and can contain multiple IFC files and quotation requests.
    """
    __tablename__ = "projects"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False, index=True)
    address = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    
    # Foreign key to companies table
    company_id = Column(PG_UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to Company
    company = relationship("Company", back_populates="projects")
    
    # Relationship to IFC Files
    ifc_files = relationship("IFCFile", back_populates="project")
    
    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', company_id={self.company_id})>"