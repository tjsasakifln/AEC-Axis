"""
Company model for AEC Axis.

This model represents the companies table as specified in the PRD requirements.
Companies are the client organizations that use the AEC Axis platform.
"""
import uuid
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class Company(Base):
    """
    Company model representing client organizations.
    
    This table stores data of client companies that use the AEC Axis platform.
    Each company can have multiple users and projects associated with it.
    """
    __tablename__ = "companies"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False, index=True)
    cnpj = Column(String(18), unique=True, nullable=False, index=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="company")
    projects = relationship("Project", back_populates="company") 
    suppliers = relationship("Supplier", back_populates="company")
    
    def __repr__(self) -> str:
        return f"<Company(id={self.id}, name='{self.name}', cnpj='{self.cnpj}')>"