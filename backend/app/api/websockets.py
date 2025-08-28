"""
WebSocket endpoints for real-time notifications in AEC Axis.

This module provides WebSocket connections for real-time updates
on IFC file processing status.
"""
import json
import uuid
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# Store active WebSocket connections by client_id
active_connections: Dict[str, WebSocket] = {}

# Store subscriptions by project_id -> set of client_ids
project_subscriptions: Dict[str, Set[str]] = {}


class ConnectionManager:
    """Manage WebSocket connections and notifications."""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.project_subscriptions: Dict[str, Set[str]] = {}
        self.rfq_subscriptions: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept a WebSocket connection and store it."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
    
    def disconnect(self, client_id: str):
        """Remove a WebSocket connection."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        # Remove from all project subscriptions
        for project_id, subscribers in self.project_subscriptions.items():
            subscribers.discard(client_id)
        
        # Remove from all RFQ subscriptions
        for rfq_id, subscribers in self.rfq_subscriptions.items():
            subscribers.discard(client_id)
    
    def subscribe_to_project(self, client_id: str, project_id: str):
        """Subscribe a client to project notifications."""
        if project_id not in self.project_subscriptions:
            self.project_subscriptions[project_id] = set()
        self.project_subscriptions[project_id].add(client_id)
    
    def subscribe_to_rfq(self, client_id: str, rfq_id: str):
        """Subscribe a client to RFQ-specific notifications."""
        if rfq_id not in self.rfq_subscriptions:
            self.rfq_subscriptions[rfq_id] = set()
        self.rfq_subscriptions[rfq_id].add(client_id)
    
    async def notify_project(self, project_id: str, message: dict):
        """Send a notification to all clients subscribed to a project."""
        if project_id in self.project_subscriptions:
            subscribers = self.project_subscriptions[project_id].copy()
            for client_id in subscribers:
                if client_id in self.active_connections:
                    try:
                        websocket = self.active_connections[client_id]
                        await websocket.send_text(json.dumps(message))
                    except Exception:
                        # Connection is broken, remove it
                        self.disconnect(client_id)
    
    async def notify_rfq(self, rfq_id: str, message: dict):
        """Send a notification to all clients subscribed to a specific RFQ."""
        if rfq_id in self.rfq_subscriptions:
            subscribers = self.rfq_subscriptions[rfq_id].copy()
            for client_id in subscribers:
                if client_id in self.active_connections:
                    try:
                        websocket = self.active_connections[client_id]
                        await websocket.send_text(json.dumps(message))
                    except Exception:
                        # Connection is broken, remove it
                        self.disconnect(client_id)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time notifications.
    
    Args:
        websocket: The WebSocket connection
        client_id: Unique identifier for the client connection
    """
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # Listen for messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle subscription requests
            if message.get("type") == "subscribe" and message.get("project_id"):
                project_id = message["project_id"]
                manager.subscribe_to_project(client_id, project_id)
                await websocket.send_text(json.dumps({
                    "type": "subscribed",
                    "project_id": project_id
                }))
            elif message.get("type") == "subscribe_rfq" and message.get("rfq_id"):
                rfq_id = message["rfq_id"]
                manager.subscribe_to_rfq(client_id, rfq_id)
                await websocket.send_text(json.dumps({
                    "type": "subscribed_rfq",
                    "rfq_id": rfq_id
                }))
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        print(f"WebSocket error for client {client_id}: {e}")
        manager.disconnect(client_id)


async def notify_ifc_status_update(project_id: str, ifc_file_id: str, status: str, filename: str):
    """
    Send IFC file status update notification to subscribed clients.
    
    Args:
        project_id: ID of the project containing the IFC file
        ifc_file_id: ID of the IFC file that was updated
        status: New status of the IFC file
        filename: Name of the IFC file
    """
    message = {
        "type": "ifc_status_update",
        "project_id": project_id,
        "ifc_file_id": ifc_file_id,
        "status": status,
        "filename": filename,
        "timestamp": uuid.uuid4().hex
    }
    
    await manager.notify_project(project_id, message)