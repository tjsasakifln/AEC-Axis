"""
IFC Processing Module - AEC Axis

This module contains processing abstractions and implementations for IFC files.
"""

from .base import IFCProcessorInterface, ProcessingResult, ProcessingStatus, IFCProcessingError

__all__ = ["IFCProcessorInterface", "ProcessingResult", "ProcessingStatus", "IFCProcessingError"]