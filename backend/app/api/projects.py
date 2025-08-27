"""
Projects API endpoints for AEC Axis.

This module contains endpoints for managing construction projects.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models.project import Project
from app.db.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new project for the authenticated user's company.
    
    Args:
        project_data: Project creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created project data
    """
    # Create new project instance
    db_project = Project(
        name=project_data.name,
        address=project_data.address,
        start_date=project_data.start_date,
        company_id=current_user.company_id
    )
    
    # Add to database
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project


@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[ProjectResponse]:
    """
    Get all projects for the authenticated user's company.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of projects belonging to the user's company
    """
    projects = db.query(Project).filter(
        Project.company_id == current_user.company_id
    ).all()
    
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_by_id(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProjectResponse:
    """
    Get a specific project by ID.
    
    Args:
        project_id: UUID of the project to retrieve
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Project data
        
    Raises:
        HTTPException: 404 if project not found or doesn't belong to user's company
    """
    try:
        project_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project = db.query(Project).filter(
        Project.id == project_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProjectResponse:
    """
    Update a specific project by ID.
    
    Args:
        project_id: UUID of the project to update
        project_data: Project update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated project data
        
    Raises:
        HTTPException: 404 if project not found or doesn't belong to user's company
    """
    try:
        project_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project = db.query(Project).filter(
        Project.id == project_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update project fields with provided data
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific project by ID.
    
    Args:
        project_id: UUID of the project to delete
        current_user: Current authenticated user
        db: Database session
        
    Raises:
        HTTPException: 404 if project not found or doesn't belong to user's company
    """
    try:
        project_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project = db.query(Project).filter(
        Project.id == project_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()