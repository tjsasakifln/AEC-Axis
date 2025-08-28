"""
WebSocket service for broadcasting real-time notifications in AEC Axis.

This module contains functions for broadcasting quote-related notifications
to subscribed clients through WebSocket connections.
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from app.api.websockets import ConnectionManager
from app.db.models.quote import Quote, QuoteItem


async def broadcast_quote_received(
    manager: ConnectionManager,
    rfq_id: str,
    supplier_id: str,
    quote_data: Quote,
    materials: List[QuoteItem]
) -> None:
    """
    Broadcast notification when a new quote is received.
    
    Args:
        manager: WebSocket connection manager instance
        rfq_id: RFQ identifier
        supplier_id: Supplier identifier
        quote_data: Quote database record
        materials: List of quote items with pricing
    """
    try:
        message = {
            "type": "quote_received",
            "rfq_id": rfq_id,
            "supplier_id": supplier_id,
            "quote_id": str(quote_data.id),
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "submitted_at": quote_data.created_at.isoformat() if quote_data.created_at else None,
                "items_count": len(materials),
                "total_items": len(materials)
            }
        }
        
        await manager.notify_rfq(rfq_id, message)
        
    except Exception as e:
        print(f"Error broadcasting quote received: {e}")


async def broadcast_supplier_status(
    manager: ConnectionManager,
    rfq_id: str,
    supplier_id: str,
    status: str,
    supplier_name: Optional[str] = None
) -> None:
    """
    Broadcast supplier online/offline status updates.
    
    Args:
        manager: WebSocket connection manager instance
        rfq_id: RFQ identifier
        supplier_id: Supplier identifier
        status: 'online' or 'offline'
        supplier_name: Optional supplier name for display
    """
    try:
        message = {
            "type": f"supplier_{status}",
            "rfq_id": rfq_id,
            "supplier_id": supplier_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "supplier_name": supplier_name,
                "status": status
            }
        }
        
        await manager.notify_rfq(rfq_id, message)
        
    except Exception as e:
        print(f"Error broadcasting supplier status: {e}")


async def broadcast_price_update(
    manager: ConnectionManager,
    rfq_id: str,
    material_id: str,
    old_price: float,
    new_price: float,
    supplier_id: str
) -> None:
    """
    Broadcast price update notifications for material quotes.
    
    Args:
        manager: WebSocket connection manager instance
        rfq_id: RFQ identifier
        material_id: Material identifier
        old_price: Previous price
        new_price: Updated price
        supplier_id: Supplier who updated the price
    """
    try:
        message = {
            "type": "price_update",
            "rfq_id": rfq_id,
            "material_id": material_id,
            "supplier_id": supplier_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "old_price": old_price,
                "new_price": new_price,
                "price_change": new_price - old_price,
                "price_change_percent": ((new_price - old_price) / old_price * 100) if old_price > 0 else 0
            }
        }
        
        await manager.notify_rfq(rfq_id, message)
        
    except Exception as e:
        print(f"Error broadcasting price update: {e}")


async def broadcast_deadline_warning(
    manager: ConnectionManager,
    rfq_id: str,
    hours_remaining: int,
    deadline_timestamp: str
) -> None:
    """
    Broadcast deadline warning notifications.
    
    Args:
        manager: WebSocket connection manager instance
        rfq_id: RFQ identifier
        hours_remaining: Hours left until deadline
        deadline_timestamp: ISO timestamp of deadline
    """
    try:
        urgency_level = "critical" if hours_remaining <= 2 else "warning" if hours_remaining <= 24 else "info"
        
        message = {
            "type": "deadline_warning",
            "rfq_id": rfq_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "hours_remaining": hours_remaining,
                "deadline": deadline_timestamp,
                "urgency_level": urgency_level
            }
        }
        
        await manager.notify_rfq(rfq_id, message)
        
    except Exception as e:
        print(f"Error broadcasting deadline warning: {e}")


def create_notification_message(
    notification_type: str,
    title: str,
    message: str,
    rfq_id: str,
    duration: int = 5000,
    **extra_data
) -> Dict[str, Any]:
    """
    Create a standardized notification message structure.
    
    Args:
        notification_type: Type of notification ('success', 'warning', 'info', 'error')
        title: Notification title
        message: Notification message
        rfq_id: RFQ identifier
        duration: Display duration in milliseconds
        **extra_data: Additional data to include
        
    Returns:
        Formatted notification message dictionary
    """
    return {
        "id": str(uuid.uuid4()),
        "type": notification_type,
        "title": title,
        "message": message,
        "rfq_id": rfq_id,
        "timestamp": datetime.utcnow().isoformat(),
        "duration": duration,
        "read": False,
        **extra_data
    }


async def broadcast_notification(
    manager: ConnectionManager,
    rfq_id: str,
    notification: Dict[str, Any]
) -> None:
    """
    Broadcast a notification message to RFQ subscribers.
    
    Args:
        manager: WebSocket connection manager instance
        rfq_id: RFQ identifier
        notification: Notification message dictionary
    """
    try:
        message = {
            "type": "notification",
            "rfq_id": rfq_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": notification
        }
        
        await manager.notify_rfq(rfq_id, message)
        
    except Exception as e:
        print(f"Error broadcasting notification: {e}")