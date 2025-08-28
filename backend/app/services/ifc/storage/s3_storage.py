"""
S3 Storage Implementation for IFC Files - AEC Axis

This module implements the IFC storage interface using AWS S3 with async operations,
circuit breaker patterns, and exponential backoff retry logic.
"""

import aioboto3
import logging
from aiobreaker import CircuitBreaker
from botocore.exceptions import ClientError, NoCredentialsError
from tenacity import (
    retry, 
    stop_after_attempt, 
    wait_exponential, 
    retry_if_exception_type
)
from typing import Dict, Any, Optional

from .base import IFCStorageInterface, UploadResult, IFCStorageError
from ..config import IFCServiceConfig, RetryConfig, CircuitBreakerConfig


logger = logging.getLogger(__name__)


class S3IFCStorage(IFCStorageInterface):
    """
    S3-based implementation of IFC file storage with async operations.
    
    Features:
    - Async operations using aioboto3
    - Circuit breaker pattern for fault tolerance
    - Exponential backoff retry logic
    - Comprehensive error handling and logging
    """
    
    def __init__(
        self, 
        bucket_name: str, 
        region: str = "us-east-1",
        retry_config: Optional[RetryConfig] = None,
        circuit_breaker_config: Optional[CircuitBreakerConfig] = None
    ):
        """
        Initialize S3 storage with configuration.
        
        Args:
            bucket_name: Name of the S3 bucket
            region: AWS region
            retry_config: Retry configuration
            circuit_breaker_config: Circuit breaker configuration
        """
        self.bucket_name = bucket_name
        self.region = region
        self.retry_config = retry_config or RetryConfig()
        self.circuit_breaker_config = circuit_breaker_config or CircuitBreakerConfig()
        
        # CRITICAL: Circuit breaker with configurable failure threshold and reset timeout
        from datetime import timedelta
        self.circuit_breaker = CircuitBreaker(
            fail_max=self.circuit_breaker_config.failure_threshold,
            timeout_duration=timedelta(seconds=self.circuit_breaker_config.reset_timeout)
        )
        
        logger.info(f"Initialized S3IFCStorage for bucket: {bucket_name}, region: {region}")
    
    async def upload_file(self, content: bytes, key: str, metadata: Dict[str, str]) -> UploadResult:
        """
        Upload a file to S3 with circuit breaker and retry logic.
        
        Args:
            content: File content as bytes
            key: S3 object key
            metadata: File metadata
            
        Returns:
            UploadResult with upload details
            
        Raises:
            IFCStorageError: If upload fails after retries
        """
        logger.info(f"Uploading file to S3: bucket={self.bucket_name}, key={key}")
        
        try:
            # Use circuit breaker to prevent cascading failures
            return await self.circuit_breaker(self._perform_upload)(content, key, metadata)
        except Exception as e:
            logger.error(f"S3 upload failed for key {key}: {str(e)}")
            if "CircuitBreakerError" in str(type(e)):
                raise IFCStorageError(
                    f"S3 storage temporarily unavailable (circuit breaker open): {str(e)}"
                ) from e
            raise IFCStorageError(f"S3 upload failed: {str(e)}") from e
    
    async def _perform_upload(self, content: bytes, key: str, metadata: Dict[str, str]) -> UploadResult:
        """
        Perform the actual S3 upload operation.
        
        Args:
            content: File content as bytes
            key: S3 object key
            metadata: File metadata
            
        Returns:
            UploadResult with upload details
        """
        session = aioboto3.Session()
        
        # CRITICAL: Must use async context manager in aioboto3 v15+
        async with session.client('s3', region_name=self.region) as s3:
            try:
                # Upload with metadata and proper content type
                await s3.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=content,
                    ContentType='application/x-step',
                    Metadata=metadata,
                    ServerSideEncryption='AES256'  # Enable server-side encryption
                )
                
                logger.info(f"Successfully uploaded file: s3://{self.bucket_name}/{key}")
                
                return UploadResult(
                    storage_url=f"s3://{self.bucket_name}/{key}",
                    object_key=key,
                    metadata=metadata,
                    file_size=len(content)
                )
                
            except ClientError as e:
                # PATTERN: Convert AWS errors to domain-specific errors
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))
                
                logger.error(f"S3 ClientError - Code: {error_code}, Message: {error_message}")
                
                # Map specific AWS errors to more user-friendly messages
                if error_code == 'NoSuchBucket':
                    raise IFCStorageError(f"S3 bucket '{self.bucket_name}' does not exist") from e
                elif error_code == 'AccessDenied':
                    raise IFCStorageError("Access denied to S3 bucket. Check AWS credentials") from e
                elif error_code == 'InvalidBucketName':
                    raise IFCStorageError(f"Invalid S3 bucket name: '{self.bucket_name}'") from e
                else:
                    raise IFCStorageError(f"S3 upload failed: {error_code} - {error_message}") from e
                    
            except NoCredentialsError as e:
                logger.error("AWS credentials not found")
                raise IFCStorageError("AWS credentials not configured") from e
            except Exception as e:
                logger.error(f"Unexpected error during S3 upload: {str(e)}")
                raise IFCStorageError(f"Unexpected error during upload: {str(e)}") from e
    
    async def delete_file(self, key: str) -> bool:
        """
        Delete a file from S3.
        
        Args:
            key: S3 object key to delete
            
        Returns:
            True if deletion was successful
            
        Raises:
            IFCStorageError: If deletion fails
        """
        logger.info(f"Deleting file from S3: bucket={self.bucket_name}, key={key}")
        
        try:
            return await self.circuit_breaker(self._perform_delete)(key)
        except Exception as e:
            logger.error(f"S3 deletion failed for key {key}: {str(e)}")
            if "CircuitBreakerError" in str(type(e)):
                raise IFCStorageError(
                    f"S3 storage temporarily unavailable (circuit breaker open): {str(e)}"
                ) from e
            raise IFCStorageError(f"S3 deletion failed: {str(e)}") from e
    
    async def _perform_delete(self, key: str) -> bool:
        """
        Perform the actual S3 delete operation.
        
        Args:
            key: S3 object key to delete
            
        Returns:
            True if deletion was successful
        """
        session = aioboto3.Session()
        
        async with session.client('s3', region_name=self.region) as s3:
            try:
                await s3.delete_object(Bucket=self.bucket_name, Key=key)
                logger.info(f"Successfully deleted file: s3://{self.bucket_name}/{key}")
                return True
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))
                
                # Don't consider "NoSuchKey" as an error (file already deleted)
                if error_code == 'NoSuchKey':
                    logger.warning(f"File already deleted or does not exist: {key}")
                    return True
                
                logger.error(f"S3 delete ClientError - Code: {error_code}, Message: {error_message}")
                raise IFCStorageError(f"S3 deletion failed: {error_code} - {error_message}") from e
    
    async def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for S3 object access.
        
        Args:
            key: S3 object key
            expires_in: URL expiration time in seconds
            
        Returns:
            Presigned URL for file access
            
        Raises:
            IFCStorageError: If URL generation fails
        """
        logger.info(f"Generating presigned URL: bucket={self.bucket_name}, key={key}, expires_in={expires_in}")
        
        try:
            return await self.circuit_breaker(self._perform_presigned_url)(key, expires_in)
        except Exception as e:
            logger.error(f"Presigned URL generation failed for key {key}: {str(e)}")
            if "CircuitBreakerError" in str(type(e)):
                raise IFCStorageError(
                    f"S3 storage temporarily unavailable (circuit breaker open): {str(e)}"
                ) from e
            raise IFCStorageError(f"Presigned URL generation failed: {str(e)}") from e
    
    async def _perform_presigned_url(self, key: str, expires_in: int) -> str:
        """
        Perform the actual presigned URL generation.
        
        Args:
            key: S3 object key
            expires_in: URL expiration time in seconds
            
        Returns:
            Presigned URL
        """
        session = aioboto3.Session()
        
        async with session.client('s3', region_name=self.region) as s3:
            try:
                url = await s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket_name, 'Key': key},
                    ExpiresIn=expires_in
                )
                
                logger.info(f"Generated presigned URL for: s3://{self.bucket_name}/{key}")
                return url
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))
                
                logger.error(f"Presigned URL ClientError - Code: {error_code}, Message: {error_message}")
                raise IFCStorageError(f"Presigned URL generation failed: {error_code} - {error_message}") from e