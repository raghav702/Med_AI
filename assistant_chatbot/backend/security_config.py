"""
Security Configuration Module

This module provides environment-based security settings for the API abuse prevention system.
It handles configuration for rate limiting, CORS, and input validation with appropriate
defaults for development and production environments.
"""

import os
from typing import List, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting settings"""
    requests_per_minute: int = 5
    requests_per_hour: int = 50
    block_duration_hours: int = 1
    enable_rate_limiting: bool = True
    
    @classmethod
    def from_env(cls) -> 'RateLimitConfig':
        """Create rate limit configuration from environment variables"""
        return cls(
            requests_per_minute=int(os.getenv('RATE_LIMIT_PER_MINUTE', '5')),
            requests_per_hour=int(os.getenv('RATE_LIMIT_PER_HOUR', '50')),
            block_duration_hours=int(os.getenv('RATE_LIMIT_BLOCK_HOURS', '1')),
            enable_rate_limiting=os.getenv('ENABLE_RATE_LIMITING', 'true').lower() == 'true'
        )


@dataclass
class CORSConfig:
    """Configuration for CORS settings"""
    allowed_origins: List[str]
    allow_credentials: bool = True
    allow_methods: List[str] = None
    allow_headers: List[str] = None
    
    def __post_init__(self):
        if self.allow_methods is None:
            self.allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        if self.allow_headers is None:
            self.allow_headers = ["*"]
    
    @classmethod
    def from_env(cls) -> 'CORSConfig':
        """Create CORS configuration from environment variables"""
        # Determine environment
        environment = os.getenv('ENVIRONMENT', 'development').lower()
        
        if environment == 'production':
            # Production: restrict to specific domains
            allowed_origins_str = os.getenv('CORS_ALLOWED_ORIGINS', '')
            if allowed_origins_str:
                allowed_origins = [origin.strip() for origin in allowed_origins_str.split(',')]
            else:
                # Default production domains - allow Cloud Run domains
                allowed_origins = [
                    "https://medai-506044864836.europe-west1.run.app"
                ]
        else:
            # Development: allow localhost and common development ports
            allowed_origins = [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:8080",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:8080",
                "http://192.168.1.19:8080",
                "http://192.168.1.19:5173"
            ]
            
            # Add any additional development origins from environment
            additional_origins = os.getenv('CORS_DEV_ORIGINS', '')
            if additional_origins:
                allowed_origins.extend([origin.strip() for origin in additional_origins.split(',')])
        
        return cls(
            allowed_origins=allowed_origins,
            allow_credentials=os.getenv('CORS_ALLOW_CREDENTIALS', 'true').lower() == 'true'
        )


@dataclass
class InputValidationConfig:
    """Configuration for input validation settings"""
    max_message_length: int = 1000
    enable_validation: bool = True
    log_validation_failures: bool = True
    suspicious_pattern_threshold: int = 10  # Max repeated characters
    
    @classmethod
    def from_env(cls) -> 'InputValidationConfig':
        """Create input validation configuration from environment variables"""
        return cls(
            max_message_length=int(os.getenv('MAX_MESSAGE_LENGTH', '1000')),
            enable_validation=os.getenv('ENABLE_INPUT_VALIDATION', 'true').lower() == 'true',
            log_validation_failures=os.getenv('LOG_VALIDATION_FAILURES', 'true').lower() == 'true',
            suspicious_pattern_threshold=int(os.getenv('SUSPICIOUS_PATTERN_THRESHOLD', '10'))
        )


@dataclass
class SecurityConfig:
    """Main security configuration container"""
    rate_limit: RateLimitConfig
    cors: CORSConfig
    input_validation: InputValidationConfig
    environment: str
    
    @classmethod
    def from_env(cls) -> 'SecurityConfig':
        """Create complete security configuration from environment variables"""
        return cls(
            rate_limit=RateLimitConfig.from_env(),
            cors=CORSConfig.from_env(),
            input_validation=InputValidationConfig.from_env(),
            environment=os.getenv('ENVIRONMENT', 'development').lower()
        )


# Global security configuration instance
security_config = SecurityConfig.from_env()


def get_security_config() -> SecurityConfig:
    """Get the global security configuration instance"""
    return security_config


def is_development() -> bool:
    """Check if running in development environment"""
    return security_config.environment == 'development'


def is_production() -> bool:
    """Check if running in production environment"""
    return security_config.environment == 'production'