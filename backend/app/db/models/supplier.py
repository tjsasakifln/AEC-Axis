"""
Supplier model for AEC Axis.

This model represents the suppliers table for managing construction suppliers.
Suppliers are companies that provide materials and services to construction projects.
"""
import uuid
from sqlalchemy import Column, String, DateTime, func, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Supplier(Base):
    """
    Supplier model representing construction suppliers.
    
    This table stores data of suppliers that can provide materials and services
    to construction projects. Each supplier is associated with a company.
    """
    __tablename__ = "suppliers"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False, index=True)
    cnpj = Column(String(18), nullable=False, index=True)
    email = Column(String, nullable=False)
    
    # Foreign key to company
    company_id = Column(PG_UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Unique constraint to prevent duplicate CNPJs within the same company
    __table_args__ = (
        UniqueConstraint('company_id', 'cnpj', name='uq_supplier_company_cnpj'),
    )
    
    # Relationships
    company = relationship("Company", back_populates="suppliers")
    quotes = relationship("Quote", back_populates="supplier", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Supplier(id={self.id}, name='{self.name}', cnpj='{self.cnpj}')>"