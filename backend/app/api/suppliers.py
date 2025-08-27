"""
Suppliers API endpoints for AEC Axis.

This module contains endpoints for managing construction suppliers.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db import get_db
from app.db.models.supplier import Supplier
from app.db.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier_data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new supplier for the authenticated user's company.
    
    Args:
        supplier_data: Supplier creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created supplier data
        
    Raises:
        HTTPException: 400 if CNPJ already exists for this company
    """
    # Create new supplier instance
    db_supplier = Supplier(
        name=supplier_data.name,
        cnpj=supplier_data.cnpj,
        email=supplier_data.email,
        company_id=current_user.company_id
    )
    
    try:
        # Add to database
        db.add(db_supplier)
        db.commit()
        db.refresh(db_supplier)
        
        return db_supplier
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CNPJ already exists for this company"
        )


@router.get("/", response_model=List[SupplierResponse])
def get_suppliers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[SupplierResponse]:
    """
    Get all suppliers for the authenticated user's company.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of suppliers belonging to the user's company
    """
    suppliers = db.query(Supplier).filter(
        Supplier.company_id == current_user.company_id
    ).all()
    
    return suppliers


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier_by_id(
    supplier_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SupplierResponse:
    """
    Get a specific supplier by ID.
    
    Args:
        supplier_id: UUID of the supplier to retrieve
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Supplier data
        
    Raises:
        HTTPException: 404 if supplier not found or doesn't belong to user's company
    """
    try:
        supplier_uuid = uuid.UUID(supplier_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_uuid,
        Supplier.company_id == current_user.company_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: str,
    supplier_data: SupplierUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SupplierResponse:
    """
    Update a specific supplier by ID.
    
    Args:
        supplier_id: UUID of the supplier to update
        supplier_data: Supplier update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated supplier data
        
    Raises:
        HTTPException: 404 if supplier not found or doesn't belong to user's company
    """
    try:
        supplier_uuid = uuid.UUID(supplier_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_uuid,
        Supplier.company_id == current_user.company_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Update fields that are provided in the request
    update_data = supplier_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    
    try:
        db.commit()
        db.refresh(supplier)
        return supplier
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CNPJ already exists for this company"
        )


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific supplier by ID.
    
    Args:
        supplier_id: UUID of the supplier to delete
        current_user: Current authenticated user
        db: Database session
        
    Raises:
        HTTPException: 404 if supplier not found or doesn't belong to user's company
    """
    try:
        supplier_uuid = uuid.UUID(supplier_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_uuid,
        Supplier.company_id == current_user.company_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    db.delete(supplier)
    db.commit()