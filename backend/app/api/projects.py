"""
Projects API endpoints for AEC Axis.

This module contains endpoints for managing construction projects.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.db.models.project import Project
from backend.app.db.models.user import User
from backend.app.schemas.project import ProjectCreate, ProjectResponse
from backend.app.dependencies import get_current_user

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