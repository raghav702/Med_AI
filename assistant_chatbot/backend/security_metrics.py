"""
Security Metrics Collection

This module provides metrics collection for security events including
rate limiting violations, input validation failures, and CORS violations.
Metrics are collected in-memory and can be exported for monitoring systems.
"""

import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict, deque
import threading
import logging

logger = logging.getLogger(__name__)


@dataclass
class SecurityMetric:
    """Individual security metric data point"""
    timestamp: float
    event_type: str
    ip_address: str
    details: Dict[str, Any] = field(default_factory=dict)


class SecurityMetricsCollector:
    """
    Collects and aggregates security metrics for monitoring and analysis.
    
    Provides real-time metrics collection for:
    - Rate limiting violations
    - Input validation failures
    - CORS violations
    - Security middleware errors
    
    Metrics are stored in-memory with configurable retention periods.
    """
    
    def __init__(self, retention_hours: int = 24, max_events_per_type: int = 10000):
        """
        Initialize metrics collector.
        
        Args:
            retention_hours: How long to keep metrics in memory
            max_events_per_type: Maximum events to store per event type
        """
        self.retention_hours = retention_hours
        self.max_events_per_type = max_events_per_type
        
        # Thread-safe storage for metrics
        self._lock = threading.RLock()
        self._metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_events_per_type))
        
        # Aggregated counters
        self._counters: Dict[str, int] = defaultdict(int)
        self._ip_counters: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        
        logger.info(f"SecurityMetricsCollector initialized: retention={retention_hours}h, max_events={max_events_per_type}")
    
    def record_event(self, event_type: str, ip_address: str, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Record a security event.
        
        Args:
            event_type: Type of security event
            ip_address: IP address associated with the event
            details: Additional event details
        """
        current_time = time.time()
        
        with self._lock:
            # Create metric
            metric = SecurityMetric(
                timestamp=current_time,
                event_type=event_type,
                ip_address=ip_address,
                details=details or {}
            )
            
            # Store metric
            self._metrics[event_type].append(metric)
            
            # Update counters
            self._counters[event_type] += 1
            self._ip_counters[ip_address][event_type] += 1
            
            # Clean old metrics periodically
            if self._counters[event_type] % 100 == 0:
                self._cleanup_old_metrics()
    
    def record_rate_limit_violation(self, ip_address: str, request_count: int, 
                                  time_window: str, blocked: bool = False) -> None:
        """Record rate limiting violation."""
        self.record_event(
            event_type="rate_limit_violation",
            ip_address=ip_address,
            details={
                "request_count": request_count,
                "time_window": time_window,
                "blocked": blocked
            }
        )
    
    def record_input_validation_failure(self, ip_address: str, validation_type: str,
                                      message_length: Optional[int] = None) -> None:
        """Record input validation failure."""
        details = {"validation_type": validation_type}
        if message_length is not None:
            details["message_length"] = message_length
            
        self.record_event(
            event_type="input_validation_failure",
            ip_address=ip_address,
            details=details
        )
    
    def record_cors_violation(self, ip_address: str, origin: str, method: str) -> None:
        """Record CORS policy violation."""
        self.record_event(
            event_type="cors_violation",
            ip_address=ip_address,
            details={
                "origin": origin,
                "method": method
            }
        )
    
    def record_middleware_error(self, ip_address: str, middleware_name: str, error: str) -> None:
        """Record security middleware error."""
        self.record_event(
            event_type="middleware_error",
            ip_address=ip_address,
            details={
                "middleware": middleware_name,
                "error": error
            }
        )
    
    def get_metrics_summary(self, hours: Optional[int] = None) -> Dict[str, Any]:
        """
        Get summary of security metrics.
        
        Args:
            hours: Number of hours to look back (default: all retained data)
        
        Returns:
            Dictionary with metrics summary
        """
        cutoff_time = None
        if hours:
            cutoff_time = time.time() - (hours * 3600)
        
        with self._lock:
            summary = {
                "timestamp": datetime.utcnow().isoformat(),
                "retention_hours": self.retention_hours,
                "total_events": sum(self._counters.values()),
                "event_types": {},
                "top_violating_ips": self._get_top_violating_ips(cutoff_time),
                "recent_trends": self._get_recent_trends(cutoff_time)
            }
            
            # Count events by type within time window
            for event_type, metrics in self._metrics.items():
                if cutoff_time:
                    count = sum(1 for m in metrics if m.timestamp > cutoff_time)
                else:
                    count = len(metrics)
                
                summary["event_types"][event_type] = {
                    "count": count,
                    "total_all_time": self._counters[event_type]
                }
            
            return summary
    
    def get_ip_metrics(self, ip_address: str, hours: Optional[int] = None) -> Dict[str, Any]:
        """
        Get metrics for a specific IP address.
        
        Args:
            ip_address: IP address to analyze
            hours: Number of hours to look back
        
        Returns:
            Dictionary with IP-specific metrics
        """
        cutoff_time = None
        if hours:
            cutoff_time = time.time() - (hours * 3600)
        
        with self._lock:
            ip_summary = {
                "ip_address": ip_address,
                "timestamp": datetime.utcnow().isoformat(),
                "events": {},
                "total_violations": 0,
                "recent_events": []
            }
            
            # Count events by type for this IP
            for event_type, metrics in self._metrics.items():
                ip_events = [m for m in metrics if m.ip_address == ip_address]
                
                if cutoff_time:
                    ip_events = [m for m in ip_events if m.timestamp > cutoff_time]
                
                ip_summary["events"][event_type] = len(ip_events)
                ip_summary["total_violations"] += len(ip_events)
                
                # Add recent events (last 10)
                recent = sorted(ip_events, key=lambda x: x.timestamp, reverse=True)[:10]
                for event in recent:
                    ip_summary["recent_events"].append({
                        "timestamp": datetime.fromtimestamp(event.timestamp).isoformat(),
                        "event_type": event.event_type,
                        "details": event.details
                    })
            
            # Sort recent events by timestamp
            ip_summary["recent_events"].sort(key=lambda x: x["timestamp"], reverse=True)
            
            return ip_summary
    
    def _cleanup_old_metrics(self) -> None:
        """Remove metrics older than retention period."""
        cutoff_time = time.time() - (self.retention_hours * 3600)
        
        for event_type, metrics in self._metrics.items():
            # Remove old metrics
            while metrics and metrics[0].timestamp < cutoff_time:
                metrics.popleft()
    
    def _get_top_violating_ips(self, cutoff_time: Optional[float], limit: int = 10) -> List[Dict[str, Any]]:
        """Get top violating IP addresses."""
        ip_counts = defaultdict(int)
        
        for event_type, metrics in self._metrics.items():
            for metric in metrics:
                if cutoff_time is None or metric.timestamp > cutoff_time:
                    ip_counts[metric.ip_address] += 1
        
        # Sort by violation count
        sorted_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {"ip_address": ip, "violation_count": count}
            for ip, count in sorted_ips[:limit]
        ]
    
    def _get_recent_trends(self, cutoff_time: Optional[float]) -> Dict[str, Any]:
        """Get recent trends in security events."""
        if cutoff_time is None:
            cutoff_time = time.time() - (24 * 3600)  # Last 24 hours
        
        # Count events per hour
        hourly_counts = defaultdict(lambda: defaultdict(int))
        
        for event_type, metrics in self._metrics.items():
            for metric in metrics:
                if metric.timestamp > cutoff_time:
                    hour = int(metric.timestamp // 3600)
                    hourly_counts[hour][event_type] += 1
        
        # Calculate trends
        current_hour = int(time.time() // 3600)
        last_hour = current_hour - 1
        
        trends = {}
        for event_type in self._metrics.keys():
            current_count = hourly_counts[current_hour][event_type]
            last_count = hourly_counts[last_hour][event_type]
            
            if last_count > 0:
                change_percent = ((current_count - last_count) / last_count) * 100
            else:
                change_percent = 100 if current_count > 0 else 0
            
            trends[event_type] = {
                "current_hour_count": current_count,
                "last_hour_count": last_count,
                "change_percent": round(change_percent, 2)
            }
        
        return trends
    
    def export_metrics(self, format_type: str = "json") -> Any:
        """
        Export metrics in specified format.
        
        Args:
            format_type: Export format ("json", "prometheus")
        
        Returns:
            Metrics in requested format
        """
        if format_type == "json":
            return self.get_metrics_summary()
        elif format_type == "prometheus":
            return self._export_prometheus_format()
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
    
    def _export_prometheus_format(self) -> str:
        """Export metrics in Prometheus format."""
        lines = []
        
        with self._lock:
            # Total events counter
            lines.append("# HELP security_events_total Total number of security events")
            lines.append("# TYPE security_events_total counter")
            
            for event_type, count in self._counters.items():
                lines.append(f'security_events_total{{event_type="{event_type}"}} {count}')
            
            # Current rate (events per hour)
            lines.append("# HELP security_events_rate_per_hour Current rate of security events per hour")
            lines.append("# TYPE security_events_rate_per_hour gauge")
            
            current_time = time.time()
            hour_ago = current_time - 3600
            
            for event_type, metrics in self._metrics.items():
                recent_count = sum(1 for m in metrics if m.timestamp > hour_ago)
                lines.append(f'security_events_rate_per_hour{{event_type="{event_type}"}} {recent_count}')
        
        return "\n".join(lines)


# Global metrics collector instance
_metrics_collector = None


def get_security_metrics_collector() -> SecurityMetricsCollector:
    """Get the global security metrics collector instance."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = SecurityMetricsCollector()
    return _metrics_collector


def initialize_security_metrics(retention_hours: int = 24, max_events_per_type: int = 10000) -> SecurityMetricsCollector:
    """
    Initialize the global security metrics collector.
    
    Args:
        retention_hours: How long to keep metrics in memory
        max_events_per_type: Maximum events to store per event type
    
    Returns:
        Initialized SecurityMetricsCollector instance
    """
    global _metrics_collector
    _metrics_collector = SecurityMetricsCollector(retention_hours, max_events_per_type)
    return _metrics_collector