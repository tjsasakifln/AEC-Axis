"""
Dependency Injection Factory for IFC Service - AEC Axis

This module contains factory classes for creating IFC service components with
environment-based configuration and dependency injection patterns.
"""

import logging
import os
from typing import Dict, Any, Optional
from dependency_injector import containers, providers

from .config import IFCServiceConfig, get_config_from_environment
from .storage.base import IFCStorageInterface
from .storage.s3_storage import S3IFCStorage
from .storage.local_storage import LocalIFCStorage
from .processing.base import IFCProcessorInterface
from .processing.ifc_processor import IfcOpenShellProcessor
from .processing.mock_processor import MockIFCProcessor, MockBehavior
from .notification.base import NotificationInterface
from .notification.sqs_notifier import SQSNotifier
from .notification.webhook_notifier import WebhookNotifier


logger = logging.getLogger(__name__)


class IFCServiceContainer(containers.DeclarativeContainer):
    """
    Dependency injection container for IFC service components.
    
    This container manages the creation and lifecycle of all IFC service
    components using the dependency-injector framework.
    """
    
    # Configuration
    config = providers.Configuration()
    
    # Storage providers
    s3_storage = providers.Singleton(
        S3IFCStorage,
        bucket_name=config.aws_s3_bucket_name,
        region=config.aws_region,
        retry_config=config.retry_config,
        circuit_breaker_config=config.circuit_breaker_config
    )
    
    local_storage = providers.Singleton(
        LocalIFCStorage,
        storage_path=config.local_storage_path,
        base_url="http://localhost:8000/storage"
    )
    
    mock_storage = providers.Singleton(
        LocalIFCStorage,
        storage_path="./test_storage/ifc-files",
        base_url="http://localhost:8000/test_storage"
    )
    
    # Storage factory
    storage = providers.Factory(
        lambda backend, s3_storage, local_storage, mock_storage: {
            "s3": s3_storage,
            "local": local_storage,
            "mock": mock_storage
        }.get(backend, s3_storage),
        backend=config.storage_backend,
        s3_storage=s3_storage,
        local_storage=local_storage,
        mock_storage=mock_storage
    )
    
    # Processing providers
    ifc_processor = providers.Factory(
        IfcOpenShellProcessor,
        storage=storage,
        processing_timeout_seconds=config.processing_timeout_seconds,
        max_workers=2,
        circuit_breaker_config=config.circuit_breaker_config
    )
    
    mock_processor = providers.Singleton(
        MockIFCProcessor,
        behavior=MockBehavior.SUCCESS,
        processing_delay_seconds=0.1,
        materials_count=5
    )
    
    # Processing factory
    processor = providers.Factory(
        lambda backend, ifc_processor, mock_processor: {
            "ifcopenshell": ifc_processor,
            "mock": mock_processor
        }.get(backend, ifc_processor),
        backend=config.processor_backend,
        ifc_processor=ifc_processor,
        mock_processor=mock_processor
    )
    
    # Notification providers
    sqs_notifier = providers.Singleton(
        SQSNotifier,
        queue_url=config.aws_sqs_queue_url,
        region=config.aws_region,
        retry_config=config.retry_config,
        circuit_breaker_config=config.circuit_breaker_config
    )
    
    webhook_notifier = providers.Singleton(
        WebhookNotifier,
        webhook_urls=[],  # Will be configured at runtime
        timeout_seconds=30,
        retry_config=config.retry_config,
        circuit_breaker_config=config.circuit_breaker_config
    )
    
    # Notification factory
    notifier = providers.Factory(
        lambda backend, sqs_notifier, webhook_notifier: {
            "sqs": sqs_notifier,
            "webhook": webhook_notifier
        }.get(backend, sqs_notifier),
        backend=config.notification_backend,
        sqs_notifier=sqs_notifier,
        webhook_notifier=webhook_notifier
    )


class IFCServiceFactory:
    """
    Factory class for creating IFC service components.
    
    This factory provides simple methods for creating service components
    with appropriate configuration for different environments.
    """
    
    _containers: Dict[str, IFCServiceContainer] = {}
    
    @classmethod
    def create_container(cls, environment: str = "production") -> IFCServiceContainer:
        """
        Create or get a container for the specified environment.
        
        Args:
            environment: Environment name (production, development, testing)
            
        Returns:
            Configured IFCServiceContainer
        """
        if environment not in cls._containers:
            container = IFCServiceContainer()
            config = cls._get_config_for_environment(environment)
            container.config.from_dict(config.__dict__)
            cls._containers[environment] = container
        
        return cls._containers[environment]
    
    @classmethod
    def create_storage(cls, environment: str = "production") -> IFCStorageInterface:
        """
        Create storage component for specified environment.
        
        Args:
            environment: Environment name
            
        Returns:
            Configured storage interface
        """
        container = cls.create_container(environment)
        return container.storage()
    
    @classmethod
    def create_processor(cls, environment: str = "production") -> IFCProcessorInterface:
        """
        Create processor component for specified environment.
        
        Args:
            environment: Environment name
            
        Returns:
            Configured processor interface
        """
        container = cls.create_container(environment)
        return container.processor()
    
    @classmethod
    def create_notifier(cls, environment: str = "production") -> NotificationInterface:
        """
        Create notifier component for specified environment.
        
        Args:
            environment: Environment name
            
        Returns:
            Configured notifier interface
        """
        container = cls.create_container(environment)
        return container.notifier()
    
    @classmethod
    def create_service_components(cls, environment: str = "production") -> Dict[str, Any]:
        """
        Create all service components for specified environment.
        
        Args:
            environment: Environment name
            
        Returns:
            Dictionary with all service components
        """
        container = cls.create_container(environment)
        
        return {
            "storage": container.storage(),
            "processor": container.processor(),
            "notifier": container.notifier(),
            "config": cls._get_config_for_environment(environment)
        }
    
    @classmethod
    def _get_config_for_environment(cls, environment: str) -> IFCServiceConfig:
        """
        Get configuration for specified environment.
        
        Args:
            environment: Environment name
            
        Returns:
            IFCServiceConfig for the environment
        """
        if environment == "development":
            return IFCServiceConfig(
                aws_s3_bucket_name=os.getenv('AWS_S3_BUCKET_NAME', 'aec-axis-ifc-files-dev'),
                aws_sqs_queue_url=os.getenv('AWS_SQS_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789012/aec-axis-ifc-processing-dev'),
                aws_region=os.getenv('AWS_DEFAULT_REGION', 'us-east-1'),
                storage_backend="local",  # Use local storage for development
                processor_backend="mock",  # Use mock processor for faster development
                notification_backend="sqs",
                processing_timeout_seconds=60,  # Shorter timeout for development
                max_file_size_mb=100  # Smaller file limit for development
            )
        
        elif environment == "testing":
            return IFCServiceConfig(
                aws_s3_bucket_name="test-bucket",
                aws_sqs_queue_url="https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
                aws_region="us-east-1",
                storage_backend="mock",  # Use mock storage for testing
                processor_backend="mock",  # Use mock processor for testing
                notification_backend="sqs",  # Could also mock this
                processing_timeout_seconds=30,
                max_file_size_mb=50
            )
        
        else:  # production
            return get_config_from_environment()
    
    @classmethod
    def configure_for_testing(
        cls,
        storage_backend: str = "mock",
        processor_backend: str = "mock",
        notification_backend: str = "sqs"
    ) -> Dict[str, Any]:
        """
        Create components specifically configured for testing.
        
        Args:
            storage_backend: Storage backend to use
            processor_backend: Processor backend to use
            notification_backend: Notification backend to use
            
        Returns:
            Dictionary with test-configured components
        """
        container = IFCServiceContainer()
        
        # Configure for testing
        test_config = IFCServiceConfig(
            aws_s3_bucket_name="test-bucket",
            aws_sqs_queue_url="https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
            aws_region="us-east-1",
            storage_backend=storage_backend,
            processor_backend=processor_backend,
            notification_backend=notification_backend,
            processing_timeout_seconds=10,  # Very short for tests
            max_file_size_mb=10
        )
        
        container.config.from_dict(test_config.__dict__)
        
        return {
            "storage": container.storage(),
            "processor": container.processor(),
            "notifier": container.notifier(),
            "config": test_config
        }
    
    @classmethod
    def create_mock_components(cls) -> Dict[str, Any]:
        """
        Create all mock components for testing.
        
        Returns:
            Dictionary with mock components
        """
        return cls.configure_for_testing(
            storage_backend="mock",
            processor_backend="mock",
            notification_backend="sqs"  # SQS can be mocked at the boto3 level
        )
    
    @classmethod
    def health_check_all_components(cls, environment: str = "production") -> Dict[str, Any]:
        """
        Perform health checks on all components.
        
        Args:
            environment: Environment name
            
        Returns:
            Health check results for all components
        """
        components = cls.create_service_components(environment)
        results = {
            "environment": environment,
            "timestamp": datetime.utcnow().isoformat(),
            "storage": {"status": "unknown"},
            "processor": {"status": "unknown"},
            "notifier": {"status": "unknown"}
        }
        
        try:
            # Storage health check
            storage = components["storage"]
            if hasattr(storage, 'health_check'):
                storage_health = asyncio.run(storage.health_check())
                results["storage"] = {"status": "healthy" if storage_health else "unhealthy"}
            else:
                results["storage"] = {"status": "no_health_check_available"}
        except Exception as e:
            results["storage"] = {"status": "error", "error": str(e)}
        
        try:
            # Processor health check (basic instantiation check)
            processor = components["processor"]
            results["processor"] = {"status": "healthy", "type": type(processor).__name__}
        except Exception as e:
            results["processor"] = {"status": "error", "error": str(e)}
        
        try:
            # Notifier health check
            notifier = components["notifier"]
            if hasattr(notifier, 'health_check'):
                notifier_health = asyncio.run(notifier.health_check())
                results["notifier"] = {"status": "healthy" if notifier_health else "unhealthy"}
            else:
                results["notifier"] = {"status": "no_health_check_available"}
        except Exception as e:
            results["notifier"] = {"status": "error", "error": str(e)}
        
        return results
    
    @classmethod
    def reset_containers(cls):
        """Reset all cached containers (useful for testing)."""
        cls._containers.clear()


# Additional import for datetime
from datetime import datetime
import asyncio