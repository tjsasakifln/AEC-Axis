"""
SQS Notification Implementation for IFC Processing Events - AEC Axis

This module implements the notification interface using AWS SQS with async operations,
message queuing, error handling, retry logic, and dead letter queue patterns.
"""

import json
import logging
import aioboto3
from aiobreaker import CircuitBreaker
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
from typing import Dict, Any, Optional, List

from .base import NotificationInterface, IFCNotificationError
from ..processing.base import ProcessingResult
from ..config import RetryConfig, CircuitBreakerConfig


logger = logging.getLogger(__name__)


class SQSNotifier(NotificationInterface):
    """
    SQS-based implementation of IFC processing notifications with async operations.
    
    Features:
    - Async SQS operations using aioboto3
    - Circuit breaker for fault tolerance
    - Retry logic with exponential backoff
    - Dead letter queue (DLQ) patterns for failed messages
    - Batch message sending for efficiency
    - Message attributes and receipt confirmation for reliability
    """
    
    def __init__(
        self,
        queue_url: str,
        region: str = "us-east-1",
        dead_letter_queue_url: Optional[str] = None,
        retry_config: Optional[RetryConfig] = None,
        circuit_breaker_config: Optional[CircuitBreakerConfig] = None
    ):
        """
        Initialize SQS notifier with configuration.
        
        Args:
            queue_url: SQS queue URL for notifications
            region: AWS region
            dead_letter_queue_url: Dead letter queue URL for failed messages
            retry_config: Retry configuration
            circuit_breaker_config: Circuit breaker configuration
        """
        self.queue_url = queue_url
        self.region = region
        self.dead_letter_queue_url = dead_letter_queue_url
        self.retry_config = retry_config or RetryConfig()
        self.circuit_breaker_config = circuit_breaker_config or CircuitBreakerConfig()
        
        # Circuit breaker for SQS operations
        from datetime import timedelta
        self.circuit_breaker = CircuitBreaker(
            fail_max=self.circuit_breaker_config.failure_threshold,
            timeout_duration=timedelta(seconds=self.circuit_breaker_config.reset_timeout)
        )
        
        logger.info(f"Initialized SQSNotifier: queue={queue_url}, region={region}")
    
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
        logger.info(f"Sending processing queued notification: ifc_file_id={ifc_file_id}")
        
        message_body = {
            "event_type": "ifc_processing_queued",
            "ifc_file_id": ifc_file_id,
            "storage_url": storage_url,
            "metadata": metadata,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        message_attributes = {
            "EventType": {
                "StringValue": "ifc_processing_queued",
                "DataType": "String"
            },
            "IFCFileId": {
                "StringValue": ifc_file_id,
                "DataType": "String"
            }
        }
        
        try:
            await self.circuit_breaker(self._send_message)(
                message_body=message_body,
                message_attributes=message_attributes,
                message_group_id=f"ifc-file-{ifc_file_id}"  # For FIFO queues if needed
            )
            
            logger.info(f"Successfully sent processing queued notification: {ifc_file_id}")
            
        except Exception as e:
            logger.error(f"Failed to send processing queued notification for {ifc_file_id}: {str(e)}")
            
            if "CircuitBreakerError" in str(type(e)):
                raise IFCNotificationError(
                    f"SQS notification temporarily unavailable (circuit breaker open): {str(e)}"
                ) from e
            
            raise IFCNotificationError(f"SQS notification failed: {str(e)}") from e
    
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
        logger.info(f"Sending processing complete notification: ifc_file_id={ifc_file_id}, status={result.status.value}")
        
        message_body = {
            "event_type": "ifc_processing_complete",
            "ifc_file_id": ifc_file_id,
            "result": {
                "status": result.status.value,
                "materials_count": result.materials_count,
                "error_message": result.error_message,
                "processing_time_seconds": result.processing_time_seconds,
                "has_extracted_data": result.extracted_data is not None
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Include extracted data if available (but limit size for SQS)
        if result.extracted_data and result.status.value == "COMPLETED":
            # Truncate large data to avoid SQS message size limits (256KB)
            extracted_data = result.extracted_data.copy()
            if "materials" in extracted_data:
                materials = extracted_data["materials"]
                if len(materials) > 100:  # Limit materials for message size
                    extracted_data["materials"] = materials[:100]
                    extracted_data["materials_truncated"] = True
                    extracted_data["total_materials_count"] = len(materials)
            
            message_body["extracted_data"] = extracted_data
        
        message_attributes = {
            "EventType": {
                "StringValue": "ifc_processing_complete",
                "DataType": "String"
            },
            "IFCFileId": {
                "StringValue": ifc_file_id,
                "DataType": "String"
            },
            "ProcessingStatus": {
                "StringValue": result.status.value,
                "DataType": "String"
            }
        }
        
        try:
            await self.circuit_breaker(self._send_message)(
                message_body=message_body,
                message_attributes=message_attributes,
                message_group_id=f"ifc-file-{ifc_file_id}"
            )
            
            logger.info(f"Successfully sent processing complete notification: {ifc_file_id}")
            
        except Exception as e:
            logger.error(f"Failed to send processing complete notification for {ifc_file_id}: {str(e)}")
            
            if "CircuitBreakerError" in str(type(e)):
                raise IFCNotificationError(
                    f"SQS notification temporarily unavailable (circuit breaker open): {str(e)}"
                ) from e
            
            raise IFCNotificationError(f"SQS notification failed: {str(e)}") from e
    
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
        logger.info(f"Sending error notification: ifc_file_id={ifc_file_id}")
        
        message_body = {
            "event_type": "ifc_processing_error",
            "ifc_file_id": ifc_file_id,
            "error_message": error_message,
            "error_context": error_context or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        message_attributes = {
            "EventType": {
                "StringValue": "ifc_processing_error",
                "DataType": "String"
            },
            "IFCFileId": {
                "StringValue": ifc_file_id,
                "DataType": "String"
            }
        }
        
        try:
            await self.circuit_breaker(self._send_message)(
                message_body=message_body,
                message_attributes=message_attributes,
                message_group_id=f"ifc-file-{ifc_file_id}"
            )
            
            logger.info(f"Successfully sent error notification: {ifc_file_id}")
            
        except Exception as e:
            logger.error(f"Failed to send error notification for {ifc_file_id}: {str(e)}")
            
            if "CircuitBreakerError" in str(type(e)):
                raise IFCNotificationError(
                    f"SQS notification temporarily unavailable (circuit breaker open): {str(e)}"
                ) from e
            
            raise IFCNotificationError(f"SQS notification failed: {str(e)}") from e
    
    async def _send_message(
        self,
        message_body: Dict[str, Any],
        message_attributes: Dict[str, Any],
        message_group_id: Optional[str] = None
    ) -> None:
        """
        Send a message to SQS with proper error handling.
        
        Args:
            message_body: Message content
            message_attributes: Message attributes
            message_group_id: Message group ID for FIFO queues
        """
        session = aioboto3.Session()
        
        # CRITICAL: Must use async context manager in aioboto3 v15+
        async with session.client('sqs', region_name=self.region) as sqs:
            try:
                # Prepare message parameters
                params = {
                    'QueueUrl': self.queue_url,
                    'MessageBody': json.dumps(message_body, ensure_ascii=False),
                    'MessageAttributes': message_attributes
                }
                
                # Add message group ID for FIFO queues
                if message_group_id and self.queue_url.endswith('.fifo'):
                    params['MessageGroupId'] = message_group_id
                    # Use IFC file ID as deduplication ID to prevent duplicates
                    ifc_file_id = message_body.get('ifc_file_id')
                    if ifc_file_id:
                        params['MessageDeduplicationId'] = f"{ifc_file_id}-{message_body.get('event_type', 'unknown')}"
                
                # Send message
                response = await sqs.send_message(**params)
                
                # Log successful send with message ID
                message_id = response.get('MessageId')
                logger.debug(f"SQS message sent successfully: MessageId={message_id}")
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))
                
                logger.error(f"SQS ClientError - Code: {error_code}, Message: {error_message}")
                
                # Map specific AWS errors to more user-friendly messages
                if error_code == 'AWS.SimpleQueueService.NonExistentQueue':
                    raise IFCNotificationError(f"SQS queue does not exist: {self.queue_url}") from e
                elif error_code == 'AccessDenied':
                    raise IFCNotificationError("Access denied to SQS queue. Check AWS credentials") from e
                elif error_code == 'MessageTooLong':
                    raise IFCNotificationError("Message too large for SQS (max 256KB)") from e
                elif error_code == 'InvalidMessageContents':
                    raise IFCNotificationError("Invalid message content for SQS") from e
                else:
                    raise IFCNotificationError(f"SQS send failed: {error_code} - {error_message}") from e
                    
            except NoCredentialsError as e:
                logger.error("AWS credentials not found for SQS")
                raise IFCNotificationError("AWS credentials not configured for SQS") from e
                
            except Exception as e:
                logger.error(f"Unexpected error during SQS send: {str(e)}")
                raise IFCNotificationError(f"Unexpected error during SQS send: {str(e)}") from e
    
    async def send_batch_notifications(
        self,
        messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Send multiple notifications in a single batch for efficiency.
        
        Args:
            messages: List of message dictionaries
            
        Returns:
            Dictionary with batch send results
            
        Raises:
            IFCNotificationError: If batch send fails
        """
        if not messages:
            return {"successful": 0, "failed": 0}
        
        logger.info(f"Sending batch of {len(messages)} SQS notifications")
        
        session = aioboto3.Session()
        
        async with session.client('sqs', region_name=self.region) as sqs:
            try:
                # Prepare batch entries (SQS supports up to 10 messages per batch)
                entries = []
                for i, message in enumerate(messages[:10]):  # Limit to 10 messages
                    entry = {
                        'Id': str(i),
                        'MessageBody': json.dumps(message['body'], ensure_ascii=False),
                        'MessageAttributes': message.get('attributes', {})
                    }
                    
                    # Add FIFO parameters if needed
                    if self.queue_url.endswith('.fifo'):
                        entry['MessageGroupId'] = message.get('group_id', 'default')
                        entry['MessageDeduplicationId'] = message.get('dedup_id', f"batch-{i}")
                    
                    entries.append(entry)
                
                # Send batch
                response = await sqs.send_message_batch(
                    QueueUrl=self.queue_url,
                    Entries=entries
                )
                
                successful_count = len(response.get('Successful', []))
                failed_count = len(response.get('Failed', []))
                
                logger.info(f"Batch notification results: {successful_count} successful, {failed_count} failed")
                
                # Log failed messages
                for failed in response.get('Failed', []):
                    logger.error(f"Failed batch message: Id={failed.get('Id')}, "
                               f"Code={failed.get('Code')}, Message={failed.get('Message')}")
                
                return {
                    "successful": successful_count,
                    "failed": failed_count,
                    "failed_messages": response.get('Failed', [])
                }
                
            except Exception as e:
                logger.error(f"Batch notification failed: {str(e)}")
                raise IFCNotificationError(f"Batch notification failed: {str(e)}") from e
    
    async def health_check(self) -> bool:
        """
        Check if SQS queue is accessible and healthy.
        
        Returns:
            True if queue is accessible, False otherwise
        """
        try:
            session = aioboto3.Session()
            
            async with session.client('sqs', region_name=self.region) as sqs:
                # Get queue attributes to verify access
                await sqs.get_queue_attributes(
                    QueueUrl=self.queue_url,
                    AttributeNames=['ApproximateNumberOfMessages']
                )
                
                logger.info("SQS queue health check passed")
                return True
                
        except Exception as e:
            logger.error(f"SQS queue health check failed: {str(e)}")
            return False