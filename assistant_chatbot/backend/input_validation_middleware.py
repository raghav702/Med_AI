"""
FastAPI middleware for input validation.

This module provides middleware integration for the InputValidator class,
handling HTTP request interception and input validation enforcement.
"""

import json
import logging
import uuid
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from input_validator import InputValidator, ValidationResult
from security_logging import get_security_logger
from security_metrics import get_security_metrics_collector

logger = logging.getLogger(__name__)
security_logger = get_security_logger()
metrics_collector = get_security_metrics_collector()


class InputValidationMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for input validation.
    
    Intercepts incoming requests, validates message content, and either allows
    the request to proceed or returns a 400 Bad Request response.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        max_message_length: int = 1000,
        min_message_length: int = 1,
        max_repeated_chars: int = 10,
        exempt_paths: list = None,
        validation_paths: list = None,
        structured_logger = None
    ):
        """
        Initialize input validation middleware.
        
        Args:
            app: FastAPI application instance
            max_message_length: Maximum allowed message length
            min_message_length: Minimum required message length
            max_repeated_chars: Maximum consecutive repeated characters
            exempt_paths: List of paths to exempt from validation
            validation_paths: List of paths that require validation (if None, validates all non-exempt)
            structured_logger: Optional structured logger instance for validation logging
        """
        super().__init__(app)
        
        self.validator = InputValidator(
            max_message_length=max_message_length,
            min_message_length=min_message_length,
            max_repeated_chars=max_repeated_chars
        )
        
        self.structured_logger = structured_logger
        
        # Default exempt paths (health checks, static files, etc.)
        self.exempt_paths = exempt_paths or [
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/static",
            "/assets",
            "/rate-limit/stats"
        ]
        
        # Paths that require validation (defaults to API endpoints)
        self.validation_paths = validation_paths or [
            "/ask",
            "/ask-legacy"
        ]
        
        logger.info(
            f"InputValidationMiddleware initialized with max_length={max_message_length}, "
            f"validation_paths={self.validation_paths}, exempt_paths={self.exempt_paths}"
        )
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process incoming request through input validation.
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
        
        Returns:
            HTTP response (either validation error or from next handler)
        """
        # Skip validation for exempt paths
        if self._is_exempt_path(request.url.path):
            return await call_next(request)
        
        # Skip validation for non-validation paths
        if not self._requires_validation(request.url.path):
            return await call_next(request)
        
        # Only validate POST requests with JSON bodies
        if request.method != "POST":
            return await call_next(request)
        
        # Get client IP for logging
        client_ip = self._get_client_ip(request)
        
        try:
            # Read and parse request body
            body = await request.body()
            
            if not body:
                # Empty body - let the application handle it
                return await call_next(request)
            
            try:
                request_data = json.loads(body)
            except json.JSONDecodeError:
                # Invalid JSON - let the application handle it
                logger.warning(f"Invalid JSON from {client_ip} on path {request.url.path}")
                return await call_next(request)
            
            # Extract message field for validation
            message = None
            if isinstance(request_data, dict):
                message = request_data.get("message")
            
            if message is None:
                # No message field - let the application handle it
                return await call_next(request)
            
            # Validate the message
            validation_result = self.validator.validate_message(message)
            
            if not validation_result.is_valid:
                # Validation failed - return 400 error
                logger.warning(
                    f"Input validation failed for IP {client_ip} on path {request.url.path}: "
                    f"{validation_result.error_message}"
                )
                
                # Determine validation type for logging
                validation_type = "unknown"
                if "length" in validation_result.error_message.lower():
                    validation_type = "message_length"
                elif "whitespace" in validation_result.error_message.lower() or "empty" in validation_result.error_message.lower():
                    validation_type = "empty_message"
                elif "suspicious" in validation_result.error_message.lower():
                    validation_type = "suspicious_pattern"
                
                # Log security event
                security_logger.log_input_validation_failure(
                    ip_address=client_ip,
                    validation_type=validation_type,
                    message_length=len(message) if message else 0
                )
                
                # Record metrics
                metrics_collector.record_input_validation_failure(
                    ip_address=client_ip,
                    validation_type=validation_type,
                    message_length=len(message) if message else 0
                )
                
                # Log validation failure for monitoring using structured logger
                request_id = str(uuid.uuid4())
                if self.structured_logger:
                    self.structured_logger.log_validation_error(
                        request_id=request_id,
                        error_type="input_validation_failure",
                        error_details=validation_result.error_message,
                        provided_value=message[:100] if len(message) > 100 else message
                    )
                else:
                    # Fallback to basic logging
                    self._log_validation_failure(
                        client_ip=client_ip,
                        path=request.url.path,
                        error_message=validation_result.error_message,
                        message_preview=message[:100] if len(message) > 100 else message
                    )
                
                error_response = {
                    "error": "Invalid input",
                    "message": validation_result.error_message,
                    "error_type": "validation_error"
                }
                
                return JSONResponse(
                    status_code=400,
                    content=error_response
                )
            
            # Validation passed - update request body with sanitized message if needed
            if validation_result.sanitized_message and validation_result.sanitized_message != message:
                request_data["message"] = validation_result.sanitized_message
                
                # Create new request with sanitized body
                sanitized_body = json.dumps(request_data).encode('utf-8')
                
                # Replace the request body
                async def receive():
                    return {"type": "http.request", "body": sanitized_body}
                
                request._receive = receive
            
            # Request is valid, proceed to next handler
            return await call_next(request)
            
        except Exception as e:
            # Validation middleware error - log and continue
            logger.error(
                f"Input validation middleware error for {client_ip} on {request.url.path}: {str(e)}"
            )
            
            # Log middleware error for security monitoring
            security_logger.log_security_middleware_error(
                ip_address=client_ip,
                middleware_name="InputValidationMiddleware",
                error_message=str(e)
            )
            
            # Record metrics
            metrics_collector.record_middleware_error(
                ip_address=client_ip,
                middleware_name="InputValidationMiddleware",
                error=str(e)
            )
            
            # Continue to application - don't block on middleware errors
            return await call_next(request)
    
    def _is_exempt_path(self, path: str) -> bool:
        """
        Check if a path is exempt from input validation.
        
        Args:
            path: Request path to check
        
        Returns:
            True if path should be exempt from validation
        """
        for exempt_path in self.exempt_paths:
            if path.startswith(exempt_path):
                return True
        return False
    
    def _requires_validation(self, path: str) -> bool:
        """
        Check if a path requires input validation.
        
        Args:
            path: Request path to check
        
        Returns:
            True if path requires validation
        """
        for validation_path in self.validation_paths:
            if path.startswith(validation_path):
                return True
        return False
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request.
        
        Args:
            request: HTTP request object
        
        Returns:
            Client IP address as string
        """
        # Check for forwarded headers (common in production deployments)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        # Fallback to direct client IP
        client_host = getattr(request.client, "host", "unknown")
        return client_host
    
    def _log_validation_failure(
        self,
        client_ip: str,
        path: str,
        error_message: str,
        message_preview: str
    ) -> None:
        """
        Log validation failure with structured format.
        
        Args:
            client_ip: Client IP address
            path: Request path
            error_message: Validation error message
            message_preview: Preview of the invalid message
        """
        log_data = {
            "event_type": "input_validation_failure",
            "client_ip": client_ip,
            "path": path,
            "error_message": error_message,
            "message_preview": message_preview,
            "timestamp": logger.handlers[0].formatter.formatTime(logger.makeRecord(
                logger.name, logging.WARNING, __file__, 0, "", (), None
            )) if logger.handlers else None
        }
        
        logger.warning(f"Input validation failure: {json.dumps(log_data)}")
    
    def get_validator_stats(self) -> dict:
        """
        Get input validator statistics.
        
        Returns:
            Dictionary with validation statistics and configuration
        """
        return {
            "validation_enabled": True,
            "validation_paths": self.validation_paths,
            "exempt_paths": self.exempt_paths,
            "validator_config": self.validator.get_validation_stats()
        }


def create_input_validation_middleware(
    max_message_length: int = 1000,
    min_message_length: int = 1,
    max_repeated_chars: int = 10,
    exempt_paths: list = None,
    validation_paths: list = None
) -> type:
    """
    Factory function to create input validation middleware with custom settings.
    
    Args:
        max_message_length: Maximum allowed message length
        min_message_length: Minimum required message length
        max_repeated_chars: Maximum consecutive repeated characters
        exempt_paths: List of paths to exempt from validation
        validation_paths: List of paths that require validation
    
    Returns:
        Configured InputValidationMiddleware class
    """
    class ConfiguredInputValidationMiddleware(InputValidationMiddleware):
        def __init__(self, app: ASGIApp):
            super().__init__(
                app=app,
                max_message_length=max_message_length,
                min_message_length=min_message_length,
                max_repeated_chars=max_repeated_chars,
                exempt_paths=exempt_paths,
                validation_paths=validation_paths
            )
    
    return ConfiguredInputValidationMiddleware