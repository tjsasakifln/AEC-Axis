"""
IFC File service for AEC Axis.

This module contains business logic for IFC file processing and management.
"""
import os
import uuid
from pathlib import Path

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
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}.ifc"
    
    # Define upload path
    upload_dir = Path("backend/uploads")
    upload_dir.mkdir(exist_ok=True)
    file_path = upload_dir / unique_filename
    
    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )
    
    # Create IFC file record in database
    db_ifc_file = IFCFile(
        original_filename=file.filename,
        status="PENDING",
        project_id=project.id,
        file_path=str(file_path)
    )
    
    # Add to database
    db.add(db_ifc_file)
    db.commit()
    db.refresh(db_ifc_file)
    
    return db_ifc_file