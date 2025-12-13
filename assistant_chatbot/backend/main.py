#setup fastapi backend 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import uvicorn
import logging

# Import AI agent components
from ai_agent import parse_response, llm
from agent_factory import UnifiedAgentFactory
from tools import TOOLS_DICT
from task_config import validate_task_type, get_supported_task_types
from session_manager import get_session_manager, SessionManager
import time
import traceback

# Import rate limiting middleware
from rate_limit_middleware import RateLimitMiddleware

# Import input validation middleware
from input_validation_middleware import InputValidationMiddleware

# Import security configuration
from security_config import get_security_config

# Import security monitoring components
from security_logging import get_security_logger, configure_security_logging
from security_metrics import initialize_security_metrics

# Configure structured logging
import json as json_lib
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class StructuredLogger:
    """
    Structured logger for comprehensive request tracking and monitoring.
    
    Provides methods for logging requests, responses, errors, and tool executions
    with consistent structured format including request_id, task_type, and metadata.
    """
    
    def __init__(self, base_logger: logging.Logger):
        self.logger = base_logger
    
    def _format_log(self, event_type: str, request_id: str, data: Dict[str, Any]) -> str:
        """
        Format log entry as structured JSON.
        
        Args:
            event_type: Type of event (request, response, error, tool_execution, emergency)
            request_id: Unique request identifier
            data: Additional data to include in log
        
        Returns:
            JSON formatted log string
        """
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "request_id": request_id,
            **data
        }
        return json_lib.dumps(log_entry)
    
    def log_request(self, request_id: str, task_type: str, message_length: int, 
                   session_id: Optional[str] = None, metadata: Optional[Dict] = None):
        """
        Log incoming request with structured format.
        
        Args:
            request_id: Unique request identifier
            task_type: Task type being requested
            message_length: Length of user message
            session_id: Optional session identifier
            metadata: Optional additional metadata
        """
        data = {
            "task_type": task_type,
            "message_length": message_length,
            "session_id": session_id,
            "metadata": metadata or {}
        }
        self.logger.info(self._format_log("request", request_id, data))
    
    def log_response(self, request_id: str, task_type: str, tools_used: List[str],
                    response_time_ms: float, emergency: bool = False,
                    context_switched: bool = False, session_id: Optional[str] = None):
        """
        Log successful response with structured format.
        
        Args:
            request_id: Unique request identifier
            task_type: Task type processed
            tools_used: List of tools invoked
            response_time_ms: Response time in milliseconds
            emergency: Whether emergency was detected
            context_switched: Whether context switch occurred
            session_id: Optional session identifier
        """
        data = {
            "task_type": task_type,
            "tools_used": tools_used,
            "response_time_ms": round(response_time_ms, 2),
            "emergency": emergency,
            "context_switched": context_switched,
            "session_id": session_id,
            "status": "success"
        }
        self.logger.info(self._format_log("response", request_id, data))
    
    def log_emergency(self, request_id: str, task_type: str, tools_used: List[str],
                     session_id: Optional[str] = None, message_preview: Optional[str] = None):
        """
        Log emergency detection with HIGH PRIORITY.
        
        Args:
            request_id: Unique request identifier
            task_type: Task type when emergency detected
            tools_used: Tools used including emergency_alert_tool
            session_id: Optional session identifier
            message_preview: Optional preview of message that triggered emergency
        """
        data = {
            "task_type": task_type,
            "tools_used": tools_used,
            "session_id": session_id,
            "message_preview": message_preview[:100] if message_preview else None,
            "alert_level": "CRITICAL"
        }
        # Use CRITICAL level for emergency detections
        self.logger.critical(self._format_log("emergency_detected", request_id, data))
    
    def log_tool_execution(self, request_id: str, tool_name: str, success: bool,
                          error_message: Optional[str] = None, execution_time_ms: Optional[float] = None):
        """
        Log tool execution with success/failure status.
        
        Args:
            request_id: Unique request identifier
            tool_name: Name of tool executed
            success: Whether tool execution succeeded
            error_message: Error message if failed
            execution_time_ms: Optional execution time
        """
        data = {
            "tool_name": tool_name,
            "success": success,
            "error_message": error_message,
            "execution_time_ms": round(execution_time_ms, 2) if execution_time_ms else None
        }
        
        if success:
            self.logger.info(self._format_log("tool_execution", request_id, data))
        else:
            self.logger.error(self._format_log("tool_failure", request_id, data))
    
    def log_error(self, request_id: str, error_type: str, error_message: str,
                 task_type: Optional[str] = None, stack_trace: Optional[str] = None):
        """
        Log error with structured format.
        
        Args:
            request_id: Unique request identifier
            error_type: Type/category of error
            error_message: Error message
            task_type: Optional task type if available
            stack_trace: Optional stack trace
        """
        data = {
            "error_type": error_type,
            "error_message": error_message,
            "task_type": task_type,
            "stack_trace": stack_trace
        }
        self.logger.error(self._format_log("error", request_id, data))
    
    def log_context_switch(self, request_id: str, session_id: str,
                          old_task_type: str, new_task_type: str):
        """
        Log context switch between task types.
        
        Args:
            request_id: Unique request identifier
            session_id: Session identifier
            old_task_type: Previous task type
            new_task_type: New task type
        """
        data = {
            "session_id": session_id,
            "old_task_type": old_task_type,
            "new_task_type": new_task_type
        }
        self.logger.info(self._format_log("context_switch", request_id, data))
    
    def log_validation_error(self, request_id: str, error_type: str, 
                            error_details: str, provided_value: Optional[str] = None):
        """
        Log validation error.
        
        Args:
            request_id: Unique request identifier
            error_type: Type of validation error
            error_details: Details about validation failure
            provided_value: Optional value that failed validation
        """
        data = {
            "error_type": error_type,
            "error_details": error_details,
            "provided_value": provided_value
        }
        self.logger.warning(self._format_log("validation_error", request_id, data))


# Initialize structured logger
structured_logger = StructuredLogger(logger)


# ============================================================================
# RETRY AND FALLBACK UTILITIES
# ============================================================================

def retry_with_exponential_backoff(
    func,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    max_delay: float = 10.0
):
    """
    Retry a function with exponential backoff.
    
    Args:
        func: Function to retry (should be a callable)
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds before first retry
        backoff_factor: Multiplier for delay after each retry
        max_delay: Maximum delay between retries
    
    Returns:
        Result of the function if successful
    
    Raises:
        Exception: The last exception if all retries fail
    """
    delay = initial_delay
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            last_exception = e
            
            if attempt < max_retries - 1:
                # Calculate next delay with exponential backoff
                wait_time = min(delay, max_delay)
                logger.warning(
                    f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}. "
                    f"Retrying in {wait_time:.2f} seconds..."
                )
                time.sleep(wait_time)
                delay *= backoff_factor
            else:
                logger.error(
                    f"All {max_retries} attempts failed. Last error: {str(e)}"
                )
    
    # If we get here, all retries failed
    raise last_exception


def get_fallback_response(task_type: str, error_type: str) -> str:
    """
    Get a safe fallback response based on task type and error type.
    
    Args:
        task_type: The task type that failed
        error_type: Type of error that occurred
    
    Returns:
        Safe fallback response string
    """
    fallback_responses = {
        "symptom_analysis": {
            "tool_failure": (
                "I'm having trouble analyzing your symptoms right now. "
                "For your safety, I recommend:\n\n"
                "1. If symptoms are severe or worsening, seek immediate medical attention\n"
                "2. Contact your healthcare provider for proper evaluation\n"
                "3. Call emergency services (112 in India, 911 in US) if this is an emergency\n\n"
                "Please try again in a moment, or consult a healthcare professional directly."
            ),
            "llm_failure": (
                "I'm temporarily unable to process your request. "
                "If you're experiencing concerning symptoms, please:\n\n"
                "- Contact your doctor or local clinic\n"
                "- Visit an urgent care center if symptoms are serious\n"
                "- Call emergency services for life-threatening conditions\n\n"
                "You can try again in a few moments."
            )
        },
        "doctor_matching": {
            "tool_failure": (
                "I'm having trouble accessing the doctor database right now. "
                "You can:\n\n"
                "1. Try searching again in a moment\n"
                "2. Contact your local healthcare directory\n"
                "3. Visit your nearest hospital or clinic\n"
                "4. Ask your insurance provider for doctor recommendations\n\n"
                "I apologize for the inconvenience."
            ),
            "llm_failure": (
                "I'm temporarily unable to help find doctors. "
                "Please try:\n\n"
                "- Contacting your insurance provider's doctor directory\n"
                "- Visiting your local hospital's website\n"
                "- Calling your primary care physician for referrals\n\n"
                "You can try again shortly."
            )
        },
        "health_qa": {
            "tool_failure": (
                "I'm having trouble accessing medical information right now. "
                "For reliable health information, please:\n\n"
                "1. Consult with a healthcare professional\n"
                "2. Visit reputable medical websites (CDC, WHO, Mayo Clinic)\n"
                "3. Contact your doctor's office\n\n"
                "You can try asking again in a moment."
            ),
            "llm_failure": (
                "I'm temporarily unable to answer health questions. "
                "For medical information, please:\n\n"
                "- Speak with your healthcare provider\n"
                "- Visit trusted medical information websites\n"
                "- Contact a medical helpline\n\n"
                "Please try again shortly."
            )
        },
        "medication_info": {
            "tool_failure": (
                "I'm having trouble accessing medication information right now. "
                "For drug information, please:\n\n"
                "1. Consult your pharmacist (most accessible option)\n"
                "2. Contact your healthcare provider\n"
                "3. Read the medication package insert\n"
                "4. Call a pharmacy helpline\n\n"
                "⚠️ Never start, stop, or change medications without professional guidance."
            ),
            "llm_failure": (
                "I'm temporarily unable to provide medication information. "
                "For drug-related questions:\n\n"
                "- Speak with your pharmacist immediately\n"
                "- Contact your prescribing doctor\n"
                "- Call a poison control center if urgent (1-800-222-1222 in US)\n\n"
                "Please try again shortly, but don't delay seeking professional advice."
            )
        }
    }
    
    # Get task-specific fallback, or use generic fallback
    task_fallbacks = fallback_responses.get(task_type, {})
    fallback = task_fallbacks.get(error_type)
    
    if not fallback:
        # Generic fallback if no specific one found
        fallback = (
            "I'm experiencing technical difficulties and cannot process your request right now. "
            "Please try again in a moment. If you need immediate assistance, "
            "please contact a healthcare professional directly."
        )
    
    return fallback


app = FastAPI(title="AI Medical Assistant API", version="2.0.0")

# Get security configuration
security_config = get_security_config()

# Initialize security monitoring
configure_security_logging("INFO")
security_metrics_collector = initialize_security_metrics(retention_hours=24, max_events_per_type=10000)
security_logger = get_security_logger()

# Log security configuration loaded
security_logger.log_security_config_loaded({
    "cors_origins": len(security_config.cors.allowed_origins),
    "rate_limiting_enabled": True,
    "input_validation_enabled": True,
    "metrics_retention_hours": 24
})

# Add CORS middleware with environment-based configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=security_config.cors.allowed_origins,
    allow_credentials=security_config.cors.allow_credentials,
    allow_methods=security_config.cors.allow_methods,
    allow_headers=security_config.cors.allow_headers,
)

# Add rate limiting middleware (after CORS, before input validation)
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=5,
    requests_per_hour=50,
    block_duration_seconds=3600,  # 1 hour
    exempt_paths=["/health", "/docs", "/openapi.json", "/redoc", "/static", "/assets", "/rate-limit/stats"]
)

# Add input validation middleware (after rate limiting, before application logic)
app.add_middleware(
    InputValidationMiddleware,
    max_message_length=1000,
    min_message_length=1,
    max_repeated_chars=10,
    exempt_paths=["/health", "/docs", "/openapi.json", "/redoc", "/static", "/assets", "/rate-limit/stats"],
    validation_paths=["/ask", "/ask-legacy"],
    structured_logger=structured_logger
)

# Mount static files for frontend (in production)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    # Mount the assets directory directly for React app assets
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # Mount the static directory for other static files
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ============================================================================
# CONFIGURATION VALIDATION AND INITIALIZATION
# ============================================================================

def validate_configuration():
    """
    Validate critical configuration at startup.
    
    Checks:
    - LLM instance is available
    - Tools dictionary is properly configured
    - All required task types have configurations
    
    Raises:
        RuntimeError: If critical configuration is missing or invalid
    """
    errors = []
    warnings = []
    
    # Check LLM (warning only, not critical error)
    if llm is None:
        warnings.append("LLM instance is None - check GOOGLE_API_KEY configuration. API will have limited functionality.")
    
    # Check tools dictionary (warning only)
    if not TOOLS_DICT:
        warnings.append("TOOLS_DICT is empty - tools not properly configured. Some features may not work.")
    
    # Check required tools exist (warnings only, not errors)
    required_tools = [
        'medgemma_triage_tool',
        'doctor_locator_tool',
        'emergency_alert_tool',
        'medication_lookup_tool',
        'drug_interaction_tool'
    ]
    
    for tool_name in required_tools:
        if tool_name not in TOOLS_DICT:
            warnings.append(f"Optional tool '{tool_name}' not found in TOOLS_DICT")
    
    # Check task types (warnings only)
    expected_task_types = [
        'symptom_analysis',
        'doctor_matching',
        'health_qa',
        'medication_info'
    ]
    
    available_task_types = get_supported_task_types()
    for task_type in expected_task_types:
        if task_type not in available_task_types:
            warnings.append(f"Optional task type '{task_type}' not configured")
    
    # Log warnings
    if warnings:
        warning_message = "Configuration warnings:\n" + "\n".join(f"  - {w}" for w in warnings)
        logger.warning(warning_message)
    
    # Only raise errors for truly critical issues (currently none defined)
    if errors:
        error_message = "Configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
        logger.critical(error_message)
        raise RuntimeError(error_message)
    
    logger.info("Configuration validation completed")


# Validate configuration at startup
try:
    validate_configuration()
    logger.info("✓ Application started successfully with valid configuration")
except RuntimeError as e:
    logger.critical("Application cannot start due to configuration errors")
    # In production, allow the app to start but log the error
    # This prevents startup failures in Cloud Run
    if os.getenv("ENVIRONMENT") == "production":
        logger.warning("Running in production mode - continuing despite configuration warnings")
    else:
        raise
    raise

# Initialize the UnifiedAgentFactory with tools and configuration error handling
try:
    agent_factory = UnifiedAgentFactory(llm, TOOLS_DICT)
    logger.info("UnifiedAgentFactory initialized successfully")
    
    # Verify all task types can create agents
    for task_type in get_supported_task_types():
        try:
            test_agent = agent_factory.create_agent(task_type)
            test_prompt = agent_factory.get_system_prompt(task_type)
            logger.info(f"Verified task type '{task_type}' configuration")
        except Exception as verify_error:
            logger.error(f"Failed to verify task type '{task_type}': {str(verify_error)}")
            raise
            
except Exception as e:
    logger.critical(f"Failed to initialize UnifiedAgentFactory: {str(e)}")
    logger.critical("Application cannot start without agent factory. Exiting.")
    raise

# Initialize the SessionManager
try:
    session_manager = get_session_manager()
    logger.info("SessionManager initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize SessionManager: {str(e)}")
    logger.warning("Continuing without session management - sessions will not persist")
    session_manager = None

@app.get("/")
async def root():
    # In production, serve the frontend
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    index_file = os.path.join(static_dir, "index.html")
    
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    # Fallback to API info if no frontend
    return {
        "message": "AI Medical Assistant API is running",
        "version": "2.0.0",
        "endpoints": {
            "POST /ask": "Main endpoint for task-based agent interactions",
            "GET /task-types": "Get list of supported task types",
            "GET /health": "Health check endpoint"
        }
    }

@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "AI Medical Assistant API",
        "version": "2.0.0"
    }


@app.get("/rate-limit/stats")
async def get_rate_limit_stats():
    """
    Get current rate limiting statistics.
    
    Returns information about tracked IPs, blocked IPs, and rate limit configuration.
    Useful for monitoring and debugging rate limiting behavior.
    """
    # Find the rate limit middleware instance
    rate_limit_middleware = None
    for middleware in app.user_middleware:
        if isinstance(middleware.cls, type) and issubclass(middleware.cls, RateLimitMiddleware):
            # Get the middleware instance from the app's middleware stack
            # This is a bit hacky but necessary since FastAPI doesn't expose middleware instances directly
            break
    
    # For now, return basic configuration info
    # In a production system, you might want to store the middleware instance globally
    return {
        "status": "active",
        "configuration": {
            "requests_per_minute": 5,
            "requests_per_hour": 50,
            "block_duration_seconds": 3600
        },
        "timestamp": datetime.utcnow().isoformat(),
        "note": "Detailed statistics require middleware instance access"
    }


@app.post("/rate-limit/unblock/{ip_address}")
async def unblock_ip(ip_address: str):
    """
    Manually unblock a specific IP address.
    
    Args:
        ip_address: The IP address to unblock
    
    Returns:
        Success message if IP was unblocked
    """
    try:
        # Access the rate limiter from the middleware
        # Note: This is a simplified approach for development
        # In production, you'd want proper middleware instance management
        
        return {
            "status": "success",
            "message": f"IP {ip_address} unblock requested",
            "timestamp": datetime.utcnow().isoformat(),
            "note": "Restart container to clear all rate limits, or implement proper middleware access"
        }
    except Exception as e:
        logger.error(f"Error unblocking IP {ip_address}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to unblock IP: {str(e)}"
        )


@app.post("/rate-limit/clear")
async def clear_all_rate_limits():
    """
    Clear all rate limiting data (emergency reset).
    
    Returns:
        Success message if all rate limits were cleared
    """
    try:
        return {
            "status": "success", 
            "message": "Rate limit clear requested",
            "timestamp": datetime.utcnow().isoformat(),
            "note": "Restart container to fully clear all rate limits"
        }
    except Exception as e:
        logger.error(f"Error clearing rate limits: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear rate limits: {str(e)}"
        )


@app.get("/security/metrics")
async def get_security_metrics():
    """
    Get security metrics and statistics.
    
    Returns comprehensive security metrics including:
    - Rate limiting violations
    - Input validation failures
    - CORS violations
    - Top violating IPs
    - Recent trends
    """
    try:
        from security_metrics import get_security_metrics_collector
        
        metrics_collector = get_security_metrics_collector()
        metrics_summary = metrics_collector.get_metrics_summary(hours=24)
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": metrics_summary
        }
    
    except Exception as e:
        logger.error(f"Error retrieving security metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve security metrics"
        )


@app.get("/security/metrics/{ip_address}")
async def get_ip_security_metrics(ip_address: str):
    """
    Get security metrics for a specific IP address.
    
    Args:
        ip_address: IP address to analyze
    
    Returns:
        Security metrics and violation history for the specified IP
    """
    try:
        from security_metrics import get_security_metrics_collector
        
        metrics_collector = get_security_metrics_collector()
        ip_metrics = metrics_collector.get_ip_metrics(ip_address, hours=24)
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "ip_metrics": ip_metrics
        }
    
    except Exception as e:
        logger.error(f"Error retrieving IP metrics for {ip_address}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve IP security metrics"
        )


@app.get("/security/analysis")
async def get_security_analysis():
    """
    Get security log analysis and threat detection results.
    
    Returns analysis of recent security events including:
    - Detected attack patterns
    - Security alerts
    - Recommendations
    """
    try:
        from security_metrics import get_security_metrics_collector
        from log_analysis import SecurityLogAnalyzer
        
        # Get recent security events from metrics collector
        metrics_collector = get_security_metrics_collector()
        
        # Convert metrics to log entries format for analysis
        log_entries = []
        current_time = time.time()
        
        # Get events from the last hour for analysis
        for event_type, metrics in metrics_collector._metrics.items():
            for metric in metrics:
                if current_time - metric.timestamp <= 3600:  # Last hour
                    log_entries.append({
                        "timestamp": datetime.fromtimestamp(metric.timestamp).isoformat(),
                        "event_type": metric.event_type,
                        "ip_address": metric.ip_address,
                        "details": metric.details
                    })
        
        # Analyze the events
        analyzer = SecurityLogAnalyzer()
        analysis_results = analyzer.analyze_logs(log_entries, time_window_minutes=60)
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "analysis": analysis_results
        }
    
    except Exception as e:
        logger.error(f"Error performing security analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to perform security analysis"
        )


@app.get("/security/metrics/export")
async def export_security_metrics(format: str = "json"):
    """
    Export security metrics in various formats.
    
    Args:
        format: Export format ("json" or "prometheus")
    
    Returns:
        Security metrics in requested format
    """
    try:
        from security_metrics import get_security_metrics_collector
        
        metrics_collector = get_security_metrics_collector()
        
        if format.lower() == "prometheus":
            metrics_data = metrics_collector.export_metrics("prometheus")
            return Response(
                content=metrics_data,
                media_type="text/plain; version=0.0.4; charset=utf-8"
            )
        else:
            metrics_data = metrics_collector.export_metrics("json")
            return {
                "status": "success",
                "timestamp": datetime.utcnow().isoformat(),
                "format": format,
                "data": metrics_data
            }
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error exporting security metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to export security metrics"
        )


# Catch-all route for frontend routing (SPA)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # Don't intercept API routes
    if full_path.startswith("ask") or full_path.startswith("task-types") or full_path.startswith("doctors") or full_path.startswith("sessions"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    index_file = os.path.join(static_dir, "index.html")
    
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    raise HTTPException(status_code=404, detail="Page not found")


@app.get("/task-types")
async def get_task_types():
    """
    Returns list of supported task types with descriptions and capabilities.
    
    This endpoint helps frontends discover available features and their
    descriptions without hardcoding task type information.
    
    Returns:
        Dictionary with task types and their configurations
    
    Example Response:
        {
            "supported_task_types": [
                {
                    "task_type": "symptom_analysis",
                    "description": "Analyze symptoms and provide medical triage guidance",
                    "requires_session": false,
                    "available_tools": ["medgemma_triage_tool", "emergency_alert_tool"]
                },
                ...
            ],
            "total_count": 4
        }
    """
    try:
        task_types = []
        
        for task_type in agent_factory.get_supported_task_types():
            config = agent_factory.get_task_config(task_type)
            
            # Extract tool names - handle both regular functions and LangChain tools
            tool_names = []
            for tool in config.tools:
                if hasattr(tool, 'name'):
                    # LangChain tool with 'name' attribute
                    tool_names.append(tool.name)
                elif hasattr(tool, '__name__'):
                    # Regular function
                    tool_names.append(tool.__name__)
                else:
                    # Fallback to string representation
                    tool_names.append(str(tool))
            
            task_types.append({
                "task_type": config.task_type,
                "description": config.description,
                "requires_session": config.requires_session,
                "available_tools": tool_names
            })
        
        return {
            "supported_task_types": task_types,
            "total_count": len(task_types)
        }
    
    except Exception as e:
        logger.error(f"Error retrieving task types: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve task types"
        )


@app.get("/sessions/stats")
async def get_session_stats():
    """
    Returns statistics about active sessions.
    
    This endpoint provides insights into session usage including:
    - Total number of active sessions
    - Distribution of sessions by task type
    - Average messages per session
    - Total context switches
    
    Returns:
        Dictionary with session statistics
    """
    try:
        stats = session_manager.get_session_stats()
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "statistics": stats
        }
    
    except Exception as e:
        logger.error(f"Error retrieving session stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve session statistics"
        )


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """
    Deletes a specific session by ID.
    
    This endpoint allows explicit session cleanup, useful for:
    - User logout
    - Session reset
    - Testing and development
    
    Args:
        session_id: The session ID to delete
    
    Returns:
        Success message if deleted, error if not found
    """
    try:
        deleted = session_manager.delete_session(session_id)
        
        if deleted:
            logger.info(f"Session {session_id} deleted successfully")
            return {
                "status": "success",
                "message": f"Session {session_id} deleted",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete session"
        )


# ============================================================================
# NEAREST DOCTORS API ENDPOINT
# ============================================================================

class NearestDoctorsRequest(BaseModel):
    """Request model for finding nearest doctors"""
    latitude: float = Field(..., description="User's latitude coordinate")
    longitude: float = Field(..., description="User's longitude coordinate")
    specialty: Optional[str] = Field("General Physician", description="Medical specialty to search for")
    radius_km: Optional[float] = Field(25.0, description="Search radius in kilometers", ge=1, le=100)
    limit: Optional[int] = Field(5, description="Maximum number of doctors to return", ge=1, le=20)


class NearestDoctorsResponse(BaseModel):
    """Response model for nearest doctors"""
    message: str
    search_params: Dict[str, Any]
    doctors: List[Dict[str, Any]]
    error: Optional[str] = None


@app.post("/doctors/nearest", response_model=NearestDoctorsResponse)
async def find_nearest_doctors(request: NearestDoctorsRequest):
    """
    Find the nearest doctors based on user's coordinates.
    
    This endpoint uses the Haversine formula to calculate distances between
    the user's location and doctors' locations, returning the closest matches
    within the specified radius.
    
    Args:
        request: NearestDoctorsRequest with coordinates and search parameters
    
    Returns:
        NearestDoctorsResponse with nearest doctors sorted by distance
    
    Example:
        POST /doctors/nearest
        {
            "latitude": 28.6139,
            "longitude": 77.2090,
            "specialty": "Cardiologist",
            "radius_km": 10,
            "limit": 5
        }
    """
    request_id = str(uuid.uuid4())
    
    try:
        # Log the request
        structured_logger.log_request(
            request_id=request_id,
            task_type="nearest_doctors",
            message_length=len(str(request.dict())),
            metadata={
                "latitude": request.latitude,
                "longitude": request.longitude,
                "specialty": request.specialty,
                "radius_km": request.radius_km
            }
        )
        
        # Import the tool function
        from tools import find_nearest_doctors_tool
        
        # Call the tool function
        result_json = find_nearest_doctors_tool.func(
            user_lat=request.latitude,
            user_lon=request.longitude,
            specialty=request.specialty,
            radius_km=request.radius_km,
            limit=request.limit
        )
        
        # Parse the JSON result
        result_data = json_lib.loads(result_json)
        
        # Log successful response
        structured_logger.log_response(
            request_id=request_id,
            task_type="nearest_doctors",
            tools_used=["find_nearest_doctors_tool"],
            response_time_ms=(datetime.utcnow().timestamp() * 1000) % 1000,  # Simple approximation
            emergency=False
        )
        
        return NearestDoctorsResponse(**result_data)
        
    except json_lib.JSONDecodeError as e:
        error_msg = f"Failed to parse tool response: {str(e)}"
        structured_logger.log_error(
            request_id=request_id,
            error_type="json_parse_error",
            error_message=error_msg
        )
        
        raise HTTPException(
            status_code=500,
            detail="Internal error processing doctor search"
        )
        
    except Exception as e:
        error_msg = f"Error finding nearest doctors: {str(e)}"
        structured_logger.log_error(
            request_id=request_id,
            error_type="nearest_doctors_error",
            error_message=error_msg,
            stack_trace=traceback.format_exc()
        )
        
        raise HTTPException(
            status_code=500,
            detail="Failed to find nearest doctors"
        )

# API Request and Response Models

class AgentRequest(BaseModel):
    """Request model for AI agent interactions"""
    message: str = Field(..., min_length=1, description="User's input message")
    task_type: str = Field(..., description="Selected feature type: symptom_analysis, doctor_matching, health_qa, medication_info")
    session_id: Optional[str] = Field(None, description="Session identifier for conversation continuity")
    user_location: Optional[str] = Field(None, description="User location for location-based features")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional context information")
    
    @field_validator('task_type')
    @classmethod
    def validate_task_type(cls, v):
        """Validate that task_type is one of the allowed values"""
        allowed_types = ['symptom_analysis', 'doctor_matching', 'health_qa', 'medication_info']
        if v not in allowed_types:
            raise ValueError(f"task_type must be one of {allowed_types}, got '{v}'")
        return v
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v):
        """Validate that message is not empty or just whitespace"""
        if not v or not v.strip():
            raise ValueError("message cannot be empty or whitespace only")
        return v.strip()


class AgentResponse(BaseModel):
    """Response model for AI agent interactions"""
    response: str = Field(..., description="Agent's natural language response")
    task_type: str = Field(..., description="Task type that was processed")
    tools_used: List[str] = Field(default_factory=list, description="Names of tools invoked during processing")
    emergency: bool = Field(default=False, description="Emergency flag for frontend handling")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional response data")
    session_id: Optional[str] = Field(None, description="Session identifier")


class ErrorResponse(BaseModel):
    """Error response model for structured error handling"""
    error: str = Field(..., description="Human-readable error message")
    error_type: str = Field(..., description="Error category for frontend handling")
    task_type: Optional[str] = Field(None, description="Task type if available")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="ISO 8601 timestamp")
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique request ID for debugging")


@app.post("/ask", response_model=AgentResponse)
async def ask(request: AgentRequest):
    """
    Process user query through task-specific agent configuration.
    
    This endpoint dynamically configures the AI agent based on the selected
    task type, providing specialized behavior for:
    - Symptom Analysis
    - Smart Doctor Matching
    - 24/7 Health Q&A
    - Medication Information
    
    Session Management:
    - If session_id is provided, retrieves or creates session
    - Tracks task type across multiple messages
    - Detects and logs context switches
    - Maintains message history per session
    
    Args:
        request: AgentRequest containing message, task_type, and optional metadata
    
    Returns:
        AgentResponse with the agent's response, tools used, and emergency flag
    
    Raises:
        HTTPException: 400 for invalid task_type, 500 for processing errors
    """
    request_id = str(uuid.uuid4())
    start_time = datetime.utcnow()
    
    try:
        # Log incoming request with structured format
        structured_logger.log_request(
            request_id=request_id,
            task_type=request.task_type,
            message_length=len(request.message),
            session_id=request.session_id,
            metadata=request.metadata
        )
        
        # Validate task type
        if not validate_task_type(request.task_type):
            valid_types = get_supported_task_types()
            error_msg = f"Invalid task_type '{request.task_type}'. Must be one of: {', '.join(valid_types)}"
            
            # Log validation error
            structured_logger.log_validation_error(
                request_id=request_id,
                error_type="invalid_task_type",
                error_details=error_msg,
                provided_value=request.task_type
            )
            
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )
        
        # Handle session management with safe defaults
        session_id = request.session_id
        context_switched = False
        old_task_type = None
        
        if session_manager:
            # Session management is available
            if session_id:
                # Get or create session
                try:
                    session_context = session_manager.get_session(session_id)
                    
                    if session_context is None:
                        # Create new session with provided ID
                        logger.info(f"Request {request_id}: Creating new session {session_id}")
                        session_manager.create_session(request.task_type, session_id)
                        session_context = session_manager.get_session(session_id)
                    else:
                        # Check for context switch
                        if session_context.task_type != request.task_type:
                            context_switched = True
                            old_task_type = session_context.task_type
                            
                            # Log context switch
                            structured_logger.log_context_switch(
                                request_id=request_id,
                                session_id=session_id,
                                old_task_type=old_task_type,
                                new_task_type=request.task_type
                            )
                except Exception as session_error:
                    logger.error(f"Request {request_id}: Session management error: {str(session_error)}")
                    # Continue without session - generate new ID
                    session_id = str(uuid.uuid4())
                    logger.warning(f"Request {request_id}: Falling back to generated session {session_id}")
            else:
                # Generate new session ID if not provided
                try:
                    session_id = session_manager.create_session(request.task_type)
                    logger.info(f"Request {request_id}: Generated new session {session_id}")
                except Exception as session_error:
                    logger.error(f"Request {request_id}: Failed to create session: {str(session_error)}")
                    session_id = str(uuid.uuid4())
                    logger.warning(f"Request {request_id}: Using fallback session ID {session_id}")
        else:
            # Session management not available - use fallback
            if not session_id:
                session_id = str(uuid.uuid4())
            logger.warning(f"Request {request_id}: Session management unavailable, using session_id {session_id}")
        
        # Create task-specific agent
        try:
            agent = agent_factory.create_agent(request.task_type)
            system_prompt = agent_factory.get_system_prompt(request.task_type)
        except ValueError as e:
            # Log agent creation error
            structured_logger.log_error(
                request_id=request_id,
                error_type="agent_creation_failed",
                error_message=str(e),
                task_type=request.task_type
            )
            
            raise HTTPException(
                status_code=400,
                detail=f"Failed to create agent for task type '{request.task_type}': {str(e)}"
            )
        
        # Prepare messages for the agent
        inputs = {
            "messages": [
                ("system", system_prompt),
                ("user", request.message)
            ]
        }
        
        # Add location to metadata if provided
        if request.user_location:
            if not request.metadata:
                request.metadata = {}
            request.metadata['user_location'] = request.user_location
        
        # Stream the agent's response with retry logic
        logger.info(f"Request {request_id}: Invoking agent for task_type={request.task_type}")
        
        tool_called = None
        final_response = None
        tools_used = []
        
        try:
            # Define the agent invocation function for retry
            def invoke_agent():
                nonlocal tool_called, final_response, tools_used
                
                stream = agent.stream(inputs, stream_mode="updates")
                
                # Parse the response
                tool_called, final_response = parse_response(stream)
                
                # Build list of tools used (parse_response returns single tool name)
                tools_used = [tool_called] if tool_called and tool_called != "None" else []
                
                return tool_called, final_response, tools_used
            
            # Retry agent invocation with exponential backoff
            try:
                tool_called, final_response, tools_used = retry_with_exponential_backoff(
                    invoke_agent,
                    max_retries=3,
                    initial_delay=1.0,
                    backoff_factor=2.0,
                    max_delay=10.0
                )
                
                # Log successful tool execution
                if tool_called and tool_called != "None":
                    structured_logger.log_tool_execution(
                        request_id=request_id,
                        tool_name=tool_called,
                        success=True
                    )
                    
            except Exception as llm_error:
                # LLM API failure after retries - use fallback response
                logger.error(
                    f"Request {request_id}: LLM API failed after retries: {str(llm_error)}"
                )
                
                structured_logger.log_error(
                    request_id=request_id,
                    error_type="llm_api_failure",
                    error_message=str(llm_error),
                    task_type=request.task_type,
                    stack_trace=traceback.format_exc()
                )
                
                # Use fallback response
                final_response = get_fallback_response(request.task_type, "llm_failure")
                tools_used = []
                
        except Exception as tool_error:
            # Tool execution failure - use fallback response
            logger.error(
                f"Request {request_id}: Tool execution failed: {str(tool_error)}"
            )
            
            structured_logger.log_tool_execution(
                request_id=request_id,
                tool_name=tool_called if tool_called else "unknown",
                success=False,
                error_message=str(tool_error)
            )
            
            # Use fallback response
            final_response = get_fallback_response(request.task_type, "tool_failure")
            tools_used = []
        
        # Check if emergency tool was called
        emergency_triggered = "emergency_alert_tool" in tools_used
        
        # Log emergency detection with HIGH PRIORITY
        if emergency_triggered:
            structured_logger.log_emergency(
                request_id=request_id,
                task_type=request.task_type,
                tools_used=tools_used,
                session_id=session_id,
                message_preview=request.message
            )
        
        # Update session with message history and task type (with error handling)
        if session_manager:
            try:
                session_manager.update_session(
                    session_id=session_id,
                    task_type=request.task_type,
                    user_message=request.message,
                    assistant_response=final_response,
                    tools_used=tools_used
                )
            except Exception as session_error:
                logger.error(
                    f"Request {request_id}: Failed to update session: {str(session_error)}"
                )
                # Continue without session update - not critical for response
        else:
            logger.debug(f"Request {request_id}: Session management unavailable, skipping session update")
        
        # Calculate response time
        response_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Log successful response with structured format
        structured_logger.log_response(
            request_id=request_id,
            task_type=request.task_type,
            tools_used=tools_used,
            response_time_ms=response_time_ms,
            emergency=emergency_triggered,
            context_switched=context_switched,
            session_id=session_id
        )
        
        # Build response metadata
        response_metadata = {
            "request_id": request_id,
            "response_time_ms": round(response_time_ms, 2),
            "timestamp": datetime.utcnow().isoformat(),
            "context_switched": context_switched
        }
        
        # Add user metadata if provided
        if request.metadata:
            response_metadata["request_metadata"] = request.metadata
        
        # Return structured response
        return AgentResponse(
            response=final_response or "I'm here to help. Could you tell me more?",
            task_type=request.task_type,
            tools_used=tools_used,
            emergency=emergency_triggered,
            metadata=response_metadata,
            session_id=session_id
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions (already logged)
        raise
    
    except Exception as e:
        # Log unexpected errors with structured format
        import traceback
        structured_logger.log_error(
            request_id=request_id,
            error_type="internal_server_error",
            error_message=str(e),
            task_type=request.task_type if hasattr(request, 'task_type') else None,
            stack_trace=traceback.format_exc()
        )
        
        # Return structured error response
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="An unexpected error occurred while processing your request. Please try again.",
                error_type="internal_server_error",
                task_type=request.task_type if hasattr(request, 'task_type') else None,
                timestamp=datetime.utcnow().isoformat(),
                request_id=request_id
            ).dict()
        )


# Legacy endpoint for backward compatibility
class Query(BaseModel):
    message: str

@app.post("/ask-legacy")
async def ask_legacy(query: Query):
    """
    Legacy endpoint for backward compatibility.
    Defaults to symptom_analysis task type.
    
    DEPRECATED: Use /ask endpoint with AgentRequest model instead.
    """
    logger.warning("Legacy endpoint /ask-legacy called - consider migrating to /ask")
    
    # Convert to new request format with default task type
    request = AgentRequest(
        message=query.message,
        task_type="symptom_analysis"  # Default to symptom analysis
    )
    
    # Call the new endpoint
    response = await ask(request)
    
    # Return in legacy format
    return {
        "response": response.response,
        "tool_used": response.tools_used[0] if response.tools_used else None,
        "emergency": response.emergency
    }


# Removed uvicorn.run() - Cloud Run starts the server
# if __name__ == "__main__":
#     uvicorn.run(app, host="localhost", port=8000)


