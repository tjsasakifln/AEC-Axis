"""
Quote models for AEC Axis.

This module contains models for managing supplier quotations (quotes) and their items.
Quotes are submitted by suppliers in response to RFQs (Request for Quotations).
"""
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Quote(Base):
    """
    Quote model representing supplier quotations for RFQ requests.
    
    This table stores quotations submitted by suppliers in response to RFQs.
    Each quote belongs to a specific RFQ and supplier, and includes metadata
    for tracking submission and access control.
    """
    __tablename__ = "quotes"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys
    rfq_id = Column(PG_UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False, index=True)
    supplier_id = Column(PG_UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False, index=True)
    
    # Access control - stores JWT ID (jti) to ensure one-time use
    access_token_jti = Column(String, nullable=False, unique=True, index=True)
    
    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    rfq = relationship("RFQ", back_populates="quotes")
    supplier = relationship("Supplier", back_populates="quotes")
    quote_items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Quote(id={self.id}, rfq_id={self.rfq_id}, supplier_id={self.supplier_id})>"


class QuoteItem(Base):
    """
    Quote Item model representing individual material quotes within a quotation.
    
    This table stores the specific pricing and lead time information for each
    material requested in an RFQ, as quoted by the supplier.
    """
    __tablename__ = "quote_items"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys
    quote_id = Column(PG_UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=False, index=True)
    rfq_item_id = Column(PG_UUID(as_uuid=True), ForeignKey("rfq_items.id"), nullable=False, index=True)
    
    # Quote data
    price = Column(Numeric(precision=12, scale=2), nullable=False)
    lead_time_days = Column(Integer, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    quote = relationship("Quote", back_populates="quote_items")
    rfq_item = relationship("RFQItem", back_populates="quote_items")
    
    def __repr__(self) -> str:
        return f"<QuoteItem(id={self.id}, quote_id={self.quote_id}, price={self.price})>"