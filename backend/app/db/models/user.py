"""
User model for AEC Axis.

This model represents the users table as specified in the PRD requirements.
Users are the individuals who use the AEC Axis platform and are associated with a company.
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class User(Base):
    """
    User model representing platform users.
    
    This table stores data of users who access the AEC Axis platform.
    Each user is associated with a company through company_id foreign key.
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Foreign key to companies table
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to Company
    company = relationship("Company", back_populates="users")
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', company_id={self.company_id})>"