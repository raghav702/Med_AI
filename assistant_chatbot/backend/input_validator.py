"""
Input validation middleware for API security.

This module implements input validation to prevent malicious or excessive requests
from consuming API resources and generating unnecessary costs.
"""

import re
import logging
from typing import Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """
    Result of input validation with details about success/failure.
    
    Attributes:
        is_valid: Whether the input passed validation
        error_message: Human-readable error message if validation failed
        sanitized_message: Cleaned version of the message if applicable
    """
    is_valid: bool
    error_message: Optional[str] = None
    sanitized_message: Optional[str] = None


class InputValidator:
    """
    Validates and sanitizes incoming message requests.
    
    Implements validation rules for:
    - Message length limits
    - Suspicious pattern detection
    - Whitespace and empty message handling
    """
    
    def __init__(
        self,
        max_message_length: int = 1000,
        min_message_length: int = 1,
        max_repeated_chars: int = 10
    ):
        """
        Initialize input validator with configurable limits.
        
        Args:
            max_message_length: Maximum allowed message length in characters
            min_message_length: Minimum required message length
            max_repeated_chars: Maximum consecutive repeated characters allowed
        """
        self.max_message_length = max_message_length
        self.min_message_length = min_message_length
        self.max_repeated_chars = max_repeated_chars
        
        # Compile regex patterns for efficiency
        self.repeated_char_pattern = re.compile(r'(.)\1{' + str(max_repeated_chars) + ',}')
        self.excessive_whitespace_pattern = re.compile(r'\s{10,}')  # 10+ consecutive whitespace chars
        
        logger.info(
            f"InputValidator initialized: max_length={max_message_length}, "
            f"min_length={min_message_length}, max_repeated_chars={max_repeated_chars}"
        )
    
    def validate_message(self, message: str) -> ValidationResult:
        """
        Validate a message against all validation rules.
        
        Args:
            message: The message to validate
        
        Returns:
            ValidationResult with validation outcome and details
        """
        if not isinstance(message, str):
            return ValidationResult(
                is_valid=False,
                error_message="Message must be a string"
            )
        
        # Check message length
        if len(message) > self.max_message_length:
            return ValidationResult(
                is_valid=False,
                error_message=f"Message exceeds maximum length of {self.max_message_length} characters"
            )
        
        # Check for empty or whitespace-only messages
        if not message.strip():
            return ValidationResult(
                is_valid=False,
                error_message="Message cannot be empty or contain only whitespace"
            )
        
        # Check minimum length after stripping
        stripped_message = message.strip()
        if len(stripped_message) < self.min_message_length:
            return ValidationResult(
                is_valid=False,
                error_message=f"Message must be at least {self.min_message_length} character(s) long"
            )
        
        # Check for suspicious patterns
        if self.is_suspicious_pattern(message):
            return ValidationResult(
                is_valid=False,
                error_message="Message contains suspicious patterns that are not allowed"
            )
        
        # Message is valid, return sanitized version
        sanitized = self.sanitize_input(message)
        return ValidationResult(
            is_valid=True,
            sanitized_message=sanitized
        )
    
    def is_suspicious_pattern(self, message: str) -> bool:
        """
        Check if message contains suspicious patterns.
        
        Detects:
        - Excessive repeated characters (e.g., "aaaaaaaaaa")
        - Excessive whitespace sequences
        - Common spam patterns
        
        Args:
            message: Message to check
        
        Returns:
            True if suspicious patterns are detected
        """
        # Check for excessive repeated characters
        if self.repeated_char_pattern.search(message):
            logger.warning(f"Suspicious pattern detected: excessive repeated characters")
            return True
        
        # Check for excessive whitespace
        if self.excessive_whitespace_pattern.search(message):
            logger.warning(f"Suspicious pattern detected: excessive whitespace")
            return True
        
        # Check for common spam indicators
        spam_indicators = [
            r'(.{1,3})\1{20,}',  # Very short repeated sequences
            r'^[^a-zA-Z0-9\s]{20,}',  # Long sequences of special characters
            r'[A-Z]{50,}',  # Excessive uppercase
        ]
        
        for pattern in spam_indicators:
            if re.search(pattern, message):
                logger.warning(f"Suspicious pattern detected: spam indicator")
                return True
        
        return False
    
    def sanitize_input(self, message: str) -> str:
        """
        Sanitize input message by normalizing whitespace and removing control characters.
        
        Args:
            message: Message to sanitize
        
        Returns:
            Sanitized message
        """
        # Remove control characters (except newlines and tabs)
        sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', message)
        
        # Normalize whitespace (collapse multiple spaces/tabs to single space)
        sanitized = re.sub(r'[ \t]+', ' ', sanitized)
        
        # Normalize newlines (collapse multiple newlines to maximum of 2)
        sanitized = re.sub(r'\n{3,}', '\n\n', sanitized)
        
        # Strip leading/trailing whitespace
        sanitized = sanitized.strip()
        
        return sanitized
    
    def get_validation_stats(self) -> dict:
        """
        Get validation configuration statistics.
        
        Returns:
            Dictionary with validation settings
        """
        return {
            "max_message_length": self.max_message_length,
            "min_message_length": self.min_message_length,
            "max_repeated_chars": self.max_repeated_chars,
            "validation_patterns": {
                "repeated_chars": True,
                "excessive_whitespace": True,
                "spam_indicators": True
            }
        }