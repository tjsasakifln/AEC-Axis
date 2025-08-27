"""
RFQ API endpoints for AEC Axis.

This module contains endpoints for managing Request for Quotations (RFQs).
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.db.models.user import User
from backend.app.db.models.project import Project
from backend.app.db.models.material import Material
from backend.app.db.models.supplier import Supplier
from backend.app.db.models.ifc_file import IFCFile
from backend.app.db.models.rfq import RFQ, RFQItem
from backend.app.schemas.rfq import RFQCreate, RFQResponse
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/rfqs", tags=["RFQs"])


@router.post("/", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
def create_rfq(
    rfq_data: RFQCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new RFQ for the authenticated user's company.
    
    Args:
        rfq_data: RFQ creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created RFQ data
        
    Raises:
        HTTPException: 404 if project, materials, or suppliers not found or don't belong to user's company
    """
    # Verify project belongs to user's company
    project = db.query(Project).filter(
        Project.id == rfq_data.project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify all materials belong to user's company (through project's IFC files)
    materials = db.query(Material).join(IFCFile).join(Project).filter(
        Material.id.in_(rfq_data.material_ids),
        Project.company_id == current_user.company_id
    ).all()
    
    if len(materials) != len(rfq_data.material_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more materials not found"
        )
    
    # Verify all suppliers belong to user's company
    suppliers = db.query(Supplier).filter(
        Supplier.id.in_(rfq_data.supplier_ids),
        Supplier.company_id == current_user.company_id
    ).all()
    
    if len(suppliers) != len(rfq_data.supplier_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more suppliers not found"
        )
    
    # Create new RFQ
    db_rfq = RFQ(
        project_id=rfq_data.project_id,
        status="OPEN"
    )
    
    db.add(db_rfq)
    db.commit()
    db.refresh(db_rfq)
    
    # Create RFQ items for each material
    rfq_items = []
    for material_id in rfq_data.material_ids:
        rfq_item = RFQItem(
            rfq_id=db_rfq.id,
            material_id=material_id
        )
        db.add(rfq_item)
        rfq_items.append(rfq_item)
    
    db.commit()
    
    # Refresh to get the created items with timestamps
    for item in rfq_items:
        db.refresh(item)
    
    db.refresh(db_rfq)
    
    return db_rfq