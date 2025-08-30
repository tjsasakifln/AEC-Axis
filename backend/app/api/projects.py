"""
Projects API endpoints for AEC Axis.

This module contains endpoints for managing construction projects.
"""
import uuid
import logging
import asyncio
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db import get_db
from app.db.models.project import Project
from app.db.models.user import User
from app.db.models.rfq import RFQ
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.schemas.rfq import RFQResponse
from app.dependencies import get_current_user
from app.services.cache_service import get_cache_service, CacheKeyBuilder, CacheServiceInterface

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache: CacheServiceInterface = Depends(get_cache_service)
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
    
    # Cache operations disabled in sync endpoints for compatibility
    pattern = CacheKeyBuilder.projects_pattern(str(current_user.company_id))
    logger.debug(f"Cache invalidation disabled for sync endpoint: {pattern}")
    
    return db_project


@router.get("/", response_model=Dict[str, Any])
def get_projects(
    search: Optional[str] = Query(None, description="Search term for project name or address"),
    status: Optional[str] = Query(None, description="Filter by RFQ status (OPEN, CLOSED, etc.)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Number of items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache: CacheServiceInterface = Depends(get_cache_service)
) -> Dict[str, Any]:
    """
    Get all projects for the authenticated user's company with search, filtering, and pagination.
    
    Args:
        search: Optional search term for project name or address
        status: Optional filter by RFQ status
        page: Page number (1-based)
        limit: Number of items per page
        current_user: Current authenticated user
        db: Database session
        cache: Cache service instance
        
    Returns:
        Dictionary containing projects list, total count, and pagination info
    """
    # Build cache key
    cache_key = CacheKeyBuilder.projects_list(
        company_id=str(current_user.company_id),
        page=page,
        search=search,
        status=status
    )
    
    # Cache operations disabled in sync endpoints for compatibility
    # TODO: Implement proper async cache handling
    logger.debug(f"Cache disabled for sync endpoint: {cache_key}")
    
    # Base query filtered by company
    query = db.query(Project).filter(
        Project.company_id == current_user.company_id
    )
    
    # Apply search filter
    if search:
        search_filter = or_(
            Project.name.ilike(f"%{search}%"),
            Project.address.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Apply status filter (filter projects that have RFQs with specific status)
    if status:
        query = query.join(RFQ).filter(RFQ.status == status.upper())
    
    # Get total count before pagination
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    projects = query.offset(offset).limit(limit).all()
    
    # Calculate pagination info
    total_pages = (total_count + limit - 1) // limit
    
    result = {
        "projects": [ProjectResponse.model_validate(project) for project in projects],
        "total_count": total_count,
        "total_pages": total_pages,
        "current_page": page,
        "limit": limit,
        "has_next": page < total_pages,
        "has_previous": page > 1
    }
    
    # Cache operations disabled in sync endpoints for compatibility
    logger.debug(f"Cache disabled for sync endpoint: {cache_key}")
    
    return result


@router.get("/summary", response_model=Dict[str, int])
def get_projects_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, int]:
    """
    Get summary statistics for projects belonging to the authenticated user's company.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dictionary containing KPI metrics for the company's projects
    """
    company_id = current_user.company_id
    
    # Total projects
    total_projects = db.query(Project).filter(
        Project.company_id == company_id
    ).count()
    
    # Active RFQs (RFQs with OPEN status)
    active_rfqs = db.query(RFQ).join(Project).filter(
        Project.company_id == company_id,
        RFQ.status == "OPEN"
    ).count()
    
    # Projects with completed RFQs (projects that have at least one CLOSED RFQ)
    completed_projects = db.query(Project).join(RFQ).filter(
        Project.company_id == company_id,
        RFQ.status == "CLOSED"
    ).distinct().count()
    
    return {
        "total_projects": total_projects,
        "active_rfqs": active_rfqs,
        "completed_projects": completed_projects
    }


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_by_id(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache: CacheServiceInterface = Depends(get_cache_service)
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
    
    # Cache operations disabled in sync endpoints for compatibility
    cache_key = CacheKeyBuilder.project_detail(project_id)
    logger.debug(f"Cache disabled for sync endpoint: {cache_key}")
    
    project = db.query(Project).filter(
        Project.id == project_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Cache operations disabled in sync endpoints for compatibility
    project_response = ProjectResponse.model_validate(project)
    logger.debug(f"Cache disabled for sync endpoint: {cache_key}")
    
    return project_response


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache: CacheServiceInterface = Depends(get_cache_service)
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
    
    # Invalidate caches for this project and company
    company_pattern = CacheKeyBuilder.projects_pattern(str(current_user.company_id))
    project_detail_key = CacheKeyBuilder.project_detail(project_id)
    
    # Cache operations disabled for compatibility
    logger.debug(f"Cache invalidation disabled for sync endpoints: {company_pattern}, {project_detail_key}")
    
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache: CacheServiceInterface = Depends(get_cache_service)
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
    
    # Invalidate caches for this project and company
    company_pattern = CacheKeyBuilder.projects_pattern(str(current_user.company_id))
    project_detail_key = CacheKeyBuilder.project_detail(project_id)
    
    # Cache operations disabled for compatibility
    logger.debug(f"Cache invalidation disabled for sync endpoints: {company_pattern}, {project_detail_key}")


@router.get("/{project_id}/rfqs", response_model=List[RFQResponse])
def get_project_rfqs(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[RFQResponse]:
    """
    Get all RFQs for a specific project.
    
    Args:
        project_id: UUID of the project
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of RFQs for the project
        
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
    
    # Verify project belongs to user's company
    project = db.query(Project).filter(
        Project.id == project_uuid,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get all RFQs for this project
    rfqs = db.query(RFQ).filter(
        RFQ.project_id == project_uuid
    ).all()
    
    return rfqs