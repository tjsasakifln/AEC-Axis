"""
IFC Files API endpoints for AEC Axis.

This module contains endpoints for managing IFC file uploads and processing.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.db.models.project import Project
from backend.app.db.models.user import User
from backend.app.schemas.ifc_file import IFCFileResponse
from backend.app.dependencies import get_current_user
from backend.app.services.ifc_service import process_ifc_upload

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