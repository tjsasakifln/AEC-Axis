"""
IFC File service for AEC Axis.

This module contains business logic for IFC file processing and management.
"""
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from backend.app.db.models.project import Project
from backend.app.db.models.ifc_file import IFCFile


def process_ifc_upload(db: Session, project: Project, file: UploadFile) -> IFCFile:
    """
    Process IFC file upload and create database record.
    
    Args:
        db: Database session
        project: Project instance to upload file to
        file: The IFC file to process
        
    Returns:
        Created IFC file record
        
    Raises:
        HTTPException: 400 if file is not an IFC file
    """
    # Validate file type (must be .ifc extension, case insensitive)
    if not file.filename or not file.filename.lower().endswith('.ifc'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only IFC files are allowed"
        )
    
    # Create IFC file record in database
    db_ifc_file = IFCFile(
        original_filename=file.filename,
        status="PENDING",
        project_id=project.id,
        file_path=None  # Will be set after file is saved to storage
    )
    
    # Add to database
    db.add(db_ifc_file)
    db.commit()
    db.refresh(db_ifc_file)
    
    return db_ifc_file