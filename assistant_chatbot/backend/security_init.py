"""
Security Infrastructure Initialization

This module initializes and validates the security infrastructure components.
It should be imported early in the application startup to ensure all security
components are properly configured.
"""

import sys
from typing import Dict, Any
from security_config import get_security_config, is_development, is_production
from security_logging import get_security_logger, configure_security_logging


def validate_security_dependencies() -> Dict[str, bool]:
    """
    Validate that all required security dependencies are available.
    
    Returns:
        Dictionary with validation results for each dependency
    """
    validation_results = {}
    
    # Check slowapi (for rate limiting)
    try:
        import slowapi
        validation_results['slowapi'] = True
    except ImportError:
        validation_results['slowapi'] = False
    
    # Check redis (optional, for distributed rate limiting)
    try:
        import redis
        validation_results['redis'] = True
    except ImportError:
        validation_results['redis'] = False
    
    # Check fastapi
    try:
        import fastapi
        validation_results['fastapi'] = True
    except ImportError:
        validation_results['fastapi'] = False
    
    return validation_results


def initialize_security_logging() -> None:
    """Initialize security logging configuration"""
    config = get_security_config()
    
    # Configure logging level based on environment
    log_level = "DEBUG" if is_development() else "INFO"
    configure_security_logging(log_level)
    
    logger = get_security_logger()
    
    # Log security configuration summary
    config_summary = {
        "environment": config.environment,
        "rate_limiting_enabled": config.rate_limit.enable_rate_limiting,
        "input_validation_enabled": config.input_validation.enable_validation,
        "cors_origins_count": len(config.cors.allowed_origins),
        "max_message_length": config.input_validation.max_message_length
    }
    
    logger.log_security_config_loaded(config_summary)


def validate_security_configuration() -> bool:
    """
    Validate security configuration and log any issues.
    
    Returns:
        True if configuration is valid, False otherwise
    """
    config = get_security_config()
    logger = get_security_logger()
    issues = []
    
    # Validate rate limiting configuration
    if config.rate_limit.enable_rate_limiting:
        if config.rate_limit.requests_per_minute <= 0:
            issues.append("Rate limit per minute must be positive")
        
        if config.rate_limit.requests_per_hour <= 0:
            issues.append("Rate limit per hour must be positive")
        
        if config.rate_limit.requests_per_minute > config.rate_limit.requests_per_hour:
            issues.append("Rate limit per minute cannot exceed rate limit per hour")
    
    # Validate CORS configuration
    if not config.cors.allowed_origins:
        issues.append("No CORS origins configured")
    
    if is_production() and any("localhost" in origin for origin in config.cors.allowed_origins):
        issues.append("Production environment should not allow localhost origins")
    
    # Validate input validation configuration
    if config.input_validation.enable_validation:
        if config.input_validation.max_message_length <= 0:
            issues.append("Maximum message length must be positive")
    
    # Log any configuration issues
    if issues:
        for issue in issues:
            logger.log_security_middleware_error("system", "configuration", issue)
        return False
    
    return True


def initialize_security_infrastructure() -> bool:
    """
    Initialize the complete security infrastructure.
    
    Returns:
        True if initialization successful, False otherwise
    """
    try:
        # Initialize logging first
        initialize_security_logging()
        logger = get_security_logger()
        
        logger.log_security_config_loaded({
            "action": "initializing_security_infrastructure",
            "timestamp": "startup"
        })
        
        # Validate dependencies
        dependencies = validate_security_dependencies()
        missing_required = []
        missing_optional = []
        
        # Check required dependencies
        if not dependencies.get('slowapi', False):
            missing_required.append('slowapi')
        
        if not dependencies.get('fastapi', False):
            missing_required.append('fastapi')
        
        # Check optional dependencies
        if not dependencies.get('redis', False):
            missing_optional.append('redis')
        
        # Log dependency status
        if missing_required:
            for dep in missing_required:
                logger.log_security_middleware_error(
                    "system", 
                    "dependency_check", 
                    f"Required dependency missing: {dep}"
                )
            return False
        
        if missing_optional:
            logger.log_security_config_loaded({
                "missing_optional_dependencies": missing_optional,
                "note": "Optional dependencies missing - some features may be limited"
            })
        
        # Validate configuration
        if not validate_security_configuration():
            logger.log_security_middleware_error(
                "system",
                "configuration_validation",
                "Security configuration validation failed"
            )
            return False
        
        # Log successful initialization
        logger.log_security_config_loaded({
            "action": "security_infrastructure_initialized",
            "status": "success",
            "dependencies_available": dependencies
        })
        
        return True
        
    except Exception as e:
        # Log initialization failure
        try:
            logger = get_security_logger()
            logger.log_security_middleware_error(
                "system",
                "initialization",
                f"Failed to initialize security infrastructure: {str(e)}"
            )
        except:
            # Fallback to print if logging fails
            print(f"CRITICAL: Security initialization failed: {str(e)}")
        
        return False


def get_security_status() -> Dict[str, Any]:
    """
    Get current security infrastructure status.
    
    Returns:
        Dictionary with security status information
    """
    config = get_security_config()
    dependencies = validate_security_dependencies()
    
    return {
        "environment": config.environment,
        "security_enabled": {
            "rate_limiting": config.rate_limit.enable_rate_limiting,
            "input_validation": config.input_validation.enable_validation,
            "cors_configured": len(config.cors.allowed_origins) > 0
        },
        "dependencies": dependencies,
        "configuration_valid": validate_security_configuration()
    }


# Initialize security infrastructure when module is imported
if __name__ != "__main__":
    # Only initialize when imported, not when run directly
    initialization_success = initialize_security_infrastructure()
    
    if not initialization_success:
        print("WARNING: Security infrastructure initialization failed")
        print("Application may continue with reduced security features")


if __name__ == "__main__":
    # When run directly, provide status information
    print("Security Infrastructure Status:")
    print("=" * 40)
    
    status = get_security_status()
    
    print(f"Environment: {status['environment']}")
    print(f"Configuration Valid: {status['configuration_valid']}")
    print()
    
    print("Security Features:")
    for feature, enabled in status['security_enabled'].items():
        status_str = "✓ Enabled" if enabled else "✗ Disabled"
        print(f"  {feature}: {status_str}")
    print()
    
    print("Dependencies:")
    for dep, available in status['dependencies'].items():
        status_str = "✓ Available" if available else "✗ Missing"
        print(f"  {dep}: {status_str}")
    
    # Test initialization
    print("\nTesting initialization...")
    success = initialize_security_infrastructure()
    print(f"Initialization: {'✓ Success' if success else '✗ Failed'}")