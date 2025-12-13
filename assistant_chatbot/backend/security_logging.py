"""
Security Logging Configuration

This module provides structured logging specifically for security events including
rate limiting violations, CORS violations, and input validation failures.
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class SecurityEvent:
    """Data class for security events"""
    event_type: str
    ip_address: str
    timestamp: datetime
    details: Dict[str, Any]
    severity: str = "INFO"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert security event to dictionary for logging"""
        return {
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type,
            "ip_address": self.ip_address,
            "severity": self.severity,
            "details": self.details
        }


class SecurityLogger:
    """
    Specialized logger for security events with structured formatting.
    
    Provides methods for logging rate limiting, CORS violations, input validation
    failures, and other security-related events with consistent structured format.
    """
    
    def __init__(self, logger_name: str = "security"):
        self.logger = logging.getLogger(logger_name)
        
        # Configure security logger if not already configured
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def _log_security_event(self, event: SecurityEvent) -> None:
        """Log a security event with structured format"""
        log_message = json.dumps(event.to_dict())
        
        if event.severity == "CRITICAL":
            self.logger.critical(log_message)
        elif event.severity == "ERROR":
            self.logger.error(log_message)
        elif event.severity == "WARNING":
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
    
    def log_rate_limit_violation(self, ip_address: str, request_count: int, 
                                time_window: str, blocked: bool = False) -> None:
        """
        Log rate limiting violation.
        
        Args:
            ip_address: IP address that exceeded limits
            request_count: Number of requests made
            time_window: Time window (e.g., "per_minute", "per_hour")
            blocked: Whether the IP was blocked
        """
        event = SecurityEvent(
            event_type="rate_limit_violation",
            ip_address=ip_address,
            timestamp=datetime.utcnow(),
            severity="WARNING" if not blocked else "ERROR",
            details={
                "request_count": request_count,
                "time_window": time_window,
                "blocked": blocked,
                "action": "blocked" if blocked else "throttled"
            }
        )
        self._log_security_event(event)
    
    def log_cors_violation(self, ip_address: str, origin: str, 
                          request_method: str, blocked: bool = True) -> None:
        """
        Log CORS policy violation.
        
        Args:
            ip_address: IP address of the request
            origin: Origin header value
            request_method: HTTP method used
            blocked: Whether the request was blocked
        """
        event = SecurityEvent(
            event_type="cors_violation",
            ip_address=ip_address,
            timestamp=datetime.utcnow(),
            severity="WARNING",
            details={
                "origin": origin,
                "method": request_method,
                "blocked": blocked,
                "action": "blocked" if blocked else "allowed"
            }
        )
        self._log_security_event(event)
    
    def log_input_validation_failure(self, ip_address: str, validation_type: str,
                                   message_length: Optional[int] = None,
                                   pattern_detected: Optional[str] = None) -> None:
        """
        Log input validation failure.
        
        Args:
            ip_address: IP address of the request
            validation_type: Type of validation that failed
            message_length: Length of the message if relevant
            pattern_detected: Suspicious pattern detected if relevant
        """
        details = {
            "validation_type": validation_type,
            "action": "rejected"
        }
        
        if message_length is not None:
            details["message_length"] = message_length
        
        if pattern_detected:
            details["pattern_detected"] = pattern_detected
        
        event = SecurityEvent(
            event_type="input_validation_failure",
            ip_address=ip_address,
            timestamp=datetime.utcnow(),
            severity="WARNING",
            details=details
        )
        self._log_security_event(event)
    
    def log_security_middleware_error(self, ip_address: str, middleware_name: str,
                                    error_message: str) -> None:
        """
        Log security middleware errors.
        
        Args:
            ip_address: IP address of the request
            middleware_name: Name of the middleware that failed
            error_message: Error message
        """
        event = SecurityEvent(
            event_type="middleware_error",
            ip_address=ip_address,
            timestamp=datetime.utcnow(),
            severity="ERROR",
            details={
                "middleware": middleware_name,
                "error": error_message,
                "action": "failed_open"  # Security middleware failures should fail open
            }
        )
        self._log_security_event(event)
    
    def log_security_config_loaded(self, config_summary: Dict[str, Any]) -> None:
        """
        Log security configuration loading.
        
        Args:
            config_summary: Summary of loaded security configuration
        """
        event = SecurityEvent(
            event_type="security_config_loaded",
            ip_address="system",
            timestamp=datetime.utcnow(),
            severity="INFO",
            details=config_summary
        )
        self._log_security_event(event)


# Global security logger instance
security_logger = SecurityLogger()


def get_security_logger() -> SecurityLogger:
    """Get the global security logger instance"""
    return security_logger


def configure_security_logging(log_level: str = "INFO") -> None:
    """
    Configure security logging with specified level.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    logger = logging.getLogger("security")
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Log configuration change
    security_logger.log_security_config_loaded({
        "log_level": log_level,
        "configured_at": datetime.utcnow().isoformat()
    })