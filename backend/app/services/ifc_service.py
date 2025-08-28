"""
IFC File service for AEC Axis - Refactored Async Architecture.

This module contains the orchestrator service for IFC file processing and management
using dependency injection, async operations, and modular architecture.
"""
import asyncio
import logging
import os
import uuid
from io import BytesIO
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.db.models.project import Project
from app.db.models.ifc_file import IFCFile
from .ifc.factories import IFCServiceFactory
from .ifc.storage.base import IFCStorageInterface, IFCStorageError
from .ifc.processing.base import IFCProcessorInterface, IFCProcessingError
from .ifc.notification.base import NotificationInterface, IFCNotificationError

logger = logging.getLogger(__name__)


class IFCService:
    """
    Orchestrator service for IFC file processing with async DI architecture.
    
    This service coordinates between storage, processing, and notification components
    while maintaining backward compatibility with the existing API interface.
    """
    
    def __init__(
        self,
        storage: IFCStorageInterface,
        processor: IFCProcessorInterface,
        notifier: NotificationInterface
    ):
        """
        Initialize IFC service with injected dependencies.
        
        Args:
            storage: Storage interface implementation
            processor: Processor interface implementation  
            notifier: Notification interface implementation
        """
        self.storage = storage
        self.processor = processor
        self.notifier = notifier
        
        logger.info("Initialized IFCService with async DI architecture")
    
    async def process_ifc_upload_async(self, db: Session, project: Project, file: UploadFile) -> IFCFile:
        """
        Async implementation of IFC file upload processing.
        
        Args:
            db: Database session
            project: Project instance to upload file to
            file: The IFC file to process
            
        Returns:
            Created IFC file record
            
        Raises:
            HTTPException: 400 if file is not an IFC file
            HTTPException: 500 if storage upload or notification fails
        """
        # Validate file type (must be .ifc extension, case insensitive)
        if not file.filename or not file.filename.lower().endswith('.ifc'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only IFC files are allowed"
            )
        
        # Generate unique object key
        unique_id = str(uuid.uuid4())
        object_key = f"ifc-files/{unique_id}.ifc"
        
        logger.info(f"Processing IFC upload: {file.filename} -> {object_key}")
        
        try:
            # Read file content asynchronously
            file_content = await self._read_file_async(file)
            
            # Prepare metadata
            metadata = {
                'original_filename': file.filename,
                'project_id': str(project.id),
                'upload_timestamp': datetime.utcnow().isoformat()
            }
            
            # Async storage upload with circuit breaker and retry
            upload_result = await self.storage.upload_file(
                content=file_content,
                key=object_key,
                metadata=metadata
            )
            
            # Create database record
            db_ifc_file = IFCFile(
                original_filename=file.filename,
                status="PENDING", 
                project_id=project.id,
                file_path=object_key,
                file_size=upload_result.file_size
            )
            
            db.add(db_ifc_file)
            db.commit()
            db.refresh(db_ifc_file)
            
            # Async notification (replaces SQS synchronous call)
            try:
                await self.notifier.notify_processing_queued(
                    ifc_file_id=str(db_ifc_file.id),
                    storage_url=upload_result.storage_url,
                    metadata=upload_result.metadata
                )
            except IFCNotificationError as e:
                # Log notification failure but don't fail the upload
                logger.warning(f"Notification failed for {db_ifc_file.id}: {str(e)}")
            
            logger.info(f"Successfully processed IFC upload: {db_ifc_file.id}")
            return db_ifc_file
            
        except IFCStorageError as e:
            db.rollback()
            logger.error(f"Storage error for {file.filename}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Storage error: {str(e)}"
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error processing {file.filename}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal processing error"
            )
    
    async def _read_file_async(self, file: UploadFile) -> bytes:
        """
        Memory-efficient async file reading for large files.
        
        Args:
            file: UploadFile to read
            
        Returns:
            File content as bytes
        """
        content = BytesIO()
        file.file.seek(0)
        
        # Read in chunks to prevent memory issues
        while chunk := file.file.read(8192):  
            content.write(chunk)
        
        return content.getvalue()


# Singleton instance for dependency injection
_ifc_service: Optional[IFCService] = None


def get_ifc_service() -> IFCService:
    """
    Get or create the IFC service instance with dependency injection.
    
    Returns:
        IFCService instance configured for the current environment
    """
    global _ifc_service
    
    if _ifc_service is None:
        # Determine environment from environment variable
        environment = os.getenv('ENVIRONMENT', 'production')
        
        # Create service components using factory
        components = IFCServiceFactory.create_service_components(environment)
        
        _ifc_service = IFCService(
            storage=components['storage'],
            processor=components['processor'],
            notifier=components['notifier']
        )
        
        logger.info(f"Created IFC service for environment: {environment}")
    
    return _ifc_service


def process_ifc_upload(db: Session, project: Project, file: UploadFile) -> IFCFile:
    """
    BACKWARD COMPATIBILITY: Synchronous wrapper for async IFC upload processing.
    
    This function maintains the exact same signature as the original for 
    backward compatibility with existing API consumers.
    
    Args:
        db: Database session
        project: Project instance to upload file to
        file: The IFC file to process
        
    Returns:
        Created IFC file record
        
    Raises:
        HTTPException: 400 if file is not an IFC file
        HTTPException: 500 if processing fails
    """
    # Get the async IFC service
    ifc_service = get_ifc_service()
    
    # Run the async function in the event loop
    try:
        # Use asyncio.run to handle the async call in sync context
        return asyncio.run(ifc_service.process_ifc_upload_async(db, project, file))
    except Exception as e:
        logger.error(f"Error in sync wrapper for IFC upload: {str(e)}")
        # Re-raise the original exception to maintain error handling behavior
        raise


def reset_ifc_service():
    """
    Reset the singleton IFC service instance (useful for testing).
    """
    global _ifc_service
    _ifc_service = None
    IFCServiceFactory.reset_containers()