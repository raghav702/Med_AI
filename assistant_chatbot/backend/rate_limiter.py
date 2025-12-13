"""
Rate limiting middleware for API abuse prevention.

This module implements IP-based rate limiting using a sliding window algorithm
to prevent excessive API usage and protect against abuse.
"""

import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class RateLimitEntry:
    """
    Tracks rate limiting data for a specific IP address.
    
    Uses sliding window algorithm to track requests within time windows
    and manage blocking state for rate limit violations.
    """
    ip_address: str
    requests: List[float] = field(default_factory=list)  # Timestamps of requests
    blocked_until: Optional[float] = None  # Timestamp when block expires
    
    def cleanup_old_requests(self, window_minutes: int) -> None:
        """
        Remove requests older than the specified window.
        
        Args:
            window_minutes: Time window in minutes to keep requests
        """
        cutoff_time = time.time() - (window_minutes * 60)
        self.requests = [req_time for req_time in self.requests if req_time > cutoff_time]
    
    def is_blocked(self) -> bool:
        """
        Check if this IP is currently blocked.
        
        Returns:
            True if IP is blocked, False otherwise
        """
        if self.blocked_until is None:
            return False
        
        current_time = time.time()
        if current_time >= self.blocked_until:
            # Block has expired, clear it
            self.blocked_until = None
            return False
        
        return True
    
    def add_request(self) -> None:
        """Add a new request timestamp to the tracking list."""
        self.requests.append(time.time())
    
    def block_for_duration(self, duration_seconds: int) -> None:
        """
        Block this IP for the specified duration.
        
        Args:
            duration_seconds: Duration to block in seconds
        """
        self.blocked_until = time.time() + duration_seconds


class RateLimiter:
    """
    IP-based rate limiter using sliding window algorithm.
    
    Implements rate limiting with configurable per-minute and per-hour limits,
    automatic blocking for violations, and proper HTTP headers for client guidance.
    """
    
    def __init__(
        self,
        requests_per_minute: int = 5,
        requests_per_hour: int = 50,
        block_duration_seconds: int = 3600  # 1 hour
    ):
        """
        Initialize rate limiter with specified limits.
        
        Args:
            requests_per_minute: Maximum requests allowed per minute
            requests_per_hour: Maximum requests allowed per hour
            block_duration_seconds: Duration to block violating IPs (seconds)
        """
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.block_duration_seconds = block_duration_seconds
        
        # In-memory storage for rate limit tracking
        self.ip_data: Dict[str, RateLimitEntry] = defaultdict(
            lambda: RateLimitEntry(ip_address="")
        )
        
        logger.info(
            f"RateLimiter initialized: {requests_per_minute}/min, "
            f"{requests_per_hour}/hour, block_duration={block_duration_seconds}s"
        )
    
    def is_allowed(self, ip_address: str) -> Tuple[bool, Dict[str, str]]:
        """
        Check if a request from the given IP should be allowed.
        
        Args:
            ip_address: Client IP address
        
        Returns:
            Tuple of (is_allowed, headers_dict)
            - is_allowed: True if request should be allowed
            - headers_dict: HTTP headers to include in response
        """
        current_time = time.time()
        
        # Get or create entry for this IP
        entry = self.ip_data[ip_address]
        if not entry.ip_address:  # Initialize if new
            entry.ip_address = ip_address
        
        # Check if IP is currently blocked
        if entry.is_blocked():
            headers = self._get_rate_limit_headers(ip_address, blocked=True)
            logger.warning(f"Blocked request from {ip_address} - still in block period")
            return False, headers
        
        # Clean up old requests
        entry.cleanup_old_requests(60)  # Clean requests older than 1 hour
        
        # Count requests in different time windows
        minute_cutoff = current_time - 60  # 1 minute ago
        hour_cutoff = current_time - 3600  # 1 hour ago
        
        requests_last_minute = sum(1 for req_time in entry.requests if req_time > minute_cutoff)
        requests_last_hour = sum(1 for req_time in entry.requests if req_time > hour_cutoff)
        
        # Check rate limits
        if requests_last_minute >= self.requests_per_minute:
            # Block for exceeding per-minute limit
            entry.block_for_duration(self.block_duration_seconds)
            headers = self._get_rate_limit_headers(ip_address, blocked=True)
            logger.warning(
                f"IP {ip_address} exceeded per-minute limit: {requests_last_minute}/{self.requests_per_minute}"
            )
            return False, headers
        
        if requests_last_hour >= self.requests_per_hour:
            # Block for exceeding per-hour limit
            entry.block_for_duration(self.block_duration_seconds)
            headers = self._get_rate_limit_headers(ip_address, blocked=True)
            logger.warning(
                f"IP {ip_address} exceeded per-hour limit: {requests_last_hour}/{self.requests_per_hour}"
            )
            return False, headers
        
        # Request is allowed, record it
        entry.add_request()
        headers = self._get_rate_limit_headers(ip_address, blocked=False)
        
        return True, headers
    
    def get_reset_time(self, ip_address: str) -> int:
        """
        Get the timestamp when rate limits reset for the given IP.
        
        Args:
            ip_address: Client IP address
        
        Returns:
            Unix timestamp when limits reset
        """
        entry = self.ip_data.get(ip_address)
        if not entry or not entry.requests:
            return int(time.time() + 60)  # Default to 1 minute from now
        
        # Find the oldest request in the current window
        current_time = time.time()
        minute_cutoff = current_time - 60
        hour_cutoff = current_time - 3600
        
        # Get requests in current windows
        minute_requests = [req_time for req_time in entry.requests if req_time > minute_cutoff]
        hour_requests = [req_time for req_time in entry.requests if req_time > hour_cutoff]
        
        # Calculate when the oldest request in each window will expire
        minute_reset = int(min(minute_requests) + 60) if minute_requests else int(current_time + 60)
        hour_reset = int(min(hour_requests) + 3600) if hour_requests else int(current_time + 3600)
        
        # Return the sooner reset time
        return min(minute_reset, hour_reset)
    
    def _get_rate_limit_headers(self, ip_address: str, blocked: bool = False) -> Dict[str, str]:
        """
        Generate rate limit headers for HTTP response.
        
        Args:
            ip_address: Client IP address
            blocked: Whether the request was blocked
        
        Returns:
            Dictionary of HTTP headers
        """
        entry = self.ip_data.get(ip_address)
        current_time = time.time()
        
        # Calculate remaining requests
        if entry:
            minute_cutoff = current_time - 60
            hour_cutoff = current_time - 3600
            
            requests_last_minute = sum(1 for req_time in entry.requests if req_time > minute_cutoff)
            requests_last_hour = sum(1 for req_time in entry.requests if req_time > hour_cutoff)
            
            remaining_minute = max(0, self.requests_per_minute - requests_last_minute)
            remaining_hour = max(0, self.requests_per_hour - requests_last_hour)
        else:
            remaining_minute = self.requests_per_minute
            remaining_hour = self.requests_per_hour
        
        headers = {
            "X-RateLimit-Limit-Minute": str(self.requests_per_minute),
            "X-RateLimit-Limit-Hour": str(self.requests_per_hour),
            "X-RateLimit-Remaining-Minute": str(remaining_minute),
            "X-RateLimit-Remaining-Hour": str(remaining_hour),
            "X-RateLimit-Reset": str(self.get_reset_time(ip_address))
        }
        
        # Add Retry-After header if blocked
        if blocked and entry and entry.blocked_until:
            retry_after = max(1, int(entry.blocked_until - current_time))
            headers["Retry-After"] = str(retry_after)
        
        return headers
    
    def unblock_ip(self, ip_address: str) -> bool:
        """
        Manually unblock a specific IP address.
        
        Args:
            ip_address: IP address to unblock
            
        Returns:
            True if IP was found and unblocked, False if IP not found
        """
        entry = self.ip_data.get(ip_address)
        if entry and entry.blocked_until:
            entry.blocked_until = None
            logger.info(f"Manually unblocked IP: {ip_address}")
            return True
        return False
    
    def clear_all_blocks(self) -> int:
        """
        Clear all blocked IPs and rate limit data.
        
        Returns:
            Number of IPs that were cleared
        """
        cleared_count = 0
        for entry in self.ip_data.values():
            if entry.blocked_until:
                entry.blocked_until = None
                cleared_count += 1
        
        # Optionally clear all tracking data
        # self.ip_data.clear()
        
        logger.info(f"Cleared {cleared_count} blocked IPs")
        return cleared_count
    
    def get_blocked_ips(self) -> List[Dict[str, any]]:
        """
        Get list of currently blocked IPs with details.
        
        Returns:
            List of blocked IP information
        """
        blocked_ips = []
        current_time = time.time()
        
        for ip, entry in self.ip_data.items():
            if entry.is_blocked():
                time_remaining = int(entry.blocked_until - current_time)
                blocked_ips.append({
                    "ip_address": ip,
                    "blocked_until": entry.blocked_until,
                    "time_remaining_seconds": time_remaining,
                    "request_count": len(entry.requests)
                })
        
        return blocked_ips

    def get_stats(self) -> Dict[str, any]:
        """
        Get statistics about current rate limiting state.
        
        Returns:
            Dictionary with rate limiting statistics
        """
        current_time = time.time()
        total_ips = len(self.ip_data)
        blocked_ips = sum(1 for entry in self.ip_data.values() if entry.is_blocked())
        
        # Count active IPs (those with requests in last hour)
        hour_cutoff = current_time - 3600
        active_ips = sum(
            1 for entry in self.ip_data.values()
            if any(req_time > hour_cutoff for req_time in entry.requests)
        )
        
        return {
            "total_tracked_ips": total_ips,
            "currently_blocked_ips": blocked_ips,
            "active_ips_last_hour": active_ips,
            "requests_per_minute_limit": self.requests_per_minute,
            "requests_per_hour_limit": self.requests_per_hour,
            "block_duration_seconds": self.block_duration_seconds,
            "blocked_ips": self.get_blocked_ips()
        }