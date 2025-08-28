"""
Local File Storage Implementation for IFC Files - AEC Axis

This module implements the IFC storage interface using local filesystem with async operations.
Primarily used for development and testing environments.
"""

import os
import aiofiles
import aiofiles.tempfile
import logging
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional
from urllib.parse import urljoin

from .base import IFCStorageInterface, UploadResult, IFCStorageError
from ..config import RetryConfig


logger = logging.getLogger(__name__)


class LocalIFCStorage(IFCStorageInterface):
    """
    Local filesystem-based implementation of IFC file storage with async operations.
    
    Features:
    - Async file operations using aiofiles
    - Automatic directory creation
    - File integrity verification
    - Cleanup mechanisms for temporary files
    - URL generation for local file access
    """
    
    def __init__(
        self, 
        storage_path: str = "./storage/ifc-files",
        base_url: str = "http://localhost:8000/storage"
    ):
        """
        Initialize local storage with configuration.
        
        Args:
            storage_path: Local directory path for file storage
            base_url: Base URL for generating file access URLs
        """
        self.storage_path = Path(storage_path).resolve()
        self.base_url = base_url.rstrip('/')
        
        # Ensure storage directory exists
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Initialized LocalIFCStorage: path={self.storage_path}, base_url={self.base_url}")
    
    def _get_file_path(self, key: str) -> Path:
        """
        Get the full local path for a given storage key.
        
        Args:
            key: Storage key
            
        Returns:
            Path object for the file
        """
        # Sanitize the key to prevent directory traversal attacks
        safe_key = key.replace('..', '').lstrip('/')
        return self.storage_path / safe_key
    
    def _get_file_url(self, key: str) -> str:
        """
        Get the URL for accessing a stored file.
        
        Args:
            key: Storage key
            
        Returns:
            URL for file access
        """
        # URL-safe key
        safe_key = key.replace('\\', '/').lstrip('/')
        return f"{self.base_url}/{safe_key}"
    
    async def upload_file(self, content: bytes, key: str, metadata: Dict[str, str]) -> UploadResult:
        """
        Upload a file to local storage.
        
        Args:
            content: File content as bytes
            key: Storage key/path
            metadata: File metadata
            
        Returns:
            UploadResult with upload details
            
        Raises:
            IFCStorageError: If upload fails
        """
        logger.info(f"Uploading file to local storage: key={key}")
        
        try:
            file_path = self._get_file_path(key)
            
            # Ensure parent directory exists
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file content asynchronously
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            # Verify file was written correctly
            if not file_path.exists():
                raise IFCStorageError(f"File was not created successfully: {key}")
            
            # Verify file size
            actual_size = file_path.stat().st_size
            expected_size = len(content)
            if actual_size != expected_size:
                raise IFCStorageError(
                    f"File size mismatch: expected {expected_size}, got {actual_size}"
                )
            
            # Write metadata to accompanying .meta file
            await self._write_metadata(file_path, metadata)
            
            storage_url = self._get_file_url(key)
            
            logger.info(f"Successfully uploaded file to local storage: {storage_url}")
            
            return UploadResult(
                storage_url=storage_url,
                object_key=key,
                metadata=metadata,
                file_size=len(content)
            )
            
        except OSError as e:
            logger.error(f"Local storage OSError for key {key}: {str(e)}")
            raise IFCStorageError(f"Local storage error: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error during local upload for key {key}: {str(e)}")
            raise IFCStorageError(f"Unexpected error during upload: {str(e)}") from e
    
    async def _write_metadata(self, file_path: Path, metadata: Dict[str, str]) -> None:
        """
        Write metadata to a .meta file alongside the actual file.
        
        Args:
            file_path: Path to the main file
            metadata: Metadata dictionary
        """
        try:
            meta_path = file_path.with_suffix(file_path.suffix + '.meta')
            
            # Create metadata content
            meta_content = []
            for key, value in metadata.items():
                meta_content.append(f"{key}={value}")
            
            async with aiofiles.open(meta_path, 'w') as f:
                await f.write('\n'.join(meta_content))
                
        except Exception as e:
            logger.warning(f"Failed to write metadata for {file_path}: {str(e)}")
            # Don't fail the upload if metadata writing fails
    
    async def delete_file(self, key: str) -> bool:
        """
        Delete a file from local storage.
        
        Args:
            key: Storage key/path to delete
            
        Returns:
            True if deletion was successful
            
        Raises:
            IFCStorageError: If deletion fails
        """
        logger.info(f"Deleting file from local storage: key={key}")
        
        try:
            file_path = self._get_file_path(key)
            
            # Check if file exists
            if not file_path.exists():
                logger.warning(f"File does not exist (already deleted?): {key}")
                return True
            
            # Delete the main file
            file_path.unlink()
            
            # Delete metadata file if it exists
            meta_path = file_path.with_suffix(file_path.suffix + '.meta')
            if meta_path.exists():
                meta_path.unlink()
            
            logger.info(f"Successfully deleted file from local storage: {key}")
            return True
            
        except OSError as e:
            logger.error(f"Local storage deletion OSError for key {key}: {str(e)}")
            raise IFCStorageError(f"Local storage deletion error: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error during local deletion for key {key}: {str(e)}")
            raise IFCStorageError(f"Unexpected error during deletion: {str(e)}") from e
    
    async def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generate a URL for local file access.
        
        Note: In local storage, we don't implement expiration,
        but return a direct URL for compatibility.
        
        Args:
            key: Storage key
            expires_in: Ignored for local storage
            
        Returns:
            URL for file access
            
        Raises:
            IFCStorageError: If file doesn't exist
        """
        logger.info(f"Generating URL for local file: key={key}")
        
        try:
            file_path = self._get_file_path(key)
            
            # Check if file exists
            if not file_path.exists():
                raise IFCStorageError(f"File does not exist: {key}")
            
            url = self._get_file_url(key)
            logger.info(f"Generated URL for local file: {url}")
            return url
            
        except IFCStorageError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error generating URL for key {key}: {str(e)}")
            raise IFCStorageError(f"Error generating URL: {str(e)}") from e
    
    async def get_file_content(self, key: str) -> bytes:
        """
        Additional method for local storage to directly read file content.
        This is useful for testing and local development.
        
        Args:
            key: Storage key
            
        Returns:
            File content as bytes
            
        Raises:
            IFCStorageError: If file cannot be read
        """
        logger.info(f"Reading file content from local storage: key={key}")
        
        try:
            file_path = self._get_file_path(key)
            
            if not file_path.exists():
                raise IFCStorageError(f"File does not exist: {key}")
            
            async with aiofiles.open(file_path, 'rb') as f:
                content = await f.read()
            
            logger.info(f"Successfully read file content: {key} ({len(content)} bytes)")
            return content
            
        except OSError as e:
            logger.error(f"Local storage read OSError for key {key}: {str(e)}")
            raise IFCStorageError(f"Local storage read error: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error reading file for key {key}: {str(e)}")
            raise IFCStorageError(f"Unexpected error reading file: {str(e)}") from e
    
    async def get_metadata(self, key: str) -> Dict[str, str]:
        """
        Additional method to read metadata for a stored file.
        
        Args:
            key: Storage key
            
        Returns:
            Metadata dictionary
            
        Raises:
            IFCStorageError: If metadata cannot be read
        """
        try:
            file_path = self._get_file_path(key)
            meta_path = file_path.with_suffix(file_path.suffix + '.meta')
            
            if not meta_path.exists():
                logger.warning(f"Metadata file does not exist for: {key}")
                return {}
            
            metadata = {}
            async with aiofiles.open(meta_path, 'r') as f:
                content = await f.read()
                for line in content.strip().split('\n'):
                    if '=' in line:
                        k, v = line.split('=', 1)
                        metadata[k] = v
            
            return metadata
            
        except Exception as e:
            logger.warning(f"Failed to read metadata for {key}: {str(e)}")
            return {}