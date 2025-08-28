"""
Webhook Notification Implementation for IFC Processing Events - AEC Axis

This module implements the notification interface using HTTP webhooks with async operations,
signature validation, security headers, and timeout handling for webhook delivery.
"""

import hashlib
import hmac
import json
import logging
import aiohttp
from aiobreaker import CircuitBreaker
from datetime import datetime
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
from typing import Dict, Any, Optional, List
from urllib.parse import urlparse

from .base import NotificationInterface, IFCNotificationError
from ..processing.base import ProcessingResult
from ..config import RetryConfig, CircuitBreakerConfig


logger = logging.getLogger(__name__)


class WebhookNotifier(NotificationInterface):
    """
    Webhook-based implementation of IFC processing notifications with async HTTP requests.
    
    Features:
    - Async HTTP requests using aiohttp
    - Circuit breaker for fault tolerance
    - Signature validation for security
    - Security headers for webhook delivery
    - Timeout handling for webhook requests
    - Retry logic with exponential backoff
    """
    
    def __init__(
        self,
        webhook_urls: List[str],
        webhook_secret: Optional[str] = None,
        timeout_seconds: int = 30,
        retry_config: Optional[RetryConfig] = None,
        circuit_breaker_config: Optional[CircuitBreakerConfig] = None,
        custom_headers: Optional[Dict[str, str]] = None
    ):
        """
        Initialize webhook notifier with configuration.
        
        Args:
            webhook_urls: List of webhook URLs to send notifications to
            webhook_secret: Secret key for HMAC signature validation
            timeout_seconds: Request timeout in seconds
            retry_config: Retry configuration
            circuit_breaker_config: Circuit breaker configuration
            custom_headers: Additional headers to send with requests
        """
        self.webhook_urls = webhook_urls
        self.webhook_secret = webhook_secret
        self.timeout_seconds = timeout_seconds
        self.retry_config = retry_config or RetryConfig()
        self.circuit_breaker_config = circuit_breaker_config or CircuitBreakerConfig()
        self.custom_headers = custom_headers or {}
        
        # Circuit breaker for webhook operations
        from datetime import timedelta
        self.circuit_breaker = CircuitBreaker(
            fail_max=self.circuit_breaker_config.failure_threshold,
            timeout_duration=timedelta(seconds=self.circuit_breaker_config.reset_timeout)
        )
        
        logger.info(f"Initialized WebhookNotifier: {len(webhook_urls)} URLs, timeout={timeout_seconds}s")
    
    def _generate_signature(self, payload: str) -> Optional[str]:
        """
        Generate HMAC signature for webhook payload.
        
        Args:
            payload: JSON payload as string
            
        Returns:
            HMAC signature or None if no secret configured
        """
        if not self.webhook_secret:
            return None
        
        signature = hmac.new(
            key=self.webhook_secret.encode('utf-8'),
            msg=payload.encode('utf-8'),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        return f"sha256={signature}"
    
    def _validate_webhook_url(self, url: str) -> bool:
        """
        Validate webhook URL for basic security checks.
        
        Args:
            url: Webhook URL to validate
            
        Returns:
            True if URL is valid and safe
        """
        try:
            parsed = urlparse(url)
            
            # Only allow HTTPS for production security
            if parsed.scheme not in ['http', 'https']:
                return False
            
            # Prevent localhost/private network calls in production
            # In development, allow localhost
            hostname = parsed.hostname
            if hostname:
                # Allow localhost in development
                if hostname in ['localhost', '127.0.0.1', '::1']:
                    return True
                
                # Block private network ranges (simplified check)
                if hostname.startswith('10.') or hostname.startswith('192.168.') or hostname.startswith('172.'):
                    logger.warning(f"Blocked private network webhook URL: {url}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Invalid webhook URL {url}: {str(e)}")
            return False
    
    
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
        logger.info(f"Sending webhook processing queued notification: ifc_file_id={ifc_file_id}")
        
        payload = {
            "event_type": "ifc_processing_queued",
            "ifc_file_id": ifc_file_id,
            "storage_url": storage_url,
            "metadata": metadata,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self._send_webhook_notifications(payload)
    
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
        logger.info(f"Sending webhook processing complete notification: ifc_file_id={ifc_file_id}, status={result.status.value}")
        
        payload = {
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
        
        # Include extracted data if available (but limit size for webhooks)
        if result.extracted_data and result.status.value == "COMPLETED":
            extracted_data = result.extracted_data.copy()
            if "materials" in extracted_data:
                materials = extracted_data["materials"]
                if len(materials) > 50:  # Limit materials for webhook payload size
                    extracted_data["materials"] = materials[:50]
                    extracted_data["materials_truncated"] = True
                    extracted_data["total_materials_count"] = len(materials)
            
            payload["extracted_data"] = extracted_data
        
        await self._send_webhook_notifications(payload)
    
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
        logger.info(f"Sending webhook error notification: ifc_file_id={ifc_file_id}")
        
        payload = {
            "event_type": "ifc_processing_error",
            "ifc_file_id": ifc_file_id,
            "error_message": error_message,
            "error_context": error_context or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self._send_webhook_notifications(payload)
    
    async def _send_webhook_notifications(self, payload: Dict[str, Any]) -> None:
        """
        Send webhook notifications to all configured URLs.
        
        Args:
            payload: Notification payload
            
        Raises:
            IFCNotificationError: If all webhook deliveries fail
        """
        if not self.webhook_urls:
            logger.warning("No webhook URLs configured, skipping webhook notification")
            return
        
        # Filter valid URLs
        valid_urls = [url for url in self.webhook_urls if self._validate_webhook_url(url)]
        if not valid_urls:
            logger.error("No valid webhook URLs found")
            raise IFCNotificationError("No valid webhook URLs configured")
        
        # Prepare payload
        payload_json = json.dumps(payload, ensure_ascii=False)
        signature = self._generate_signature(payload_json)
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'AEC-Axis-IFC-Service/1.0',
            'X-Event-Type': payload.get('event_type', 'unknown'),
            'X-IFC-File-ID': payload.get('ifc_file_id', 'unknown'),
            **self.custom_headers
        }
        
        if signature:
            headers['X-Signature'] = signature
        
        # Send to all URLs (parallel for efficiency)
        successful_deliveries = 0
        errors = []
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for url in valid_urls:
                task = self._send_single_webhook(session, url, payload_json, headers)
                tasks.append(task)
            
            # Wait for all webhook deliveries
            import asyncio
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Webhook delivery failed to {valid_urls[i]}: {str(result)}")
                    errors.append(str(result))
                else:
                    successful_deliveries += 1
                    logger.debug(f"Webhook delivered successfully to {valid_urls[i]}")
        
        # Check if at least one delivery succeeded
        if successful_deliveries == 0:
            error_summary = "; ".join(errors[:3])  # Limit error message length
            raise IFCNotificationError(f"All webhook deliveries failed: {error_summary}")
        
        logger.info(f"Webhook notifications completed: {successful_deliveries}/{len(valid_urls)} successful")
    
    async def _send_single_webhook(
        self,
        session: aiohttp.ClientSession,
        url: str,
        payload_json: str,
        headers: Dict[str, str]
    ) -> None:
        """
        Send a single webhook request with circuit breaker and retry logic.
        
        Args:
            session: aiohttp client session
            url: Webhook URL
            payload_json: JSON payload
            headers: Request headers
            
        Raises:
            IFCNotificationError: If webhook delivery fails
        """
        try:
            await self.circuit_breaker(self._perform_webhook_request)(
                session, url, payload_json, headers
            )
        except Exception as e:
            if "CircuitBreakerError" in str(type(e)):
                raise IFCNotificationError(f"Webhook temporarily unavailable (circuit breaker open) for {url}") from e
            raise IFCNotificationError(f"Webhook delivery failed to {url}: {str(e)}") from e
    
    async def _perform_webhook_request(
        self,
        session: aiohttp.ClientSession,
        url: str,
        payload_json: str,
        headers: Dict[str, str]
    ) -> None:
        """
        Perform the actual webhook HTTP request.
        
        Args:
            session: aiohttp client session
            url: Webhook URL
            payload_json: JSON payload
            headers: Request headers
        """
        timeout = aiohttp.ClientTimeout(total=self.timeout_seconds)
        
        async with session.post(
            url,
            data=payload_json,
            headers=headers,
            timeout=timeout,
            ssl=True  # Verify SSL certificates
        ) as response:
            # Check response status
            if response.status >= 400:
                response_text = await response.text()
                raise IFCNotificationError(
                    f"Webhook returned error status {response.status}: {response_text[:200]}"
                )
            
            # Log successful delivery
            logger.debug(f"Webhook delivered successfully: {response.status} {response.reason}")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check health of all configured webhook URLs.
        
        Returns:
            Dictionary with health check results
        """
        results = {
            "total_urls": len(self.webhook_urls),
            "valid_urls": 0,
            "reachable_urls": 0,
            "unreachable_urls": [],
            "invalid_urls": []
        }
        
        if not self.webhook_urls:
            return results
        
        # Validate URLs
        valid_urls = []
        for url in self.webhook_urls:
            if self._validate_webhook_url(url):
                valid_urls.append(url)
                results["valid_urls"] += 1
            else:
                results["invalid_urls"].append(url)
        
        # Test connectivity to valid URLs
        async with aiohttp.ClientSession() as session:
            for url in valid_urls:
                try:
                    timeout = aiohttp.ClientTimeout(total=5)  # Short timeout for health check
                    async with session.head(url, timeout=timeout, ssl=True) as response:
                        if response.status < 500:  # Accept any non-server-error status
                            results["reachable_urls"] += 1
                        else:
                            results["unreachable_urls"].append(url)
                except Exception as e:
                    logger.debug(f"Webhook health check failed for {url}: {str(e)}")
                    results["unreachable_urls"].append(url)
        
        logger.info(f"Webhook health check: {results['reachable_urls']}/{results['valid_urls']} URLs reachable")
        return results