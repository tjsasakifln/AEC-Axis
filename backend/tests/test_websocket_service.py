"""
Tests for WebSocket service broadcasting functionality.
"""
import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from app.services.websocket_service import (
    broadcast_quote_received,
    broadcast_supplier_status,
    broadcast_price_update,
    broadcast_deadline_warning,
    broadcast_notification,
    create_notification_message
)
from app.api.websockets import ConnectionManager
from app.db.models.quote import Quote, QuoteItem
from app.db.models.supplier import Supplier
from app.db.models.company import Company


@pytest.fixture
def mock_connection_manager():
    """Mock ConnectionManager for testing"""
    manager = Mock(spec=ConnectionManager)
    manager.notify_rfq = AsyncMock()
    manager.active_connections = {}
    manager.rfq_subscriptions = {}
    return manager


@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection"""
    websocket = Mock()
    websocket.send_text = AsyncMock()
    return websocket


@pytest.fixture
def sample_quote_data(db_session):
    """Create sample quote data for testing"""
    # Create company
    company = Company(
        name="Test Company",
        cnpj="12.345.678/0001-90"
    )
    db_session.add(company)
    db_session.commit()
    
    # Create supplier
    supplier = Supplier(
        name="Test Supplier",
        cnpj="98.765.432/0001-10",
        email="supplier@test.com",
        company_id=company.id
    )
    db_session.add(supplier)
    db_session.commit()
    
    # Create quote
    quote = Quote(
        rfq_id="test-rfq-123",
        supplier_id=supplier.id,
        access_token_jti="test-jti-456"
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)
    
    # Create quote items
    quote_items = [
        QuoteItem(
            quote_id=quote.id,
            rfq_item_id="item-1",
            price=100.00,
            lead_time_days=10
        ),
        QuoteItem(
            quote_id=quote.id,
            rfq_item_id="item-2",
            price=200.00,
            lead_time_days=15
        )
    ]
    
    for item in quote_items:
        db_session.add(item)
    db_session.commit()
    
    return {
        'quote': quote,
        'supplier': supplier,
        'quote_items': quote_items
    }


class TestBroadcastQuoteReceived:
    """Test quote received broadcasting"""
    
    @pytest.mark.asyncio
    async def test_broadcast_quote_received_success(self, mock_connection_manager, sample_quote_data):
        """Test successful quote received broadcast"""
        quote_data = sample_quote_data['quote']
        quote_items = sample_quote_data['quote_items']
        supplier_id = str(sample_quote_data['supplier'].id)
        rfq_id = "test-rfq-123"
        
        await broadcast_quote_received(
            manager=mock_connection_manager,
            rfq_id=rfq_id,
            supplier_id=supplier_id,
            quote_data=quote_data,
            materials=quote_items
        )
        
        # Verify notify_rfq was called
        mock_connection_manager.notify_rfq.assert_called_once()
        
        # Get the call arguments
        call_args = mock_connection_manager.notify_rfq.call_args
        broadcast_rfq_id = call_args[0][0]
        message = call_args[0][1]
        
        # Verify correct RFQ ID
        assert broadcast_rfq_id == rfq_id
        
        # Verify message structure
        assert message["type"] == "quote_received"
        assert message["rfq_id"] == rfq_id
        assert message["supplier_id"] == supplier_id
        assert message["quote_id"] == str(quote_data.id)
        assert "timestamp" in message
        assert message["data"]["items_count"] == 2
        assert message["data"]["total_items"] == 2

    @pytest.mark.asyncio
    async def test_broadcast_quote_received_error_handling(self, mock_connection_manager, sample_quote_data):
        """Test error handling in quote received broadcast"""
        # Make notify_rfq raise an exception
        mock_connection_manager.notify_rfq.side_effect = Exception("WebSocket error")
        
        quote_data = sample_quote_data['quote']
        quote_items = sample_quote_data['quote_items']
        
        # Should not raise exception, just log error
        with patch('builtins.print') as mock_print:
            await broadcast_quote_received(
                manager=mock_connection_manager,
                rfq_id="test-rfq-123",
                supplier_id="test-supplier",
                quote_data=quote_data,
                materials=quote_items
            )
            
            # Verify error was logged
            mock_print.assert_called_once()
            assert "Error broadcasting quote received" in str(mock_print.call_args)


class TestBroadcastSupplierStatus:
    """Test supplier status broadcasting"""
    
    @pytest.mark.asyncio
    async def test_broadcast_supplier_online(self, mock_connection_manager):
        """Test supplier online status broadcast"""
        rfq_id = "test-rfq-123"
        supplier_id = "test-supplier-456"
        supplier_name = "Test Supplier"
        
        await broadcast_supplier_status(
            manager=mock_connection_manager,
            rfq_id=rfq_id,
            supplier_id=supplier_id,
            status="online",
            supplier_name=supplier_name
        )
        
        # Verify notify_rfq was called
        mock_connection_manager.notify_rfq.assert_called_once()
        
        # Get the message
        call_args = mock_connection_manager.notify_rfq.call_args
        message = call_args[0][1]
        
        assert message["type"] == "supplier_online"
        assert message["rfq_id"] == rfq_id
        assert message["supplier_id"] == supplier_id
        assert message["data"]["supplier_name"] == supplier_name
        assert message["data"]["status"] == "online"

    @pytest.mark.asyncio
    async def test_broadcast_supplier_offline(self, mock_connection_manager):
        """Test supplier offline status broadcast"""
        await broadcast_supplier_status(
            manager=mock_connection_manager,
            rfq_id="test-rfq-123",
            supplier_id="test-supplier-456",
            status="offline"
        )
        
        # Get the message
        call_args = mock_connection_manager.notify_rfq.call_args
        message = call_args[0][1]
        
        assert message["type"] == "supplier_offline"
        assert message["data"]["status"] == "offline"


class TestBroadcastPriceUpdate:
    """Test price update broadcasting"""
    
    @pytest.mark.asyncio
    async def test_broadcast_price_update(self, mock_connection_manager):
        """Test price update broadcast"""
        rfq_id = "test-rfq-123"
        material_id = "test-material-789"
        old_price = 100.0
        new_price = 85.0
        supplier_id = "test-supplier-456"
        
        await broadcast_price_update(
            manager=mock_connection_manager,
            rfq_id=rfq_id,
            material_id=material_id,
            old_price=old_price,
            new_price=new_price,
            supplier_id=supplier_id
        )
        
        # Get the message
        call_args = mock_connection_manager.notify_rfq.call_args
        message = call_args[0][1]
        
        assert message["type"] == "price_update"
        assert message["rfq_id"] == rfq_id
        assert message["material_id"] == material_id
        assert message["supplier_id"] == supplier_id
        assert message["data"]["old_price"] == old_price
        assert message["data"]["new_price"] == new_price
        assert message["data"]["price_change"] == -15.0
        assert message["data"]["price_change_percent"] == -15.0

    @pytest.mark.asyncio
    async def test_broadcast_price_update_zero_old_price(self, mock_connection_manager):
        """Test price update with zero old price"""
        await broadcast_price_update(
            manager=mock_connection_manager,
            rfq_id="test-rfq-123",
            material_id="test-material-789",
            old_price=0.0,
            new_price=50.0,
            supplier_id="test-supplier-456"
        )
        
        call_args = mock_connection_manager.notify_rfq.call_args
        message = call_args[0][1]
        
        # Should handle division by zero
        assert message["data"]["price_change_percent"] == 0


class TestBroadcastDeadlineWarning:
    """Test deadline warning broadcasting"""
    
    @pytest.mark.asyncio
    async def test_broadcast_deadline_critical(self, mock_connection_manager):
        """Test critical deadline warning"""
        await broadcast_deadline_warning(
            manager=mock_connection_manager,
            rfq_id="test-rfq-123",
            hours_remaining=1,
            deadline_timestamp="2024-01-01T10:00:00Z"
        )
        
        call_args = mock_connection_manager.notify_rfq.call_args
        message = call_args[0][1]
        
        assert message["type"] == "deadline_warning"
        assert message["data"]["hours_remaining"] == 1
        assert message["data"]["urgency_level"] == "critical"

    @pytest.mark.asyncio
    async def test_broadcast_deadline_warning_level(self, mock_connection_manager):
        """Test warning deadline level"""
        await broadcast_deadline_warning(
            manager=mock_connection_manager,
            rfq_id="test-rfq-123",
            hours_remaining=12,
            deadline_timestamp="2024-01-01T10:00:00Z"
        )
        
        call_args = mock_connection_manager.notify_rfq.call_args
        message = call_args[0][1]
        
        assert message["data"]["urgency_level"] == "warning"

    @pytest.mark.asyncio
    async def test_broadcast_deadline_info_level(self, mock_connection_manager):
        """Test info deadline level"""
        await broadcast_deadline_warning(
            manager=mock_connection_manager,
            rfq_id="test-rfq-123",
            hours_remaining=48,
            deadline_timestamp="2024-01-01T10:00:00Z"
        )
        
        call_args = mock_connection_manager.notify_rfq.call_args
        message = call_args[0][1]
        
        assert message["data"]["urgency_level"] == "info"


class TestCreateNotificationMessage:
    """Test notification message creation"""
    
    def test_create_notification_message_basic(self):
        """Test basic notification message creation"""
        message = create_notification_message(
            notification_type="success",
            title="Test Title",
            message="Test Message",
            rfq_id="test-rfq-123"
        )
        
        assert message["type"] == "success"
        assert message["title"] == "Test Title"
        assert message["message"] == "Test Message"
        assert message["rfq_id"] == "test-rfq-123"
        assert message["duration"] == 5000
        assert message["read"] is False
        assert "id" in message
        assert "timestamp" in message

    def test_create_notification_message_with_extras(self):
        """Test notification message with extra data"""
        message = create_notification_message(
            notification_type="warning",
            title="Warning Title",
            message="Warning Message",
            rfq_id="test-rfq-456",
            duration=8000,
            supplier_id="supplier-123",
            custom_field="custom_value"
        )
        
        assert message["type"] == "warning"
        assert message["duration"] == 8000
        assert message["supplier_id"] == "supplier-123"
        assert message["custom_field"] == "custom_value"


class TestBroadcastNotification:
    """Test generic notification broadcasting"""
    
    @pytest.mark.asyncio
    async def test_broadcast_notification(self, mock_connection_manager):
        """Test notification broadcast"""
        notification = {
            "id": "notif-123",
            "type": "info",
            "title": "Test Notification",
            "message": "Test message",
            "timestamp": datetime.utcnow().isoformat(),
            "duration": 5000,
            "read": False
        }
        
        await broadcast_notification(
            manager=mock_connection_manager,
            rfq_id="test-rfq-123",
            notification=notification
        )
        
        call_args = mock_connection_manager.notify_rfq.call_args
        message = call_args[0][1]
        
        assert message["type"] == "notification"
        assert message["rfq_id"] == "test-rfq-123"
        assert message["data"] == notification


class TestRFQSubscription:
    """Test RFQ-specific subscription management"""
    
    def test_rfq_subscription_management(self):
        """Test RFQ subscription management"""
        manager = ConnectionManager()
        client_id = "client-123"
        rfq_id = "rfq-456"
        
        # Test subscription
        manager.subscribe_to_rfq(client_id, rfq_id)
        
        assert rfq_id in manager.rfq_subscriptions
        assert client_id in manager.rfq_subscriptions[rfq_id]

    def test_multiple_rfq_subscriptions(self):
        """Test multiple RFQ subscriptions"""
        manager = ConnectionManager()
        
        # Subscribe same client to multiple RFQs
        manager.subscribe_to_rfq("client-1", "rfq-1")
        manager.subscribe_to_rfq("client-1", "rfq-2")
        manager.subscribe_to_rfq("client-2", "rfq-1")
        
        assert "client-1" in manager.rfq_subscriptions["rfq-1"]
        assert "client-1" in manager.rfq_subscriptions["rfq-2"]
        assert "client-2" in manager.rfq_subscriptions["rfq-1"]
        assert len(manager.rfq_subscriptions["rfq-1"]) == 2

    def test_disconnect_cleans_rfq_subscriptions(self):
        """Test that disconnect cleans up RFQ subscriptions"""
        manager = ConnectionManager()
        client_id = "client-123"
        
        # Subscribe to multiple RFQs
        manager.subscribe_to_rfq(client_id, "rfq-1")
        manager.subscribe_to_rfq(client_id, "rfq-2")
        
        # Add to active connections (simulate connection)
        mock_websocket = Mock()
        manager.active_connections[client_id] = mock_websocket
        
        # Disconnect should clean up all subscriptions
        manager.disconnect(client_id)
        
        # Verify cleanup
        assert client_id not in manager.active_connections
        assert client_id not in manager.rfq_subscriptions.get("rfq-1", set())
        assert client_id not in manager.rfq_subscriptions.get("rfq-2", set())

    @pytest.mark.asyncio
    async def test_notify_rfq_with_subscriptions(self):
        """Test RFQ notification with active subscriptions"""
        manager = ConnectionManager()
        
        # Setup mock WebSocket connections
        mock_ws1 = Mock()
        mock_ws1.send_text = AsyncMock()
        mock_ws2 = Mock()
        mock_ws2.send_text = AsyncMock()
        
        manager.active_connections = {
            "client-1": mock_ws1,
            "client-2": mock_ws2
        }
        
        # Subscribe both clients to same RFQ
        manager.subscribe_to_rfq("client-1", "rfq-123")
        manager.subscribe_to_rfq("client-2", "rfq-123")
        
        # Send notification
        test_message = {"type": "test", "data": "test"}
        await manager.notify_rfq("rfq-123", test_message)
        
        # Verify both clients received the message
        mock_ws1.send_text.assert_called_once_with(json.dumps(test_message))
        mock_ws2.send_text.assert_called_once_with(json.dumps(test_message))

    @pytest.mark.asyncio
    async def test_notify_rfq_with_broken_connection(self):
        """Test RFQ notification handles broken connections"""
        manager = ConnectionManager()
        
        # Setup mock WebSocket with broken connection
        mock_ws_broken = Mock()
        mock_ws_broken.send_text = AsyncMock(side_effect=Exception("Connection broken"))
        
        mock_ws_good = Mock()
        mock_ws_good.send_text = AsyncMock()
        
        manager.active_connections = {
            "client-broken": mock_ws_broken,
            "client-good": mock_ws_good
        }
        
        # Subscribe both to RFQ
        manager.subscribe_to_rfq("client-broken", "rfq-123")
        manager.subscribe_to_rfq("client-good", "rfq-123")
        
        # Send notification
        test_message = {"type": "test", "data": "test"}
        await manager.notify_rfq("rfq-123", test_message)
        
        # Good connection should receive message
        mock_ws_good.send_text.assert_called_once()
        
        # Broken connection should be cleaned up
        assert "client-broken" not in manager.active_connections