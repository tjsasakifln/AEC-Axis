"""
Tests for IFC Processing Components - AEC Axis

Unit tests for processing layer implementations with async patterns,
timeout handling, and memory management.
"""

import pytest
import asyncio
import tempfile
import time
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

from app.services.ifc.processing.base import (
    IFCProcessorInterface, 
    ProcessingResult, 
    ProcessingStatus, 
    IFCProcessingError
)
from app.services.ifc.processing.ifc_processor import IfcOpenShellProcessor
from app.services.ifc.processing.mock_processor import MockIFCProcessor, MockBehavior
from app.services.ifc.storage.local_storage import LocalIFCStorage
from app.services.ifc.config import CircuitBreakerConfig


@pytest.fixture
def sample_ifc_content():
    """Sample IFC file content for testing."""
    return b"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('warehouse.ifc','2024-01-01T10:00:00',('Test User'),('Test Organization'),'Warehouse IFC','Test Application','Test Version');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('3nv1si8xb0QuRsOYjlGwGx',#2,'Test Warehouse Project',$,$,$,$,$,#3);
#2=IFCOWNERHISTORY(#4,#5,$,.ADDED.,1577836800,$,$,1577836800);
#3=IFCUNITASSIGNMENT((#6));
#4=IFCPERSON($,'Test','User',$,$,$,$,$);
#5=IFCORGANIZATION($,'Test Organization',$,$,$);
#6=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#7=IFCBEAM('1nv1si8xb0QuRsOYjlGwGx',#2,'Steel Beam 01',$,$,$,$,$,$);
#8=IFCCOLUMN('2nv1si8xb0QuRsOYjlGwGx',#2,'Steel Column 01',$,$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;
"""


@pytest.fixture
def sample_metadata():
    """Sample file metadata for testing."""
    return {
        "original_filename": "warehouse.ifc",
        "project_id": "test-project-123",
        "upload_timestamp": "2024-01-01T10:00:00"
    }


@pytest.fixture
def temp_storage():
    """Create temporary storage for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        storage = LocalIFCStorage(
            storage_path=temp_dir,
            base_url="http://localhost:8000/test_storage"
        )
        yield storage


class TestMockIFCProcessor:
    """Test suite for MockIFCProcessor implementation."""
    
    def test_mock_processor_initialization(self):
        """Test mock processor initialization with different behaviors."""
        processor = MockIFCProcessor(
            behavior=MockBehavior.SUCCESS,
            processing_delay_seconds=0.1,
            materials_count=10
        )
        
        assert processor.behavior == MockBehavior.SUCCESS
        assert processor.processing_delay_seconds == 0.1
        assert processor.materials_count == 10
        assert processor.should_fail is False
    
    @pytest.mark.asyncio
    async def test_successful_processing(self):
        """Test successful mock processing."""
        processor = MockIFCProcessor(
            behavior=MockBehavior.SUCCESS,
            processing_delay_seconds=0.01,
            materials_count=5
        )
        
        storage_url = "mock://test/file.ifc"
        metadata = {"project_id": "test-123"}
        
        result = await processor.process_file(storage_url, metadata)
        
        assert isinstance(result, ProcessingResult)
        assert result.status == ProcessingStatus.COMPLETED
        assert result.materials_count == 5
        assert result.error_message is None
        assert result.processing_time_seconds > 0
        assert result.extracted_data is not None
        assert "materials" in result.extracted_data
        assert len(result.extracted_data["materials"]) == 5
    
    @pytest.mark.asyncio
    async def test_failure_processing(self):
        """Test mock processing failure."""
        processor = MockIFCProcessor(
            behavior=MockBehavior.FAILURE,
            processing_delay_seconds=0.01,
            failure_message="Mock processing failed for testing"
        )
        
        storage_url = "mock://test/file.ifc"
        metadata = {"project_id": "test-123"}
        
        result = await processor.process_file(storage_url, metadata)
        
        assert result.status == ProcessingStatus.FAILED
        assert result.materials_count == 0
        assert result.error_message == "Mock processing failed for testing"
        assert result.processing_time_seconds > 0
    
    @pytest.mark.asyncio
    async def test_slow_processing(self):
        """Test slow processing simulation."""
        processor = MockIFCProcessor(
            behavior=MockBehavior.SLOW_SUCCESS,
            processing_delay_seconds=0.1,  # Will be overridden to at least 2.0
            materials_count=15
        )
        
        storage_url = "mock://test/large_file.ifc"
        metadata = {"project_id": "test-123"}
        
        start_time = time.time()
        result = await processor.process_file(storage_url, metadata)
        end_time = time.time()
        
        assert result.status == ProcessingStatus.COMPLETED
        assert result.materials_count == 15
        assert end_time - start_time >= 2.0  # At least 2 seconds for slow success
    
    @pytest.mark.asyncio
    async def test_validation_success(self):
        """Test successful file validation."""
        processor = MockIFCProcessor(behavior=MockBehavior.SUCCESS)
        
        storage_url = "mock://test/valid.ifc"
        
        is_valid = await processor.validate_file(storage_url)
        
        assert is_valid is True
    
    @pytest.mark.asyncio
    async def test_validation_failure(self):
        """Test file validation failure."""
        processor = MockIFCProcessor(behavior=MockBehavior.FAILURE)
        
        storage_url = "mock://test/invalid.ifc"
        
        is_valid = await processor.validate_file(storage_url)
        
        assert is_valid is False
    
    def test_behavior_configuration(self):
        """Test dynamic behavior configuration."""
        processor = MockIFCProcessor(behavior=MockBehavior.SUCCESS)
        
        # Change behavior at runtime
        processor.configure_behavior(
            behavior=MockBehavior.FAILURE,
            materials_count=20,
            failure_message="New failure message"
        )
        
        assert processor.behavior == MockBehavior.FAILURE
        assert processor.materials_count == 20
        assert processor.failure_message == "New failure message"
    
    def test_predefined_scenarios(self):
        """Test predefined scenario configurations."""
        processor = MockIFCProcessor()
        
        # Test circuit breaker failure scenario
        processor.simulate_circuit_breaker_failure()
        assert processor.behavior == MockBehavior.FAILURE
        assert "circuit breaker" in processor.failure_message.lower()
        
        # Test performance test scenario
        processor.simulate_performance_test_scenario()
        assert processor.behavior == MockBehavior.SLOW_SUCCESS
        assert processor.processing_delay_seconds == 1.0
        assert processor.materials_count == 20
        
        # Test large file scenario
        processor.simulate_large_file_scenario()
        assert processor.behavior == MockBehavior.SLOW_SUCCESS
        assert processor.processing_delay_seconds == 3.0
        assert processor.materials_count == 100
        
        # Test reset
        processor.reset_to_default()
        assert processor.behavior == MockBehavior.SUCCESS
        assert processor.processing_delay_seconds == 0.1
        assert processor.materials_count == 5


class TestIfcOpenShellProcessor:
    """Test suite for IfcOpenShellProcessor implementation with mocking."""
    
    @pytest.fixture
    def circuit_breaker_config(self):
        """Circuit breaker configuration for testing."""
        return CircuitBreakerConfig(failure_threshold=2, reset_timeout=5)
    
    @pytest.fixture
    async def processor_with_storage(self, temp_storage, circuit_breaker_config):
        """Create IfcOpenShellProcessor with temporary storage."""
        processor = IfcOpenShellProcessor(
            storage=temp_storage,
            processing_timeout_seconds=30,
            max_workers=1,
            circuit_breaker_config=circuit_breaker_config
        )
        yield processor
        # Cleanup
        try:
            processor.executor.shutdown(wait=False)
        except:
            pass
    
    @pytest.mark.asyncio
    async def test_file_download_and_validation(self, processor_with_storage, temp_storage, sample_ifc_content, sample_metadata):
        """Test file download and validation with local storage."""
        # Upload file to storage first
        key = "test/validation.ifc"
        await temp_storage.upload_file(
            content=sample_ifc_content,
            key=key,
            metadata=sample_metadata
        )
        
        storage_url = key  # For local storage, key is used directly
        
        # Test validation
        is_valid = await processor_with_storage.validate_file(storage_url)
        
        assert is_valid is True
    
    @pytest.mark.asyncio
    async def test_invalid_file_validation(self, processor_with_storage, temp_storage):
        """Test validation of invalid IFC file."""
        # Upload invalid content
        key = "test/invalid.ifc"
        invalid_content = b"This is not a valid IFC file"
        
        await temp_storage.upload_file(
            content=invalid_content,
            key=key,
            metadata={"original_filename": "invalid.ifc"}
        )
        
        storage_url = key
        
        # Test validation - should fail
        is_valid = await processor_with_storage.validate_file(storage_url)
        
        assert is_valid is False
    
    @pytest.mark.asyncio 
    @patch('app.services.ifc.processing.ifc_processor.ifcopenshell.open')
    async def test_processing_with_mocked_ifcopenshell(self, mock_ifcopenshell_open, processor_with_storage, temp_storage, sample_ifc_content, sample_metadata):
        """Test processing with mocked IfcOpenShell library."""
        # Mock IfcOpenShell file object
        mock_ifc_file = MagicMock()
        mock_ifc_file.schema = "IFC4"
        mock_ifc_file.by_type.side_effect = lambda element_type: {
            'IfcProject': [MagicMock(Name="Test Project")],
            'IfcBeam': [
                MagicMock(GlobalId="beam1", Name="Steel Beam 01", is_a=lambda: "IfcBeam"),
                MagicMock(GlobalId="beam2", Name="Steel Beam 02", is_a=lambda: "IfcBeam")
            ],
            'IfcColumn': [
                MagicMock(GlobalId="column1", Name="Steel Column 01", is_a=lambda: "IfcColumn")
            ],
            'IfcWall': [],
            'IfcSlab': []
        }.get(element_type, [])
        
        mock_ifcopenshell_open.return_value = mock_ifc_file
        
        # Upload file to storage
        key = "test/processing.ifc"
        await temp_storage.upload_file(
            content=sample_ifc_content,
            key=key,
            metadata=sample_metadata
        )
        
        storage_url = key
        
        # Process file
        result = await processor_with_storage.process_file(storage_url, sample_metadata)
        
        assert isinstance(result, ProcessingResult)
        assert result.status == ProcessingStatus.COMPLETED
        assert result.materials_count == 3  # 2 beams + 1 column
        assert result.error_message is None
        assert result.processing_time_seconds > 0
        assert result.extracted_data is not None
        assert "materials" in result.extracted_data
        
        materials = result.extracted_data["materials"]
        assert len(materials) == 3
        
        # Check material data structure
        beam_materials = [m for m in materials if "Beam" in m["description"]]
        column_materials = [m for m in materials if "Column" in m["description"]]
        
        assert len(beam_materials) == 2
        assert len(column_materials) == 1
        
        # Verify material properties
        for material in materials:
            assert "ifc_element_id" in material
            assert "description" in material
            assert "material_type" in material
            assert "quantity" in material
            assert "unit" in material
            assert "element_type" in material
    
    @pytest.mark.asyncio
    async def test_processing_timeout(self, processor_with_storage, temp_storage, sample_ifc_content, sample_metadata):
        """Test processing timeout handling."""
        # Create processor with very short timeout
        short_timeout_processor = IfcOpenShellProcessor(
            storage=temp_storage,
            processing_timeout_seconds=0.1,  # Very short timeout
            max_workers=1
        )
        
        try:
            # Upload file
            key = "test/timeout.ifc"
            await temp_storage.upload_file(
                content=sample_ifc_content,
                key=key,
                metadata=sample_metadata
            )
            
            # Mock ifcopenshell to take longer than timeout
            with patch('app.services.ifc.processing.ifc_processor.ifcopenshell.open') as mock_open:
                mock_open.side_effect = lambda path: time.sleep(1) or MagicMock()  # Sleep longer than timeout
                
                result = await short_timeout_processor.process_file(key, sample_metadata)
                
                assert result.status == ProcessingStatus.FAILED
                assert "timeout" in result.error_message.lower()
        finally:
            try:
                short_timeout_processor.executor.shutdown(wait=False)
            except:
                pass
    
    @pytest.mark.asyncio
    @patch('app.services.ifc.processing.ifc_processor.ifcopenshell.open')
    async def test_circuit_breaker_functionality(self, mock_ifcopenshell_open, processor_with_storage, temp_storage, sample_ifc_content, sample_metadata):
        """Test circuit breaker behavior on repeated processing failures."""
        # Mock IfcOpenShell to always fail
        mock_ifcopenshell_open.side_effect = Exception("IfcOpenShell processing error")
        
        # Upload files for testing
        keys = []
        for i in range(3):
            key = f"test/circuit_breaker_{i}.ifc"
            await temp_storage.upload_file(
                content=sample_ifc_content,
                key=key,
                metadata=sample_metadata
            )
            keys.append(key)
        
        # Cause failures to trigger circuit breaker (threshold is 2)
        for i in range(2):
            result = await processor_with_storage.process_file(keys[i], sample_metadata)
            assert result.status == ProcessingStatus.FAILED
        
        # Next call should fail due to circuit breaker (but still return a result)
        result = await processor_with_storage.process_file(keys[2], sample_metadata)
        assert result.status == ProcessingStatus.FAILED
        assert "circuit breaker" in result.error_message.lower()
    
    @pytest.mark.asyncio
    async def test_nonexistent_file_processing(self, processor_with_storage):
        """Test processing of non-existent file."""
        storage_url = "nonexistent/file.ifc"
        metadata = {"original_filename": "nonexistent.ifc"}
        
        result = await processor_with_storage.process_file(storage_url, metadata)
        
        assert result.status == ProcessingStatus.FAILED
        assert result.error_message is not None