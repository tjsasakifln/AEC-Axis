"""
Configuration Module for IFC Service - AEC Axis

This module contains shared configuration classes and utilities for the IFC service.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import os


@dataclass
class RetryConfig:
    """Configuration for retry logic with exponential backoff."""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: int = 2
    jitter: bool = True


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker pattern."""
    failure_threshold: int = 5
    reset_timeout: int = 60
    expected_exception: type = Exception


@dataclass
class IFCServiceConfig:
    """Main configuration for IFC service."""
    # AWS Configuration
    aws_s3_bucket_name: str
    aws_sqs_queue_url: str
    aws_region: str = "us-east-1"
    
    # Storage Configuration
    storage_backend: str = "s3"  # "s3" or "local"
    local_storage_path: str = "./storage/ifc-files"
    
    # Processing Configuration
    processor_backend: str = "ifcopenshell"  # "ifcopenshell" or "mock"
    processing_timeout_seconds: int = 300
    max_file_size_mb: int = 500
    
    # Notification Configuration
    notification_backend: str = "sqs"  # "sqs" or "webhook"
    
    # Performance Configuration
    max_concurrent_uploads: int = 10
    chunk_size_bytes: int = 8192
    
    # Retry and Circuit Breaker Configuration
    retry_config: RetryConfig = None
    circuit_breaker_config: CircuitBreakerConfig = None
    
    def __post_init__(self):
        """Initialize default configurations if not provided."""
        if self.retry_config is None:
            self.retry_config = RetryConfig()
        if self.circuit_breaker_config is None:
            self.circuit_breaker_config = CircuitBreakerConfig()


def get_config_from_environment() -> IFCServiceConfig:
    """
    Create IFCServiceConfig from environment variables.
    
    Returns:
        IFCServiceConfig with values from environment or defaults
    """
    return IFCServiceConfig(
        aws_s3_bucket_name=os.getenv('AWS_S3_BUCKET_NAME', 'aec-axis-ifc-files'),
        aws_sqs_queue_url=os.getenv(
            'AWS_SQS_QUEUE_URL', 
            'https://sqs.us-east-1.amazonaws.com/123456789012/aec-axis-ifc-processing'
        ),
        aws_region=os.getenv('AWS_DEFAULT_REGION', 'us-east-1'),
        storage_backend=os.getenv('IFC_STORAGE_BACKEND', 's3'),
        local_storage_path=os.getenv('IFC_LOCAL_STORAGE_PATH', './storage/ifc-files'),
        processor_backend=os.getenv('IFC_PROCESSOR_BACKEND', 'ifcopenshell'),
        processing_timeout_seconds=int(os.getenv('IFC_PROCESSING_TIMEOUT_SECONDS', '300')),
        max_file_size_mb=int(os.getenv('IFC_MAX_FILE_SIZE_MB', '500')),
        notification_backend=os.getenv('IFC_NOTIFICATION_BACKEND', 'sqs'),
        max_concurrent_uploads=int(os.getenv('IFC_MAX_CONCURRENT_UPLOADS', '10')),
        chunk_size_bytes=int(os.getenv('IFC_CHUNK_SIZE_BYTES', '8192')),
    )