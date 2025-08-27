"""
RFQ API endpoints for AEC Axis.

This module contains endpoints for managing Request for Quotations (RFQs).
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models.user import User
from app.db.models.project import Project
from app.db.models.material import Material
from app.db.models.supplier import Supplier
from app.db.models.ifc_file import IFCFile
from app.db.models.rfq import RFQ, RFQItem
from app.db.models.quote import Quote, QuoteItem
from app.schemas.rfq import RFQCreate, RFQResponse
from app.schemas.quote import QuoteDashboardResponse, DashboardMaterial, DashboardQuoteItem, SupplierInfo, ProjectInfo
from app.dependencies import get_current_user
from app.services.rfq_service import generate_supplier_quote_link
from app.services import email_service

router = APIRouter(prefix="/rfqs", tags=["RFQs"])


@router.post("/", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
async def create_rfq(
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
    
    # Generate and send emails to suppliers
    email_data_list = []
    for supplier in suppliers:
        # Generate secure JWT token for this supplier
        quote_token = generate_supplier_quote_link(str(db_rfq.id), str(supplier.id))
        
        # Prepare email data
        email_data = {
            "supplier_email": supplier.email,
            "supplier_name": supplier.name,
            "quote_link": quote_token,
            "project_name": project.name
        }
        email_data_list.append(email_data)
    
    # Send emails (this will be mocked in tests)
    try:
        await email_service.send_rfq_emails_batch(email_data_list)
    except Exception as e:
        # Log error but don't fail the RFQ creation
        # The RFQ has already been created successfully
        print(f"Warning: Failed to send some RFQ emails: {e}")
    
    return db_rfq


@router.get("/{rfq_id}/dashboard", response_model=QuoteDashboardResponse)
async def get_quote_comparison_data(
    rfq_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get quote comparison data for dashboard.
    
    Args:
        rfq_id: RFQ UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dashboard data with materials and their quotes grouped for comparison
        
    Raises:
        HTTPException: 404 if RFQ not found or doesn't belong to user's company
    """
    # Verify RFQ belongs to user's company
    rfq = db.query(RFQ).join(Project).filter(
        RFQ.id == rfq_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RFQ not found"
        )
    
    # Get project information
    project = db.query(Project).filter(Project.id == rfq.project_id).first()
    
    # Get all materials for this RFQ with their quotes
    query = db.query(
        Material.id,
        Material.description,
        Material.quantity,
        Material.unit,
        RFQItem.id.label("rfq_item_id"),
        QuoteItem.price,
        QuoteItem.lead_time_days,
        Quote.submitted_at,
        Supplier.id.label("supplier_id"),
        Supplier.name.label("supplier_name"),
        Supplier.email.label("supplier_email"),
        Supplier.cnpj.label("supplier_cnpj")
    ).select_from(Material)\
     .join(RFQItem, RFQItem.material_id == Material.id)\
     .outerjoin(QuoteItem, QuoteItem.rfq_item_id == RFQItem.id)\
     .outerjoin(Quote, Quote.id == QuoteItem.quote_id)\
     .outerjoin(Supplier, Supplier.id == Quote.supplier_id)\
     .filter(RFQItem.rfq_id == rfq_id)\
     .order_by(Material.description, Supplier.name)
    
    results = query.all()
    
    # Group results by material
    materials_dict = {}
    for row in results:
        material_id = str(row.id)
        
        if material_id not in materials_dict:
            materials_dict[material_id] = {
                "id": row.id,
                "rfq_item_id": row.rfq_item_id,
                "description": row.description,
                "quantity": row.quantity,
                "unit": row.unit,
                "quotes": []
            }
        
        # Add quote if it exists (not null from outer join)
        if row.price is not None:
            quote_item = DashboardQuoteItem(
                price=row.price,
                lead_time_days=row.lead_time_days,
                submitted_at=row.submitted_at,
                supplier=SupplierInfo(
                    id=row.supplier_id,
                    name=row.supplier_name,
                    email=row.supplier_email,
                    cnpj=row.supplier_cnpj
                )
            )
            materials_dict[material_id]["quotes"].append(quote_item)
    
    # Convert to list of DashboardMaterial objects
    materials = [
        DashboardMaterial(**material_data)
        for material_data in materials_dict.values()
    ]
    
    return QuoteDashboardResponse(
        rfq_id=rfq_id,
        project=ProjectInfo(
            id=project.id,
            name=project.name,
            address=project.address
        ),
        materials=materials
    )