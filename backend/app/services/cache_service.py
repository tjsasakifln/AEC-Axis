"""
Cache service for Redis-based caching in AEC Axis.

This module provides a comprehensive caching service with:
- Redis connection management with graceful fallback
- Automatic JSON serialization for complex objects
- TTL management for different data types
- Cache key pattern management for efficient invalidation
- Structured logging for cache operations
"""
import json
import logging
import hashlib
from typing import Any, Optional, Dict, List, Union
from abc import ABC, abstractmethod
from datetime import timedelta
import os

try:
    import redis.asyncio as redis
    from redis.exceptions import RedisError
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None
    RedisError = Exception

logger = logging.getLogger(__name__)


class CacheServiceInterface(ABC):
    """Abstract interface for cache service implementations."""

    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Get a value from cache."""
        pass

    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Set a value in cache with optional TTL."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete a value from cache."""
        pass

    @abstractmethod
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern."""
        pass

    @abstractmethod
    async def clear_all(self) -> bool:
        """Clear all cache data."""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache."""
        pass

    @abstractmethod
    async def get_ttl(self, key: str) -> Optional[int]:
        """Get the TTL of a key in seconds."""
        pass


class RedisCacheService(CacheServiceInterface):
    """
    Redis-based cache service with graceful fallback.
    
    Features:
    - Automatic connection management with retry logic
    - JSON serialization for complex Python objects
    - TTL management with sensible defaults
    - Pattern-based key deletion for cache invalidation
    - Comprehensive error handling and logging
    - Health check capabilities
    """

    # Default TTL values (in seconds)
    DEFAULT_TTL_LIST = 900  # 15 minutes for list endpoints
    DEFAULT_TTL_DETAIL = 300  # 5 minutes for detail endpoints
    DEFAULT_TTL_SEARCH = 600  # 10 minutes for search results

    def __init__(self):
        """Initialize Redis cache service with configuration from environment."""
        self.redis: Optional[redis.Redis] = None
        self._connected = False
        
        # Redis configuration from environment
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", "6379"))
        self.redis_db = int(os.getenv("REDIS_DB", "0"))
        self.redis_password = os.getenv("REDIS_PASSWORD")
        self.redis_ssl = os.getenv("REDIS_SSL", "false").lower() == "true"
        
        # Connection pool settings
        self.max_connections = int(os.getenv("REDIS_MAX_CONNECTIONS", "10"))
        self.retry_on_timeout = True
        self.socket_connect_timeout = int(os.getenv("REDIS_CONNECT_TIMEOUT", "5"))
        self.socket_timeout = int(os.getenv("REDIS_SOCKET_TIMEOUT", "5"))

    async def _get_connection(self) -> Optional[redis.Redis]:
        """Get or create Redis connection with error handling."""
        if not REDIS_AVAILABLE:
            logger.warning("Redis is not available - aioredis not installed")
            return None

        if self._connected and self.redis:
            return self.redis

        try:
            # Try connecting with URL first, then fall back to individual params
            if self.redis_url:
                self.redis = redis.from_url(
                    self.redis_url,
                    max_connections=self.max_connections,
                    retry_on_timeout=self.retry_on_timeout,
                    socket_connect_timeout=self.socket_connect_timeout,
                    socket_timeout=self.socket_timeout,
                    decode_responses=True
                )
            else:
                self.redis = redis.Redis(
                    host=self.redis_host,
                    port=self.redis_port,
                    db=self.redis_db,
                    password=self.redis_password,
                    ssl=self.redis_ssl,
                    max_connections=self.max_connections,
                    retry_on_timeout=self.retry_on_timeout,
                    socket_connect_timeout=self.socket_connect_timeout,
                    socket_timeout=self.socket_timeout,
                    decode_responses=True
                )

            # Test connection
            await self.redis.ping()
            self._connected = True
            logger.info(f"Successfully connected to Redis at {self.redis_host}:{self.redis_port}")
            return self.redis

        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis = None
            self._connected = False
            return None

    async def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache with automatic JSON deserialization.
        
        Args:
            key: Cache key to retrieve
            
        Returns:
            Cached value or None if not found or on error
        """
        redis = await self._get_connection()
        if not redis:
            logger.debug(f"Cache miss (Redis unavailable): {key}")
            return None

        try:
            value = await redis.get(key)
            if value is None:
                logger.debug(f"Cache miss: {key}")
                return None

            # Try to deserialize JSON, fall back to string
            try:
                result = json.loads(value)
                logger.debug(f"Cache hit: {key}")
                return result
            except json.JSONDecodeError:
                logger.debug(f"Cache hit (string): {key}")
                return value

        except RedisError as e:
            logger.error(f"Redis error getting key '{key}': {e}")
            return None

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """
        Set a value in cache with automatic JSON serialization.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized if not string)
            ttl_seconds: TTL in seconds, uses default if None
            
        Returns:
            True if successful, False otherwise
        """
        redis = await self._get_connection()
        if not redis:
            logger.debug(f"Cache set failed (Redis unavailable): {key}")
            return False

        try:
            # Serialize value if not already a string
            if isinstance(value, str):
                serialized_value = value
            else:
                serialized_value = json.dumps(value, default=str)

            # Set TTL - use default if not provided
            if ttl_seconds is None:
                ttl_seconds = self.DEFAULT_TTL_LIST

            await redis.setex(key, ttl_seconds, serialized_value)
            logger.debug(f"Cache set: {key} (TTL: {ttl_seconds}s)")
            return True

        except Exception as e:
            logger.error(f"Error setting cache key '{key}': {e}")
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete a key from cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if key was deleted, False otherwise
        """
        redis = await self._get_connection()
        if not redis:
            return False

        try:
            result = await redis.delete(key)
            if result > 0:
                logger.debug(f"Cache delete: {key}")
                return True
            return False

        except RedisError as e:
            logger.error(f"Error deleting cache key '{key}': {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.
        
        Args:
            pattern: Redis pattern (e.g., "projects:company:123:*")
            
        Returns:
            Number of keys deleted
        """
        redis = await self._get_connection()
        if not redis:
            return 0

        try:
            keys = await redis.keys(pattern)
            if not keys:
                return 0

            deleted = await redis.delete(*keys)
            logger.info(f"Cache pattern delete: {pattern} ({deleted} keys deleted)")
            return deleted

        except RedisError as e:
            logger.error(f"Error deleting cache pattern '{pattern}': {e}")
            return 0

    async def clear_all(self) -> bool:
        """
        Clear all cache data (use with caution).
        
        Returns:
            True if successful, False otherwise
        """
        redis = await self._get_connection()
        if not redis:
            return False

        try:
            await redis.flushdb()
            logger.warning("Cache cleared: All keys deleted")
            return True

        except RedisError as e:
            logger.error(f"Error clearing cache: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """
        Check if a key exists in cache.
        
        Args:
            key: Cache key to check
            
        Returns:
            True if key exists, False otherwise
        """
        redis = await self._get_connection()
        if not redis:
            return False

        try:
            result = await redis.exists(key)
            return result > 0

        except RedisError as e:
            logger.error(f"Error checking cache key existence '{key}': {e}")
            return False

    async def get_ttl(self, key: str) -> Optional[int]:
        """
        Get the TTL of a key.
        
        Args:
            key: Cache key
            
        Returns:
            TTL in seconds, None if key doesn't exist or no TTL set
        """
        redis = await self._get_connection()
        if not redis:
            return None

        try:
            ttl = await redis.ttl(key)
            return ttl if ttl > 0 else None

        except RedisError as e:
            logger.error(f"Error getting TTL for key '{key}': {e}")
            return None

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the cache service.
        
        Returns:
            Dictionary with health status information
        """
        redis = await self._get_connection()
        
        status = {
            "redis_available": REDIS_AVAILABLE,
            "connected": self._connected,
            "host": self.redis_host,
            "port": self.redis_port,
            "db": self.redis_db
        }

        if redis:
            try:
                await redis.ping()
                status["ping"] = True
                
                # Get Redis info
                info = await redis.info()
                status["redis_version"] = info.get("redis_version")
                status["connected_clients"] = info.get("connected_clients")
                status["used_memory_human"] = info.get("used_memory_human")
                
            except RedisError as e:
                status["ping"] = False
                status["error"] = str(e)
        else:
            status["ping"] = False

        return status


class NoOpCacheService(CacheServiceInterface):
    """
    No-operation cache service for fallback when Redis is unavailable.
    All operations return sensible defaults without actual caching.
    """

    async def get(self, key: str) -> Optional[Any]:
        """Always returns None (cache miss)."""
        return None

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Always returns True (fake success)."""
        return True

    async def delete(self, key: str) -> bool:
        """Always returns True (fake success)."""
        return True

    async def delete_pattern(self, pattern: str) -> int:
        """Always returns 0 (no keys deleted)."""
        return 0

    async def clear_all(self) -> bool:
        """Always returns True (fake success)."""
        return True

    async def exists(self, key: str) -> bool:
        """Always returns False (key doesn't exist)."""
        return False

    async def get_ttl(self, key: str) -> Optional[int]:
        """Always returns None (no TTL)."""
        return None


class CacheKeyBuilder:
    """
    Utility class for building consistent cache keys with patterns.
    
    This ensures consistent key naming across the application and provides
    helper methods for common cache key patterns.
    """

    @staticmethod
    def projects_list(company_id: str, page: int = 1, search: Optional[str] = None, status: Optional[str] = None) -> str:
        """
        Build cache key for projects list endpoint.
        
        Args:
            company_id: Company UUID
            page: Page number
            search: Search term (will be hashed if present)
            status: Status filter
            
        Returns:
            Cache key string
        """
        key_parts = [f"projects:company:{company_id}:page:{page}"]
        
        if search:
            search_hash = hashlib.md5(search.encode()).hexdigest()[:8]
            key_parts.append(f"search:{search_hash}")
        
        if status:
            key_parts.append(f"status:{status}")
            
        return ":".join(key_parts)

    @staticmethod
    def projects_pattern(company_id: str) -> str:
        """Get pattern for deleting all project-related cache keys for a company."""
        return f"projects:company:{company_id}:*"

    @staticmethod
    def materials_list(ifc_file_id: str) -> str:
        """Build cache key for materials list endpoint."""
        return f"materials:ifc:{ifc_file_id}"

    @staticmethod
    def materials_pattern(ifc_file_id: str) -> str:
        """Get pattern for deleting all material-related cache keys for an IFC file."""
        return f"materials:ifc:{ifc_file_id}*"

    @staticmethod
    def suppliers_list(company_id: str) -> str:
        """Build cache key for suppliers list endpoint."""
        return f"suppliers:company:{company_id}"

    @staticmethod
    def suppliers_pattern(company_id: str) -> str:
        """Get pattern for deleting all supplier-related cache keys for a company."""
        return f"suppliers:company:{company_id}*"

    @staticmethod
    def project_detail(project_id: str) -> str:
        """Build cache key for project detail endpoint."""
        return f"project:detail:{project_id}"

    @staticmethod
    def supplier_detail(supplier_id: str) -> str:
        """Build cache key for supplier detail endpoint."""
        return f"supplier:detail:{supplier_id}"


# Global cache service instance
_cache_service: Optional[CacheServiceInterface] = None


def get_cache_service() -> CacheServiceInterface:
    """
    Dependency function to get the cache service instance.
    
    Returns:
        Cache service instance (Redis or NoOp fallback)
    """
    global _cache_service
    
    if _cache_service is None:
        if REDIS_AVAILABLE:
            _cache_service = RedisCacheService()
        else:
            logger.warning("Using NoOp cache service - Redis not available")
            _cache_service = NoOpCacheService()
    
    return _cache_service


# Export commonly used classes and functions
__all__ = [
    "CacheServiceInterface",
    "RedisCacheService", 
    "NoOpCacheService",
    "CacheKeyBuilder",
    "get_cache_service"
]