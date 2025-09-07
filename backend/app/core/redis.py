"""
Redis configuration and connection management
"""

import redis.asyncio as redis
from typing import Optional, Any, Union
import json
import structlog
from datetime import timedelta

from .config import settings

logger = structlog.get_logger(__name__)

# Global Redis connection
redis_client: Optional[redis.Redis] = None


async def init_redis():
    """Initialize Redis connection"""
    global redis_client
    try:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=settings.CACHE_MAX_CONNECTIONS,
            retry_on_timeout=True,
            socket_keepalive=True,
            socket_keepalive_options={},
        )
        
        # Test connection
        await redis_client.ping()
        logger.info("Redis connection established")
        
    except Exception as e:
        logger.error("Failed to connect to Redis", error=str(e))
        raise


async def get_redis() -> redis.Redis:
    """Get Redis client instance"""
    if redis_client is None:
        await init_redis()
    return redis_client


class CacheManager:
    """Redis cache manager with JSON serialization"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = await self.redis.get(key)
            if value is None:
                return None
            return json.loads(value)
        except Exception as e:
            logger.error("Cache get error", key=key, error=str(e))
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[Union[int, timedelta]] = None
    ) -> bool:
        """Set value in cache"""
        try:
            serialized_value = json.dumps(value, default=str)
            ttl_seconds = ttl or settings.CACHE_TTL_SECONDS
            
            if isinstance(ttl_seconds, timedelta):
                ttl_seconds = int(ttl_seconds.total_seconds())
            
            await self.redis.setex(key, ttl_seconds, serialized_value)
            return True
        except Exception as e:
            logger.error("Cache set error", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            result = await self.redis.delete(key)
            return bool(result)
        except Exception as e:
            logger.error("Cache delete error", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            result = await self.redis.exists(key)
            return bool(result)
        except Exception as e:
            logger.error("Cache exists error", key=key, error=str(e))
            return False
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment counter in cache"""
        try:
            return await self.redis.incrby(key, amount)
        except Exception as e:
            logger.error("Cache increment error", key=key, error=str(e))
            return 0
    
    async def expire(self, key: str, ttl: Union[int, timedelta]) -> bool:
        """Set expiration time for key"""
        try:
            if isinstance(ttl, timedelta):
                ttl = int(ttl.total_seconds())
            result = await self.redis.expire(key, ttl)
            return bool(result)
        except Exception as e:
            logger.error("Cache expire error", key=key, error=str(e))
            return False


async def get_cache_manager() -> CacheManager:
    """Get cache manager instance"""
    redis_instance = await get_redis()
    return CacheManager(redis_instance)


async def close_redis():
    """Close Redis connections"""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis connections closed")