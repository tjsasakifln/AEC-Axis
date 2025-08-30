"""
Tests for cache service functionality.

This module contains comprehensive tests for the Redis cache service,
including fallback behavior and cache key management.
"""
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.cache_service import (
    RedisCacheService,
    NoOpCacheService,
    CacheKeyBuilder,
    get_cache_service
)


class TestCacheKeyBuilder:
    """Test cache key building functionality."""

    def test_projects_list_basic(self):
        """Test basic projects list cache key generation."""
        key = CacheKeyBuilder.projects_list("company-123", page=1)
        assert key == "projects:company:company-123:page:1"

    def test_projects_list_with_search(self):
        """Test projects list cache key with search parameter."""
        key = CacheKeyBuilder.projects_list("company-123", page=2, search="warehouse")
        # Should contain search hash
        assert key.startswith("projects:company:company-123:page:2:search:")
        assert len(key.split(":")[-1]) == 8  # MD5 hash first 8 chars

    def test_projects_list_with_status(self):
        """Test projects list cache key with status filter."""
        key = CacheKeyBuilder.projects_list("company-123", page=1, status="OPEN")
        assert key == "projects:company:company-123:page:1:status:OPEN"

    def test_projects_list_with_all_params(self):
        """Test projects list cache key with all parameters."""
        key = CacheKeyBuilder.projects_list("company-123", page=3, search="test", status="CLOSED")
        parts = key.split(":")
        assert parts[0] == "projects"
        assert parts[1] == "company"
        assert parts[2] == "company-123"
        assert parts[3] == "page"
        assert parts[4] == "3"
        assert "search" in parts
        assert "status" in parts
        assert "CLOSED" in parts

    def test_projects_pattern(self):
        """Test projects pattern for cache invalidation."""
        pattern = CacheKeyBuilder.projects_pattern("company-123")
        assert pattern == "projects:company:company-123:*"

    def test_materials_list(self):
        """Test materials list cache key generation."""
        key = CacheKeyBuilder.materials_list("ifc-456")
        assert key == "materials:ifc:ifc-456"

    def test_materials_pattern(self):
        """Test materials pattern for cache invalidation."""
        pattern = CacheKeyBuilder.materials_pattern("ifc-456")
        assert pattern == "materials:ifc:ifc-456*"

    def test_suppliers_list(self):
        """Test suppliers list cache key generation."""
        key = CacheKeyBuilder.suppliers_list("company-789")
        assert key == "suppliers:company:company-789"

    def test_suppliers_pattern(self):
        """Test suppliers pattern for cache invalidation."""
        pattern = CacheKeyBuilder.suppliers_pattern("company-789")
        assert pattern == "suppliers:company:company-789*"

    def test_project_detail(self):
        """Test project detail cache key generation."""
        key = CacheKeyBuilder.project_detail("project-123")
        assert key == "project:detail:project-123"

    def test_supplier_detail(self):
        """Test supplier detail cache key generation."""
        key = CacheKeyBuilder.supplier_detail("supplier-456")
        assert key == "supplier:detail:supplier-456"


class TestNoOpCacheService:
    """Test NoOp cache service implementation."""

    @pytest.fixture
    def cache_service(self):
        """Create NoOp cache service instance."""
        return NoOpCacheService()

    @pytest.mark.asyncio
    async def test_get_returns_none(self, cache_service):
        """Test that get always returns None."""
        result = await cache_service.get("test-key")
        assert result is None

    @pytest.mark.asyncio
    async def test_set_returns_true(self, cache_service):
        """Test that set always returns True."""
        result = await cache_service.set("test-key", "test-value")
        assert result is True

    @pytest.mark.asyncio
    async def test_set_with_ttl_returns_true(self, cache_service):
        """Test that set with TTL always returns True."""
        result = await cache_service.set("test-key", "test-value", ttl_seconds=300)
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_returns_true(self, cache_service):
        """Test that delete always returns True."""
        result = await cache_service.delete("test-key")
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_pattern_returns_zero(self, cache_service):
        """Test that delete_pattern always returns 0."""
        result = await cache_service.delete_pattern("test-pattern*")
        assert result == 0

    @pytest.mark.asyncio
    async def test_clear_all_returns_true(self, cache_service):
        """Test that clear_all always returns True."""
        result = await cache_service.clear_all()
        assert result is True

    @pytest.mark.asyncio
    async def test_exists_returns_false(self, cache_service):
        """Test that exists always returns False."""
        result = await cache_service.exists("test-key")
        assert result is False

    @pytest.mark.asyncio
    async def test_get_ttl_returns_none(self, cache_service):
        """Test that get_ttl always returns None."""
        result = await cache_service.get_ttl("test-key")
        assert result is None


class TestRedisCacheService:
    """Test Redis cache service implementation."""

    @pytest.fixture
    def mock_redis(self):
        """Create mock Redis instance."""
        mock = AsyncMock()
        mock.ping = AsyncMock()
        mock.get = AsyncMock()
        mock.setex = AsyncMock()
        mock.delete = AsyncMock()
        mock.keys = AsyncMock()
        mock.exists = AsyncMock()
        mock.ttl = AsyncMock()
        mock.flushdb = AsyncMock()
        mock.info = AsyncMock()
        return mock

    @pytest.fixture
    def cache_service(self):
        """Create Redis cache service instance."""
        with patch.dict('os.environ', {'REDIS_URL': 'redis://localhost:6379/0'}):
            return RedisCacheService()

    @pytest.mark.asyncio
    async def test_connection_success(self, cache_service, mock_redis):
        """Test successful Redis connection."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            
            connection = await cache_service._get_connection()
            
            assert connection is not None
            assert cache_service._connected is True
            mock_redis.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_connection_failure(self, cache_service):
        """Test Redis connection failure."""
        with patch('redis.asyncio.from_url', side_effect=Exception("Connection failed")):
            connection = await cache_service._get_connection()
            
            assert connection is None
            assert cache_service._connected is False

    @pytest.mark.asyncio
    async def test_get_success_json(self, cache_service, mock_redis):
        """Test successful get with JSON deserialization."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.get.return_value = '{"key": "value"}'
            
            result = await cache_service.get("test-key")
            
            assert result == {"key": "value"}
            mock_redis.get.assert_called_once_with("test-key")

    @pytest.mark.asyncio
    async def test_get_success_string(self, cache_service, mock_redis):
        """Test successful get with string value."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.get.return_value = 'simple string'
            
            result = await cache_service.get("test-key")
            
            assert result == "simple string"

    @pytest.mark.asyncio
    async def test_get_miss(self, cache_service, mock_redis):
        """Test cache miss (key not found)."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.get.return_value = None
            
            result = await cache_service.get("test-key")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_redis_unavailable(self, cache_service):
        """Test get when Redis is unavailable."""
        with patch('redis.asyncio.from_url', side_effect=Exception("Connection failed")):
            result = await cache_service.get("test-key")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_set_success_dict(self, cache_service, mock_redis):
        """Test successful set with dictionary value."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            
            result = await cache_service.set("test-key", {"key": "value"}, ttl_seconds=300)
            
            assert result is True
            mock_redis.setex.assert_called_once_with("test-key", 300, '{"key": "value"}')

    @pytest.mark.asyncio
    async def test_set_success_string(self, cache_service, mock_redis):
        """Test successful set with string value."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            
            result = await cache_service.set("test-key", "string value")
            
            assert result is True
            # Should use default TTL
            mock_redis.setex.assert_called_once_with("test-key", 900, "string value")

    @pytest.mark.asyncio
    async def test_set_redis_error(self, cache_service, mock_redis):
        """Test set with Redis error."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.setex.side_effect = Exception("Redis error")
            
            result = await cache_service.set("test-key", "value")
            
            assert result is False

    @pytest.mark.asyncio
    async def test_delete_success(self, cache_service, mock_redis):
        """Test successful delete."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.delete.return_value = 1
            
            result = await cache_service.delete("test-key")
            
            assert result is True
            mock_redis.delete.assert_called_once_with("test-key")

    @pytest.mark.asyncio
    async def test_delete_key_not_found(self, cache_service, mock_redis):
        """Test delete when key doesn't exist."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.delete.return_value = 0
            
            result = await cache_service.delete("test-key")
            
            assert result is False

    @pytest.mark.asyncio
    async def test_delete_pattern_success(self, cache_service, mock_redis):
        """Test successful pattern deletion."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.keys.return_value = ["key1", "key2", "key3"]
            mock_redis.delete.return_value = 3
            
            result = await cache_service.delete_pattern("test-pattern*")
            
            assert result == 3
            mock_redis.keys.assert_called_once_with("test-pattern*")
            mock_redis.delete.assert_called_once_with("key1", "key2", "key3")

    @pytest.mark.asyncio
    async def test_delete_pattern_no_keys(self, cache_service, mock_redis):
        """Test pattern deletion when no keys match."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.keys.return_value = []
            
            result = await cache_service.delete_pattern("test-pattern*")
            
            assert result == 0

    @pytest.mark.asyncio
    async def test_exists_true(self, cache_service, mock_redis):
        """Test exists when key exists."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.exists.return_value = 1
            
            result = await cache_service.exists("test-key")
            
            assert result is True

    @pytest.mark.asyncio
    async def test_exists_false(self, cache_service, mock_redis):
        """Test exists when key doesn't exist."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.exists.return_value = 0
            
            result = await cache_service.exists("test-key")
            
            assert result is False

    @pytest.mark.asyncio
    async def test_get_ttl_success(self, cache_service, mock_redis):
        """Test get TTL when key has TTL."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.ttl.return_value = 300
            
            result = await cache_service.get_ttl("test-key")
            
            assert result == 300

    @pytest.mark.asyncio
    async def test_get_ttl_no_ttl(self, cache_service, mock_redis):
        """Test get TTL when key has no TTL."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.ttl.return_value = -1
            
            result = await cache_service.get_ttl("test-key")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_clear_all(self, cache_service, mock_redis):
        """Test clear all keys."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            
            result = await cache_service.clear_all()
            
            assert result is True
            mock_redis.flushdb.assert_called_once()

    @pytest.mark.asyncio
    async def test_health_check_success(self, cache_service, mock_redis):
        """Test health check when Redis is healthy."""
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            mock_redis.ping.return_value = True
            mock_redis.info.return_value = {
                'redis_version': '7.0.0',
                'connected_clients': 5,
                'used_memory_human': '1.2M'
            }
            
            health = await cache_service.health_check()
            
            assert health['redis_available'] is True
            assert health['connected'] is True
            assert health['ping'] is True
            assert health['redis_version'] == '7.0.0'
            assert health['connected_clients'] == 5
            assert health['used_memory_human'] == '1.2M'

    @pytest.mark.asyncio
    async def test_health_check_failure(self, cache_service):
        """Test health check when Redis is unavailable."""
        with patch('redis.asyncio.from_url', side_effect=Exception("Connection failed")):
            health = await cache_service.health_check()
            
            assert health['redis_available'] is True  # aioredis is available
            assert health['connected'] is False
            assert health['ping'] is False


@pytest.mark.asyncio
async def test_get_cache_service_redis_available():
    """Test get_cache_service when Redis is available."""
    # Reset global cache service
    import app.services.cache_service
    app.services.cache_service._cache_service = None
    
    with patch('app.services.cache_service.REDIS_AVAILABLE', True):
        service = await get_cache_service()
        assert isinstance(service, RedisCacheService)


@pytest.mark.asyncio 
async def test_get_cache_service_redis_unavailable():
    """Test get_cache_service when Redis is not available."""
    # Reset global cache service
    import app.services.cache_service
    app.services.cache_service._cache_service = None
    
    with patch('app.services.cache_service.REDIS_AVAILABLE', False):
        service = await get_cache_service()
        assert isinstance(service, NoOpCacheService)