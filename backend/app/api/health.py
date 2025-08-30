"""
Health check endpoints for AEC Axis.

This module contains endpoints for checking the health status of various services.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from app.services.cache_service import get_cache_service, CacheServiceInterface

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/cache", response_model=Dict[str, Any])
async def get_cache_health(
    cache: CacheServiceInterface = Depends(get_cache_service),
) -> Dict[str, Any]:
    """
    Get cache service health status.

    Args:
        cache: Cache service instance

    Returns:
        Dictionary with cache health information
    """
    # Check if cache service has health_check method (Redis implementation)
    if hasattr(cache, "health_check"):
        try:
            return await cache.health_check()
        except Exception as e:
            return {
                "status": "error",
                "type": "redis",
                "message": f"Cache health check failed: {str(e)}",
                "error": str(e),
            }
    else:
        # NoOp cache service
        return {
            "status": "ok",
            "type": "noop",
            "message": "Cache service is using NoOp implementation (Redis not available)",
        }


@router.get("/", response_model=Dict[str, str])
async def get_overall_health(
    cache: CacheServiceInterface = Depends(get_cache_service),
) -> Dict[str, str]:
    """
    Get overall application health status.

    Args:
        cache: Cache service instance

    Returns:
        Dictionary with overall health status
    """
    cache_status = "unknown"

    # Check cache health with proper error handling
    if hasattr(cache, "health_check"):
        try:
            cache_health = await cache.health_check()
            cache_status = "ok" if cache_health.get("ping", False) else "degraded"
        except Exception as e:
            cache_status = "error"
    else:
        cache_status = "degraded"  # NoOp cache means Redis is not available

    overall_status = "ok" if cache_status == "ok" else "degraded"

    return {
        "status": overall_status,
        "cache": cache_status,
        "message": "Application is running",
    }
