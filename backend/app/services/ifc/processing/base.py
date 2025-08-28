"""
Abstract Processing Interface for IFC Files - AEC Axis

This module defines the abstract interface for IFC file processing operations,
following the Strategy pattern for pluggable processing implementations.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Any, Optional


class ProcessingStatus(Enum):
    """Status of IFC processing operation."""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING" 
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class IFCProcessingError(Exception):
    """Base exception for IFC processing operations."""
    pass


@dataclass  
class ProcessingResult:
    """Result of an IFC processing operation."""
    status: ProcessingStatus
    materials_count: int
    error_message: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    extracted_data: Optional[Dict[str, Any]] = None


class IFCProcessorInterface(ABC):
    """
    Abstract interface for IFC file processing operations.
    
    This interface defines the contract that all processing implementations
    must follow, enabling pluggable processing backends (IfcOpenShell, mock, etc.).
    """
    
    @abstractmethod
    async def process_file(self, storage_url: str, file_metadata: Dict[str, str]) -> ProcessingResult:
        """
        Process an IFC file and extract material quantities.
        
        Args:
            storage_url: URL or path to the IFC file in storage
            file_metadata: Additional metadata about the file
            
        Returns:
            ProcessingResult containing extracted data and status
            
        Raises:
            IFCProcessingError: If processing fails
        """
        pass
    
    @abstractmethod
    async def validate_file(self, storage_url: str) -> bool:
        """
        Validate that a file is a valid IFC file.
        
        Args:
            storage_url: URL or path to the IFC file in storage
            
        Returns:
            True if file is valid IFC, False otherwise
            
        Raises:
            IFCProcessingError: If validation fails due to storage issues
        """
        pass