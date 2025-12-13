"""
FastAPI middleware for rate limiting.

This module provides middleware integration for the RateLimiter class,
handling HTTP request interception and rate limit enforcement.
"""

import logging
from typing import Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from rate_limiter import RateLimiter
from security_logging import get_security_logger
from security_metrics import get_security_metrics_collector

logger = logging.getLogger(__name__)
security_logger = get_security_logger()
metrics_collector = get_security_metrics_collector()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for IP-based rate limiting.
    
    Intercepts incoming requests, checks rate limits, and either allows
    the request to proceed or returns a 429 Too Many Requests response.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 5,
        requests_per_hour: int = 50,
        block_duration_seconds: int = 3600,
        exempt_paths: list = None
    ):
        """
        Initialize rate limiting middleware.
        
        Args:
            app: FastAPI application instance
            requests_per_minute: Maximum requests per minute per IP
            requests_per_hour: Maximum requests per hour per IP
            block_duration_seconds: Duration to block violating IPs
            exempt_paths: List of paths to exempt from rate limiting
        """
        super().__init__(app)
        
        self.rate_limiter = RateLimiter(
            requests_per_minute=requests_per_minute,
            requests_per_hour=requests_per_hour,
            block_duration_seconds=block_duration_seconds
        )
        
        # Default exempt paths (health checks, static files, etc.)
        self.exempt_paths = exempt_paths or [
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/static",
            "/assets"
        ]
        
        logger.info(
            f"RateLimitMiddleware initialized with {requests_per_minute}/min, "
            f"{requests_per_hour}/hour limits, exempt paths: {self.exempt_paths}"
        )
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process incoming request through rate limiting.
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
        
        Returns:
            HTTP response (either rate limit error or from next handler)
        """
        # Skip rate limiting for exempt paths
        if self._is_exempt_path(request.url.path):
            return await call_next(request)
        
        # Get client IP address
        client_ip = self._get_client_ip(request)
        
        # Check rate limits
        is_allowed, headers = self.rate_limiter.is_allowed(client_ip)
        
        if not is_allowed:
            # Rate limit exceeded, return 429 response
            logger.warning(f"Rate limit exceeded for IP {client_ip} on path {request.url.path}")
            
            # Determine if this is a block or just throttling
            blocked = "Retry-After" in headers
            
            # Log security event
            security_logger.log_rate_limit_violation(
                ip_address=client_ip,
                request_count=int(headers.get("X-RateLimit-Remaining-Minute", "0")),
                time_window="per_minute" if not blocked else "per_hour",
                blocked=blocked
            )
            
            # Record metrics
            metrics_collector.record_rate_limit_violation(
                ip_address=client_ip,
                request_count=int(headers.get("X-RateLimit-Remaining-Minute", "0")),
                time_window="per_minute" if not blocked else "per_hour",
                blocked=blocked
            )
            
            error_response = {
                "error": "Rate limit exceeded",
                "message": "Too many requests. Please try again later.",
                "retry_after": headers.get("Retry-After", "3600")
            }
            
            response = JSONResponse(
                status_code=429,
                content=error_response
            )
            
            # Add rate limit headers
            for header_name, header_value in headers.items():
                response.headers[header_name] = header_value
            
            return response
        
        # Request is allowed, proceed to next handler
        response = await call_next(request)
        
        # Add rate limit headers to successful responses
        for header_name, header_value in headers.items():
            response.headers[header_name] = header_value
        
        return response
    
    def _is_exempt_path(self, path: str) -> bool:
        """
        Check if a path is exempt from rate limiting.
        
        Args:
            path: Request path to check
        
        Returns:
            True if path should be exempt from rate limiting
        """
        for exempt_path in self.exempt_paths:
            if path.startswith(exempt_path):
                return True
        return False
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request.
        
        Handles various proxy headers and fallbacks to ensure we get
        the real client IP when possible.
        
        Args:
            request: HTTP request object
        
        Returns:
            Client IP address as string
        """
        # Check for forwarded headers (common in production deployments)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first (original client)
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header (used by some proxies)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        # Check for Cloudflare connecting IP
        cf_connecting_ip = request.headers.get("CF-Connecting-IP")
        if cf_connecting_ip:
            return cf_connecting_ip.strip()
        
        # Fallback to direct client IP
        client_host = getattr(request.client, "host", "unknown")
        return client_host
    
    def get_rate_limiter_stats(self) -> dict:
        """
        Get current rate limiter statistics.
        
        Returns:
            Dictionary with rate limiting statistics
        """
        return self.rate_limiter.get_stats()


def create_rate_limit_middleware(
    requests_per_minute: int = 5,
    requests_per_hour: int = 50,
    block_duration_seconds: int = 3600,
    exempt_paths: list = None
) -> type:
    """
    Factory function to create rate limit middleware with custom settings.
    
    Args:
        requests_per_minute: Maximum requests per minute per IP
        requests_per_hour: Maximum requests per hour per IP  
        block_duration_seconds: Duration to block violating IPs
        exempt_paths: List of paths to exempt from rate limiting
    
    Returns:
        Configured RateLimitMiddleware class
    """
    class ConfiguredRateLimitMiddleware(RateLimitMiddleware):
        def __init__(self, app: ASGIApp):
            super().__init__(
                app=app,
                requests_per_minute=requests_per_minute,
                requests_per_hour=requests_per_hour,
                block_duration_seconds=block_duration_seconds,
                exempt_paths=exempt_paths
            )
    
    return ConfiguredRateLimitMiddleware