"""
IFC Notification Module - AEC Axis

This module contains notification abstractions and implementations for IFC processing events.
"""

from .base import NotificationInterface, IFCNotificationError

__all__ = ["NotificationInterface", "IFCNotificationError"]