"""
Materials API endpoints for AEC Axis.

This module contains endpoints for managing materials extracted from IFC files.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models.material import Material
from app.db.models.ifc_file import IFCFile
from app.db.models.project import Project
from app.db.models.user import User
from app.schemas.material import MaterialUpdate, MaterialResponse
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/ifc-files/{ifc_file_id}/materials", response_model=List[MaterialResponse])
def get_materials_for_ifc_file(
    ifc_file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[MaterialResponse]:
    """
    Get all materials associated with an IFC file.
    
    Args:
        ifc_file_id: UUID of the IFC file
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of materials for the IFC file
        
    Raises:
        HTTPException: 404 if IFC file not found or doesn't belong to user's company
    """
    try:
        file_uuid = uuid.UUID(ifc_file_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IFC file not found"
        )
    
    # Verify that the IFC file belongs to a project of the user's company
    ifc_file = db.query(IFCFile).join(Project).filter(
        IFCFile.id == file_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not ifc_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IFC file not found"
        )
    
    # Get materials for this IFC file
    materials = db.query(Material).filter(
        Material.ifc_file_id == file_uuid
    ).all()
    
    return materials


@router.put("/materials/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: str,
    material_data: MaterialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> MaterialResponse:
    """
    Update a specific material by ID.
    
    Args:
        material_id: UUID of the material to update
        material_data: Material update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated material data
        
    Raises:
        HTTPException: 404 if material not found or doesn't belong to user's company
    """
    try:
        mat_uuid = uuid.UUID(material_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Verify that the material belongs to an IFC file of a project in the user's company
    material = db.query(Material).join(IFCFile).join(Project).filter(
        Material.id == mat_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Update material fields with provided data
    update_data = material_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(material, field, value)
    
    db.commit()
    db.refresh(material)
    
    return material


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific material by ID.
    
    Args:
        material_id: UUID of the material to delete
        current_user: Current authenticated user
        db: Database session
        
    Raises:
        HTTPException: 404 if material not found or doesn't belong to user's company
    """
    try:
        mat_uuid = uuid.UUID(material_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Verify that the material belongs to an IFC file of a project in the user's company
    material = db.query(Material).join(IFCFile).join(Project).filter(
        Material.id == mat_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    db.delete(material)
    db.commit()