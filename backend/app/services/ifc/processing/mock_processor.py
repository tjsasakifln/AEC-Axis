"""
Mock Processor Implementation for IFC Files - AEC Axis

This module implements a mock IFC processor for unit testing with configurable
delays, failures, and realistic processing simulation.
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, List
from enum import Enum

from .base import IFCProcessorInterface, ProcessingResult, ProcessingStatus, IFCProcessingError


logger = logging.getLogger(__name__)


class MockBehavior(Enum):
    """Mock behavior configuration."""
    SUCCESS = "success"
    FAILURE = "failure"
    TIMEOUT = "timeout"
    SLOW_SUCCESS = "slow_success"


class MockIFCProcessor(IFCProcessorInterface):
    """
    Mock implementation of IFC processor for testing.
    
    Features:
    - Configurable processing behavior (success, failure, timeout)
    - Realistic processing delays for performance testing
    - Controllable outcomes for test scenarios
    - Same interface as real processor
    """
    
    def __init__(
        self,
        behavior: MockBehavior = MockBehavior.SUCCESS,
        processing_delay_seconds: float = 0.1,
        materials_count: int = 5,
        should_fail: bool = False,
        failure_message: str = "Mock processing failure",
        timeout_seconds: Optional[float] = None
    ):
        """
        Initialize mock processor with configurable behavior.
        
        Args:
            behavior: Mock behavior type
            processing_delay_seconds: Simulated processing delay
            materials_count: Number of materials to return on success
            should_fail: Whether to fail processing
            failure_message: Error message for failures
            timeout_seconds: If set, will timeout after this duration
        """
        self.behavior = behavior
        self.processing_delay_seconds = processing_delay_seconds
        self.materials_count = materials_count
        self.should_fail = should_fail
        self.failure_message = failure_message
        self.timeout_seconds = timeout_seconds
        
        logger.info(f"Initialized MockIFCProcessor: behavior={behavior.value}, delay={processing_delay_seconds}s")
    
    async def process_file(self, storage_url: str, file_metadata: Dict[str, str]) -> ProcessingResult:
        """
        Mock process an IFC file with configurable behavior.
        
        Args:
            storage_url: URL or path to the IFC file (ignored in mock)
            file_metadata: Additional metadata about the file
            
        Returns:
            ProcessingResult based on configured behavior
            
        Raises:
            IFCProcessingError: If configured to fail
        """
        logger.info(f"Mock processing file: {storage_url} (behavior: {self.behavior.value})")
        start_time = time.time()
        
        try:
            # Simulate processing behavior based on configuration
            if self.behavior == MockBehavior.FAILURE or self.should_fail:
                await asyncio.sleep(self.processing_delay_seconds)
                processing_time = time.time() - start_time
                
                logger.info(f"Mock processing failed: {self.failure_message}")
                return ProcessingResult(
                    status=ProcessingStatus.FAILED,
                    materials_count=0,
                    error_message=self.failure_message,
                    processing_time_seconds=processing_time
                )
            
            elif self.behavior == MockBehavior.TIMEOUT:
                # Simulate timeout by sleeping longer than expected
                timeout_duration = self.timeout_seconds or 10.0
                await asyncio.sleep(timeout_duration)
                
                # This code should not be reached in timeout scenarios
                processing_time = time.time() - start_time
                return ProcessingResult(
                    status=ProcessingStatus.FAILED,
                    materials_count=0,
                    error_message="Processing timeout",
                    processing_time_seconds=processing_time
                )
            
            elif self.behavior == MockBehavior.SLOW_SUCCESS:
                # Simulate slow but successful processing
                slow_delay = max(self.processing_delay_seconds, 2.0)  # At least 2 seconds
                await asyncio.sleep(slow_delay)
                
                processing_time = time.time() - start_time
                materials_data = self._generate_mock_materials(storage_url, file_metadata)
                
                logger.info(f"Mock slow processing completed: {len(materials_data)} materials in {processing_time:.2f}s")
                return ProcessingResult(
                    status=ProcessingStatus.COMPLETED,
                    materials_count=len(materials_data),
                    processing_time_seconds=processing_time,
                    extracted_data={"materials": materials_data}
                )
            
            else:  # SUCCESS
                # Simulate normal successful processing
                await asyncio.sleep(self.processing_delay_seconds)
                
                processing_time = time.time() - start_time
                materials_data = self._generate_mock_materials(storage_url, file_metadata)
                
                logger.info(f"Mock processing completed: {len(materials_data)} materials in {processing_time:.2f}s")
                return ProcessingResult(
                    status=ProcessingStatus.COMPLETED,
                    materials_count=len(materials_data),
                    processing_time_seconds=processing_time,
                    extracted_data={"materials": materials_data}
                )
                
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Mock processing error: {str(e)}")
            
            return ProcessingResult(
                status=ProcessingStatus.FAILED,
                materials_count=0,
                error_message=f"Mock processing error: {str(e)}",
                processing_time_seconds=processing_time
            )
    
    def _generate_mock_materials(self, storage_url: str, file_metadata: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Generate realistic mock material data.
        
        Args:
            storage_url: Storage URL for context
            file_metadata: File metadata for context
            
        Returns:
            List of mock material data
        """
        materials = []
        
        # Generate realistic materials for logistics warehouse
        mock_materials = [
            {"type": "Steel Beam", "base_quantity": 150, "unit": "kg"},
            {"type": "Steel Column", "base_quantity": 200, "unit": "kg"},
            {"type": "Precast Concrete Panel", "base_quantity": 2.5, "unit": "m³"},
            {"type": "Precast Concrete Slab", "base_quantity": 5.0, "unit": "m³"},
            {"type": "Steel Connection", "base_quantity": 50, "unit": "kg"},
            {"type": "Concrete Foundation", "base_quantity": 10.0, "unit": "m³"},
            {"type": "Metal Roofing", "base_quantity": 100, "unit": "m²"},
            {"type": "Insulation Panel", "base_quantity": 150, "unit": "m²"}
        ]
        
        # Generate the requested number of materials
        for i in range(min(self.materials_count, len(mock_materials))):
            material = mock_materials[i]
            
            materials.append({
                'ifc_element_id': f"mock_element_{i+1}",
                'description': f"{material['type']} - Mock Element {i+1}",
                'material_type': material['type'],
                'quantity': material['base_quantity'] + (i * 10),  # Vary quantities
                'unit': material['unit'],
                'element_type': f"Ifc{material['type'].replace(' ', '')}"
            })
        
        return materials
    
    async def validate_file(self, storage_url: str) -> bool:
        """
        Mock validate that a file is a valid IFC file.
        
        Args:
            storage_url: URL or path to the IFC file (ignored in mock)
            
        Returns:
            Always True unless configured to fail validation
        """
        logger.info(f"Mock validating IFC file: {storage_url}")
        
        # Simulate validation delay
        await asyncio.sleep(0.05)  # Very short delay for validation
        
        # Fail validation if configured for failure
        if self.behavior == MockBehavior.FAILURE or self.should_fail:
            logger.info("Mock validation failed")
            return False
        
        logger.info("Mock validation passed")
        return True
    
    def configure_behavior(
        self,
        behavior: MockBehavior,
        processing_delay_seconds: Optional[float] = None,
        materials_count: Optional[int] = None,
        should_fail: Optional[bool] = None,
        failure_message: Optional[str] = None
    ):
        """
        Update mock processor configuration at runtime.
        
        Args:
            behavior: New behavior type
            processing_delay_seconds: New processing delay
            materials_count: New materials count
            should_fail: New failure flag
            failure_message: New failure message
        """
        self.behavior = behavior
        
        if processing_delay_seconds is not None:
            self.processing_delay_seconds = processing_delay_seconds
        if materials_count is not None:
            self.materials_count = materials_count
        if should_fail is not None:
            self.should_fail = should_fail
        if failure_message is not None:
            self.failure_message = failure_message
        
        logger.info(f"Updated mock processor configuration: behavior={behavior.value}")
    
    def simulate_circuit_breaker_failure(self):
        """Simulate a failure that would trigger circuit breaker."""
        self.configure_behavior(
            behavior=MockBehavior.FAILURE,
            failure_message="Simulated circuit breaker failure"
        )
    
    def simulate_performance_test_scenario(self):
        """Configure for performance testing with realistic delays."""
        self.configure_behavior(
            behavior=MockBehavior.SLOW_SUCCESS,
            processing_delay_seconds=1.0,  # 1 second processing time
            materials_count=20  # More materials for realistic test
        )
    
    def simulate_large_file_scenario(self):
        """Configure for large file processing simulation."""
        self.configure_behavior(
            behavior=MockBehavior.SLOW_SUCCESS,
            processing_delay_seconds=3.0,  # 3 seconds for large file
            materials_count=100  # Many materials for large file
        )
    
    def reset_to_default(self):
        """Reset to default successful behavior."""
        self.configure_behavior(
            behavior=MockBehavior.SUCCESS,
            processing_delay_seconds=0.1,
            materials_count=5,
            should_fail=False,
            failure_message="Mock processing failure"
        )