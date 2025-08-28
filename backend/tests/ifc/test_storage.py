"""
Tests for IFC Storage Components - AEC Axis

Unit tests for storage layer implementations with async patterns, 
circuit breaker behavior, and mocking.
"""

import pytest
import asyncio
import tempfile
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

from app.services.ifc.storage.base import IFCStorageInterface, UploadResult, IFCStorageError
from app.services.ifc.storage.s3_storage import S3IFCStorage
from app.services.ifc.storage.local_storage import LocalIFCStorage
from app.services.ifc.config import RetryConfig, CircuitBreakerConfig


@pytest.fixture
def sample_file_content():
    """Sample IFC file content for testing."""
    return b"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01T10:00:00',('Test User'),('Test Organization'),'IFC Test File','Test Application','Test Version');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('3nv1si8xb0QuRsOYjlGwGx',#2,'Test Project',$,$,$,$,$,#3);
#2=IFCOWNERHISTORY(#4,#5,$,.ADDED.,1577836800,$,$,1577836800);
#3=IFCUNITASSIGNMENT((#6));
#4=IFCPERSON($,'Test','User',$,$,$,$,$);
#5=IFCORGANIZATION($,'Test Organization',$,$,$);
#6=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
ENDSEC;
END-ISO-10303-21;
"""


@pytest.fixture
def sample_metadata():
    """Sample metadata for testing."""
    return {
        "original_filename": "test.ifc",
        "project_id": "test-project-123",
        "upload_timestamp": "2024-01-01T10:00:00"
    }


class TestLocalIFCStorage:
    """Test suite for LocalIFCStorage implementation."""
    
    @pytest.fixture
    def temp_storage_path(self):
        """Create temporary storage directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    @pytest.fixture
    def local_storage(self, temp_storage_path):
        """Create LocalIFCStorage instance with temporary directory."""
        return LocalIFCStorage(
            storage_path=temp_storage_path,
            base_url="http://localhost:8000/test_storage"
        )
    
    @pytest.mark.asyncio
    async def test_upload_file_success(self, local_storage, sample_file_content, sample_metadata):
        """Test successful file upload to local storage."""
        key = "test/sample.ifc"
        
        result = await local_storage.upload_file(
            content=sample_file_content,
            key=key,
            metadata=sample_metadata
        )
        
        # Verify upload result
        assert isinstance(result, UploadResult)
        assert result.object_key == key
        assert result.file_size == len(sample_file_content)
        assert result.storage_url == f"http://localhost:8000/test_storage/{key}"
        assert result.metadata == sample_metadata
        
        # Verify file was actually written
        file_path = Path(local_storage.storage_path) / key
        assert file_path.exists()
        assert file_path.read_bytes() == sample_file_content
    
    @pytest.mark.asyncio
    async def test_upload_file_creates_directories(self, local_storage, sample_file_content, sample_metadata):
        """Test that upload creates necessary directories."""
        key = "deep/nested/directories/test.ifc"
        
        result = await local_storage.upload_file(
            content=sample_file_content,
            key=key,
            metadata=sample_metadata
        )
        
        assert result.object_key == key
        
        # Verify nested directories were created
        file_path = Path(local_storage.storage_path) / key
        assert file_path.exists()
        assert file_path.parent.exists()
    
    @pytest.mark.asyncio
    async def test_delete_file_success(self, local_storage, sample_file_content, sample_metadata):
        """Test successful file deletion."""
        key = "test/delete_me.ifc"
        
        # Upload file first
        await local_storage.upload_file(
            content=sample_file_content,
            key=key,
            metadata=sample_metadata
        )
        
        # Verify file exists
        file_path = Path(local_storage.storage_path) / key
        assert file_path.exists()
        
        # Delete file
        success = await local_storage.delete_file(key)
        
        assert success is True
        assert not file_path.exists()
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_file(self, local_storage):
        """Test deleting a file that doesn't exist."""
        key = "nonexistent/file.ifc"
        
        # Should return True (idempotent deletion)
        success = await local_storage.delete_file(key)
        assert success is True
    
    @pytest.mark.asyncio
    async def test_get_presigned_url(self, local_storage, sample_file_content, sample_metadata):
        """Test generating presigned URL for local file."""
        key = "test/url_test.ifc"
        
        # Upload file first
        await local_storage.upload_file(
            content=sample_file_content,
            key=key,
            metadata=sample_metadata
        )
        
        # Get presigned URL
        url = await local_storage.get_presigned_url(key)
        
        assert url == f"http://localhost:8000/test_storage/{key}"
    
    @pytest.mark.asyncio
    async def test_get_presigned_url_nonexistent_file(self, local_storage):
        """Test getting presigned URL for nonexistent file."""
        key = "nonexistent/file.ifc"
        
        with pytest.raises(IFCStorageError, match="File does not exist"):
            await local_storage.get_presigned_url(key)
    
    @pytest.mark.asyncio
    async def test_get_file_content(self, local_storage, sample_file_content, sample_metadata):
        """Test reading file content directly."""
        key = "test/content_test.ifc"
        
        # Upload file first
        await local_storage.upload_file(
            content=sample_file_content,
            key=key,
            metadata=sample_metadata
        )
        
        # Read content back
        content = await local_storage.get_file_content(key)
        
        assert content == sample_file_content
    
    @pytest.mark.asyncio
    async def test_get_metadata(self, local_storage, sample_file_content, sample_metadata):
        """Test reading file metadata."""
        key = "test/metadata_test.ifc"
        
        # Upload file first
        await local_storage.upload_file(
            content=sample_file_content,
            key=key,
            metadata=sample_metadata
        )
        
        # Read metadata back
        metadata = await local_storage.get_metadata(key)
        
        assert metadata == sample_metadata


class TestS3IFCStorage:
    """Test suite for S3IFCStorage implementation with mocking."""
    
    @pytest.fixture
    def retry_config(self):
        """Retry configuration for testing."""
        return RetryConfig(max_attempts=2, base_delay=0.1, max_delay=1.0)
    
    @pytest.fixture
    def circuit_breaker_config(self):
        """Circuit breaker configuration for testing."""
        return CircuitBreakerConfig(failure_threshold=3, reset_timeout=5)
    
    @pytest.fixture
    def s3_storage(self, retry_config, circuit_breaker_config):
        """Create S3IFCStorage instance for testing."""
        return S3IFCStorage(
            bucket_name="test-bucket",
            region="us-east-1",
            retry_config=retry_config,
            circuit_breaker_config=circuit_breaker_config
        )
    
    @pytest.mark.asyncio
    @patch('app.services.ifc.storage.s3_storage.aioboto3.Session')
    async def test_upload_file_success(self, mock_session, s3_storage, sample_file_content, sample_metadata):
        """Test successful S3 file upload with mocking."""
        # Mock aioboto3 session and client
        mock_client = AsyncMock()
        mock_session.return_value.client.return_value.__aenter__.return_value = mock_client
        
        key = "test/s3_upload.ifc"
        
        result = await s3_storage.upload_file(
            content=sample_file_content,
            key=key,
            metadata=sample_metadata
        )
        
        # Verify result
        assert isinstance(result, UploadResult)
        assert result.object_key == key
        assert result.file_size == len(sample_file_content)
        assert result.storage_url == f"s3://test-bucket/{key}"
        assert result.metadata == sample_metadata
        
        # Verify S3 client was called correctly
        mock_client.put_object.assert_called_once()
        call_args = mock_client.put_object.call_args
        assert call_args[1]['Bucket'] == 'test-bucket'
        assert call_args[1]['Key'] == key
        assert call_args[1]['Body'] == sample_file_content
        assert call_args[1]['ContentType'] == 'application/x-step'
        assert call_args[1]['Metadata'] == sample_metadata
        assert call_args[1]['ServerSideEncryption'] == 'AES256'
    
    @pytest.mark.asyncio
    @patch('app.services.ifc.storage.s3_storage.aioboto3.Session')
    async def test_upload_file_client_error(self, mock_session, s3_storage, sample_file_content, sample_metadata):
        """Test S3 upload with ClientError."""
        from botocore.exceptions import ClientError
        
        # Mock client to raise ClientError
        mock_client = AsyncMock()
        mock_client.put_object.side_effect = ClientError(
            error_response={'Error': {'Code': 'AccessDenied', 'Message': 'Access denied'}},
            operation_name='PutObject'
        )
        mock_session.return_value.client.return_value.__aenter__.return_value = mock_client
        
        key = "test/error_upload.ifc"
        
        with pytest.raises(IFCStorageError, match="Access denied to S3 bucket"):
            await s3_storage.upload_file(
                content=sample_file_content,
                key=key,
                metadata=sample_metadata
            )
    
    @pytest.mark.asyncio
    @patch('app.services.ifc.storage.s3_storage.aioboto3.Session')
    async def test_delete_file_success(self, mock_session, s3_storage):
        """Test successful S3 file deletion."""
        mock_client = AsyncMock()
        mock_session.return_value.client.return_value.__aenter__.return_value = mock_client
        
        key = "test/delete_s3.ifc"
        
        success = await s3_storage.delete_file(key)
        
        assert success is True
        mock_client.delete_object.assert_called_once_with(
            Bucket='test-bucket',
            Key=key
        )
    
    @pytest.mark.asyncio
    @patch('app.services.ifc.storage.s3_storage.aioboto3.Session')
    async def test_delete_file_not_found(self, mock_session, s3_storage):
        """Test deleting non-existent S3 file."""
        from botocore.exceptions import ClientError
        
        mock_client = AsyncMock()
        mock_client.delete_object.side_effect = ClientError(
            error_response={'Error': {'Code': 'NoSuchKey', 'Message': 'Key not found'}},
            operation_name='DeleteObject'
        )
        mock_session.return_value.client.return_value.__aenter__.return_value = mock_client
        
        key = "nonexistent/file.ifc"
        
        # Should return True for non-existent files (idempotent)
        success = await s3_storage.delete_file(key)
        assert success is True
    
    @pytest.mark.asyncio
    @patch('app.services.ifc.storage.s3_storage.aioboto3.Session')
    async def test_get_presigned_url_success(self, mock_session, s3_storage):
        """Test generating S3 presigned URL."""
        mock_client = AsyncMock()
        mock_client.generate_presigned_url.return_value = "https://test-bucket.s3.amazonaws.com/test/file.ifc?signature=xxx"
        mock_session.return_value.client.return_value.__aenter__.return_value = mock_client
        
        key = "test/presigned.ifc"
        expires_in = 3600
        
        url = await s3_storage.get_presigned_url(key, expires_in)
        
        assert url.startswith("https://test-bucket.s3.amazonaws.com/")
        mock_client.generate_presigned_url.assert_called_once_with(
            'get_object',
            Params={'Bucket': 'test-bucket', 'Key': key},
            ExpiresIn=expires_in
        )
    
    @pytest.mark.asyncio
    @patch('app.services.ifc.storage.s3_storage.aioboto3.Session')
    async def test_circuit_breaker_functionality(self, mock_session, s3_storage, sample_file_content, sample_metadata):
        """Test circuit breaker behavior on repeated failures."""
        from botocore.exceptions import ClientError
        
        # Mock client to always fail
        mock_client = AsyncMock()
        mock_client.put_object.side_effect = ClientError(
            error_response={'Error': {'Code': 'InternalError', 'Message': 'Internal error'}},
            operation_name='PutObject'
        )
        mock_session.return_value.client.return_value.__aenter__.return_value = mock_client
        
        key = "test/circuit_breaker.ifc"
        
        # Cause failures to trigger circuit breaker (threshold is 3)
        for i in range(3):
            with pytest.raises(IFCStorageError):
                await s3_storage.upload_file(
                    content=sample_file_content,
                    key=f"{key}_{i}",
                    metadata=sample_metadata
                )
        
        # Next call should fail immediately due to open circuit breaker
        with pytest.raises(IFCStorageError, match="circuit breaker open"):
            await s3_storage.upload_file(
                content=sample_file_content,
                key=f"{key}_circuit_open",
                metadata=sample_metadata
            )