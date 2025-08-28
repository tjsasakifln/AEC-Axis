"""
IFC Storage Module - AEC Axis

This module contains storage abstractions and implementations for IFC files.
"""

from .base import IFCStorageInterface, UploadResult, IFCStorageError

__all__ = ["IFCStorageInterface", "UploadResult", "IFCStorageError"]