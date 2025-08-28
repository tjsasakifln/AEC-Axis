"""
Abstract Notification Interface for IFC Processing Events - AEC Axis

This module defines the abstract interface for notification operations,
following the Strategy pattern for pluggable notification backends.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from ..processing.base import ProcessingResult


class IFCNotificationError(Exception):
    """Base exception for IFC notification operations."""
    pass


class NotificationInterface(ABC):
    """
    Abstract interface for IFC processing notifications.
    
    This interface defines the contract that all notification implementations
    must follow, enabling pluggable notification backends (SQS, webhooks, email, etc.).
    """
    
    @abstractmethod
    async def notify_processing_queued(
        self, 
        ifc_file_id: str, 
        storage_url: str, 
        metadata: Dict[str, str]
    ) -> None:
        """
        Notify that an IFC file has been queued for processing.
        
        Args:
            ifc_file_id: Unique identifier of the IFC file
            storage_url: URL where the file is stored
            metadata: Additional metadata about the file
            
        Raises:
            IFCNotificationError: If notification fails
        """
        pass
    
    @abstractmethod
    async def notify_processing_complete(
        self, 
        ifc_file_id: str, 
        result: ProcessingResult
    ) -> None:
        """
        Notify that IFC processing has completed.
        
        Args:
            ifc_file_id: Unique identifier of the IFC file
            result: The processing result containing status and data
            
        Raises:
            IFCNotificationError: If notification fails
        """
        pass
    
    @abstractmethod
    async def notify_error(
        self, 
        ifc_file_id: str, 
        error_message: str, 
        error_context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Notify that an error occurred during IFC processing.
        
        Args:
            ifc_file_id: Unique identifier of the IFC file
            error_message: Description of the error
            error_context: Additional context about the error
            
        Raises:
            IFCNotificationError: If notification fails
        """
        pass