"""
Abstract Storage Interface for IFC Files - AEC Axis

This module defines the abstract interface for IFC file storage operations,
following the Strategy pattern for pluggable storage backends.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Optional


class IFCStorageError(Exception):
    """Base exception for IFC storage operations."""
    pass


@dataclass
class UploadResult:
    """Result of a file upload operation."""
    storage_url: str
    object_key: str
    metadata: Dict[str, str]
    file_size: int


class IFCStorageInterface(ABC):
    """
    Abstract interface for IFC file storage operations.
    
    This interface defines the contract that all storage implementations
    must follow, enabling pluggable storage backends (S3, local, etc.).
    """
    
    @abstractmethod
    async def upload_file(self, content: bytes, key: str, metadata: Dict[str, str]) -> UploadResult:
        """
        Upload a file to the storage backend.
        
        Args:
            content: The file content as bytes
            key: The storage key/path for the file
            metadata: Additional metadata to store with the file
            
        Returns:
            UploadResult containing upload details
            
        Raises:
            IFCStorageError: If upload fails
        """
        pass
    
    @abstractmethod
    async def delete_file(self, key: str) -> bool:
        """
        Delete a file from the storage backend.
        
        Args:
            key: The storage key/path of the file to delete
            
        Returns:
            True if deletion was successful, False otherwise
            
        Raises:
            IFCStorageError: If deletion fails
        """
        pass
    
    @abstractmethod
    async def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for file access.
        
        Args:
            key: The storage key/path of the file
            expires_in: URL expiration time in seconds
            
        Returns:
            Presigned URL for file access
            
        Raises:
            IFCStorageError: If URL generation fails
        """
        pass