"""
Health check endpoints for AEC Axis.

This module contains endpoints for checking the health status of various services.
"""
import asyncio
from typing import Dict, Any
from fastapi import APIRouter, Depends
from app.services.cache_service import get_cache_service, CacheServiceInterface

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/cache", response_model=Dict[str, Any])
def get_cache_health(
    cache: CacheServiceInterface = Depends(get_cache_service)
) -> Dict[str, Any]:
    """
    Get cache service health status.
    
    Args:
        cache: Cache service instance
        
    Returns:
        Dictionary with cache health information
    """
    # Check if cache service has health_check method (Redis implementation)
    if hasattr(cache, 'health_check'):
        return asyncio.run(cache.health_check())
    else:
        # NoOp cache service
        return {
            "status": "ok",
            "type": "noop",
            "message": "Cache service is using NoOp implementation (Redis not available)"
        }


@router.get("/", response_model=Dict[str, str])
def get_overall_health(
    cache: CacheServiceInterface = Depends(get_cache_service)
) -> Dict[str, str]:
    """
    Get overall application health status.
    
    Args:
        cache: Cache service instance
        
    Returns:
        Dictionary with overall health status
    """
    cache_status = "unknown"
    
    # Check cache health
    if hasattr(cache, 'health_check'):
        cache_health = asyncio.run(cache.health_check())
        cache_status = "ok" if cache_health.get("ping", False) else "degraded"
    else:
        cache_status = "degraded"  # NoOp cache means Redis is not available
    
    overall_status = "ok" if cache_status == "ok" else "degraded"
    
    return {
        "status": overall_status,
        "cache": cache_status,
        "message": "Application is running"
    }