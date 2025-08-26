"""
Companies API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.app.db import get_db
from backend.app.db.models import Company
from backend.app.schemas.company import CompanyCreate, CompanyResponse

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("/", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    company_data: CompanyCreate,
    db: Session = Depends(get_db)
) -> CompanyResponse:
    """
    Create a new company.
    
    Args:
        company_data: Company creation data
        db: Database session
        
    Returns:
        Created company data
        
    Raises:
        HTTPException: 400 if CNPJ already exists
    """
    try:
        # Create new company instance
        db_company = Company(
            name=company_data.name,
            cnpj=company_data.cnpj,
            email=company_data.email,
            address=company_data.address,
            phone=company_data.phone
        )
        
        # Add to database
        db.add(db_company)
        db.commit()
        db.refresh(db_company)
        
        return db_company
        
    except IntegrityError as e:
        db.rollback()
        # Check if it's a CNPJ uniqueness violation
        if "cnpj" in str(e.orig).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CNPJ already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database integrity error"
        )