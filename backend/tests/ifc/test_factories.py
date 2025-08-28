"""
Tests for IFC Dependency Injection Factory - AEC Axis

Unit tests for dependency injection factory patterns,
environment-based configuration switching, and component creation.
"""

import pytest
import os
import tempfile
from unittest.mock import patch, MagicMock

from app.services.ifc.factories import IFCServiceFactory, IFCServiceContainer
from app.services.ifc.storage.s3_storage import S3IFCStorage
from app.services.ifc.storage.local_storage import LocalIFCStorage
from app.services.ifc.processing.ifc_processor import IfcOpenShellProcessor
from app.services.ifc.processing.mock_processor import MockIFCProcessor
from app.services.ifc.notification.sqs_notifier import SQSNotifier
from app.services.ifc.notification.webhook_notifier import WebhookNotifier
from app.services.ifc.config import IFCServiceConfig


class TestIFCServiceFactory:
    """Test suite for IFCServiceFactory."""
    
    def setup_method(self):
        """Reset factory state before each test."""
        IFCServiceFactory.reset_containers()
    
    def teardown_method(self):
        """Clean up after each test."""
        IFCServiceFactory.reset_containers()
    
    def test_create_production_components(self):
        """Test creating components for production environment."""
        with patch.dict(os.environ, {
            'AWS_S3_BUCKET_NAME': 'prod-bucket',
            'AWS_SQS_QUEUE_URL': 'https://sqs.us-east-1.amazonaws.com/123/prod-queue',
            'AWS_DEFAULT_REGION': 'us-east-1'
        }):
            components = IFCServiceFactory.create_service_components("production")
            
            assert "storage" in components
            assert "processor" in components
            assert "notifier" in components
            assert "config" in components
            
            # Verify component types
            assert isinstance(components["storage"], S3IFCStorage)
            assert isinstance(components["processor"], IfcOpenShellProcessor)
            assert isinstance(components["notifier"], SQSNotifier)
            assert isinstance(components["config"], IFCServiceConfig)
            
            # Verify configuration
            config = components["config"]
            assert config.aws_s3_bucket_name == "prod-bucket"
            assert config.storage_backend == "s3"
            assert config.processor_backend == "ifcopenshell"
    
    def test_create_development_components(self):
        """Test creating components for development environment."""
        components = IFCServiceFactory.create_service_components("development")
        
        assert "storage" in components
        assert "processor" in components
        assert "notifier" in components
        assert "config" in components
        
        # Verify component types for development
        assert isinstance(components["storage"], LocalIFCStorage)
        assert isinstance(components["processor"], MockIFCProcessor)
        assert isinstance(components["notifier"], SQSNotifier)
        
        # Verify development configuration
        config = components["config"]
        assert config.storage_backend == "local"
        assert config.processor_backend == "mock"
        assert config.processing_timeout_seconds == 60  # Shorter for dev
        assert config.max_file_size_mb == 100  # Smaller for dev
    
    def test_create_testing_components(self):
        """Test creating components for testing environment."""
        components = IFCServiceFactory.create_service_components("testing")
        
        # Verify component types for testing
        assert isinstance(components["storage"], LocalIFCStorage)
        assert isinstance(components["processor"], MockIFCProcessor)
        assert isinstance(components["notifier"], SQSNotifier)
        
        # Verify testing configuration
        config = components["config"]
        assert config.storage_backend == "mock"
        assert config.processor_backend == "mock"
        assert config.aws_s3_bucket_name == "test-bucket"
        assert config.processing_timeout_seconds == 30
        assert config.max_file_size_mb == 50
    
    def test_singleton_container_behavior(self):
        """Test that containers are singletons per environment."""
        container1 = IFCServiceFactory.create_container("production")
        container2 = IFCServiceFactory.create_container("production")
        
        # Should be the same instance
        assert container1 is container2
        
        # Different environment should be different instance
        container3 = IFCServiceFactory.create_container("development")
        assert container3 is not container1
    
    def test_individual_component_creation(self):
        """Test creating individual components."""
        # Test storage creation
        storage = IFCServiceFactory.create_storage("development")
        assert isinstance(storage, LocalIFCStorage)
        
        # Test processor creation
        processor = IFCServiceFactory.create_processor("development")
        assert isinstance(processor, MockIFCProcessor)
        
        # Test notifier creation
        notifier = IFCServiceFactory.create_notifier("production")
        assert isinstance(notifier, SQSNotifier)
    
    def test_configure_for_testing(self):
        """Test testing-specific configuration."""
        components = IFCServiceFactory.configure_for_testing(
            storage_backend="mock",
            processor_backend="mock",
            notification_backend="sqs"
        )
        
        assert "storage" in components
        assert "processor" in components
        assert "notifier" in components
        assert "config" in components
        
        config = components["config"]
        assert config.storage_backend == "mock"
        assert config.processor_backend == "mock"
        assert config.notification_backend == "sqs"
        assert config.processing_timeout_seconds == 10  # Very short for tests
    
    def test_create_mock_components(self):
        """Test creating all mock components."""
        components = IFCServiceFactory.create_mock_components()
        
        # Should use mock implementations
        assert isinstance(components["processor"], MockIFCProcessor)
        
        config = components["config"]
        assert config.storage_backend == "mock"
        assert config.processor_backend == "mock"
    
    @pytest.mark.asyncio
    async def test_health_check_all_components(self):
        """Test health check functionality."""
        # Mock successful health checks
        with patch.object(LocalIFCStorage, 'health_check', return_value=True) as mock_storage_health, \
             patch.object(SQSNotifier, 'health_check', return_value=True) as mock_notifier_health:
            
            results = IFCServiceFactory.health_check_all_components("development")
            
            assert "environment" in results
            assert results["environment"] == "development"
            assert "timestamp" in results
            assert "storage" in results
            assert "processor" in results
            assert "notifier" in results
            
            # Storage and notifier should have been checked
            assert results["storage"]["status"] == "no_health_check_available"  # LocalIFCStorage doesn't have health_check by default
            assert results["processor"]["status"] == "healthy"
    
    def test_reset_containers(self):
        """Test resetting factory containers."""
        # Create some containers
        container1 = IFCServiceFactory.create_container("production")
        container2 = IFCServiceFactory.create_container("development")
        
        # Verify containers exist
        assert len(IFCServiceFactory._containers) == 2
        
        # Reset containers
        IFCServiceFactory.reset_containers()
        
        # Verify containers are cleared
        assert len(IFCServiceFactory._containers) == 0
        
        # Creating again should create new instances
        container3 = IFCServiceFactory.create_container("production")
        assert container3 is not container1
    
    def test_environment_variable_override(self):
        """Test that environment variables override default configuration."""
        with patch.dict(os.environ, {
            'AWS_S3_BUCKET_NAME': 'env-override-bucket',
            'AWS_SQS_QUEUE_URL': 'https://sqs.us-west-2.amazonaws.com/456/env-queue',
            'AWS_DEFAULT_REGION': 'us-west-2',
            'IFC_STORAGE_BACKEND': 'local',
            'IFC_PROCESSOR_BACKEND': 'mock'
        }):
            components = IFCServiceFactory.create_service_components("production")
            config = components["config"]
            
            # Should use environment variable values
            assert config.aws_s3_bucket_name == "env-override-bucket"
            assert config.aws_sqs_queue_url == "https://sqs.us-west-2.amazonaws.com/456/env-queue"
            assert config.aws_region == "us-west-2"


class TestIFCServiceContainer:
    """Test suite for IFCServiceContainer dependency injection."""
    
    def test_container_configuration(self):
        """Test container configuration with custom config."""
        container = IFCServiceContainer()
        
        # Configure container
        test_config = {
            'aws_s3_bucket_name': 'test-container-bucket',
            'aws_sqs_queue_url': 'https://sqs.us-east-1.amazonaws.com/test/queue',
            'aws_region': 'us-east-1',
            'storage_backend': 's3',
            'processor_backend': 'ifcopenshell',
            'notification_backend': 'sqs',
            'local_storage_path': './test_storage',
            'processing_timeout_seconds': 120,
            'max_file_size_mb': 200
        }
        
        container.config.from_dict(test_config)
        
        # Test that components can be created
        storage = container.storage()
        assert storage is not None
        
        processor = container.processor()
        assert processor is not None
        
        notifier = container.notifier()
        assert notifier is not None
    
    def test_singleton_behavior(self):
        """Test singleton behavior of container components."""
        container = IFCServiceContainer()
        
        # Configure basic settings
        container.config.from_dict({
            'aws_s3_bucket_name': 'test-bucket',
            'aws_sqs_queue_url': 'https://sqs.us-east-1.amazonaws.com/test/queue',
            'storage_backend': 's3',
            'processor_backend': 'mock',
            'notification_backend': 'sqs'
        })
        
        # Get same component multiple times
        storage1 = container.s3_storage()
        storage2 = container.s3_storage()
        
        # Should be the same instance (singleton)
        assert storage1 is storage2
        
        # Different component types should be different instances
        notifier = container.sqs_notifier()
        assert notifier is not storage1
    
    def test_factory_pattern_components(self):
        """Test factory pattern components that select implementation based on config."""
        container = IFCServiceContainer()
        
        # Test S3 storage selection
        container.config.from_dict({
            'aws_s3_bucket_name': 'test-bucket',
            'aws_sqs_queue_url': 'https://sqs.us-east-1.amazonaws.com/test/queue',
            'storage_backend': 's3',
            'processor_backend': 'mock',
            'notification_backend': 'sqs'
        })
        
        storage = container.storage()
        assert isinstance(storage, S3IFCStorage)
        
        # Test local storage selection
        container.config.storage_backend = 'local'
        container.config.local_storage_path = './test_local'
        
        storage = container.storage()
        assert isinstance(storage, LocalIFCStorage)
        
        # Test mock processor selection
        processor = container.processor()
        assert isinstance(processor, MockIFCProcessor)
        
        # Test IFC processor selection
        container.config.processor_backend = 'ifcopenshell'
        processor = container.processor()
        assert isinstance(processor, IfcOpenShellProcessor)