"""
IFC Files API endpoints for AEC Axis.

This module contains endpoints for managing IFC file uploads and processing.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models.project import Project
from app.db.models.ifc_file import IFCFile
from app.db.models.user import User
from app.schemas.ifc_file import IFCFileResponse
from app.dependencies import get_current_user
from app.services.ifc_service import process_ifc_upload

router = APIRouter(tags=["IFC Files"])


@router.post("/projects/{project_id}/ifc-files", response_model=IFCFileResponse, status_code=status.HTTP_202_ACCEPTED)
def upload_ifc_file(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> IFCFileResponse:
    """
    Upload an IFC file to a project.
    
    Args:
        project_id: UUID of the project to upload the file to
        file: The IFC file to upload
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created IFC file record with processing status
        
    Raises:
        HTTPException: 400 if file is not an IFC file
        HTTPException: 404 if project not found or doesn't belong to user's company
    """
    # Validate project ID format
    try:
        project_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify project exists and belongs to user's company
    project = db.query(Project).filter(
        Project.id == project_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Delegate file processing to service layer
    return process_ifc_upload(db=db, project=project, file=file)


@router.get("/projects/{project_id}/ifc-files", response_model=List[IFCFileResponse])
def get_ifc_files_for_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[IFCFileResponse]:
    """
    Get all IFC files for a specific project.
    
    Args:
        project_id: UUID of the project to get files for
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of IFC files associated with the project
        
    Raises:
        HTTPException: 404 if project not found or doesn't belong to user's company
    """
    # Validate project ID format
    try:
        project_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify project exists and belongs to user's company
    project = db.query(Project).filter(
        Project.id == project_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get all IFC files for this project
    ifc_files = db.query(IFCFile).filter(
        IFCFile.project_id == project_uuid
    ).order_by(IFCFile.created_at.desc()).all()
    
    return ifc_files