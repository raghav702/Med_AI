"""
Session Management for Unified AI Agent

This module provides session tracking and context persistence for the unified
AI agent system. It maintains task type context across multiple messages and
ensures proper isolation between concurrent user sessions.

Key Features:
- Session tracking with unique session IDs
- Task type persistence across interactions
- Context switching detection and handling
- Session isolation for concurrent users
- Automatic session cleanup for expired sessions
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import uuid
import threading
from collections import defaultdict


@dataclass
class SessionContext:
    """
    Represents the context for a single user session.
    
    Attributes:
        session_id: Unique identifier for the session
        task_type: Current task type for this session
        created_at: Timestamp when session was created
        last_accessed: Timestamp of last activity
        message_history: List of messages in this session
        metadata: Additional session-specific data
    """
    session_id: str
    task_type: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_accessed: datetime = field(default_factory=datetime.utcnow)
    message_history: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def update_access_time(self):
        """Updates the last accessed timestamp to current time."""
        self.last_accessed = datetime.utcnow()
    
    def add_message(self, role: str, content: str, tools_used: Optional[List[str]] = None):
        """
        Adds a message to the session history.
        
        Args:
            role: Message role ('user', 'assistant', 'system')
            content: Message content
            tools_used: Optional list of tools used in generating response
        """
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "tools_used": tools_used or []
        }
        self.message_history.append(message)
    
    def switch_task_type(self, new_task_type: str) -> bool:
        """
        Switches the task type for this session.
        
        Args:
            new_task_type: The new task type to switch to
        
        Returns:
            True if task type changed, False if it was already the same
        """
        if self.task_type != new_task_type:
            old_task_type = self.task_type
            self.task_type = new_task_type
            self.update_access_time()
            
            # Log the context switch in metadata
            if 'context_switches' not in self.metadata:
                self.metadata['context_switches'] = []
            
            self.metadata['context_switches'].append({
                'from': old_task_type,
                'to': new_task_type,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            return True
        return False
    
    def is_expired(self, timeout_minutes: int = 30) -> bool:
        """
        Checks if the session has expired based on inactivity.
        
        Args:
            timeout_minutes: Number of minutes of inactivity before expiration
        
        Returns:
            True if session is expired, False otherwise
        """
        timeout_delta = timedelta(minutes=timeout_minutes)
        return datetime.utcnow() - self.last_accessed > timeout_delta


class SessionManager:
    """
    Manages user sessions for the unified AI agent system.
    
    This class provides thread-safe session management with support for:
    - Creating and retrieving sessions
    - Task type persistence and switching
    - Session isolation between concurrent users
    - Automatic cleanup of expired sessions
    
    Example:
        >>> manager = SessionManager()
        >>> session_id = manager.create_session("symptom_analysis")
        >>> context = manager.get_session(session_id)
        >>> manager.update_session(session_id, "doctor_matching", "user message")
    """
    
    def __init__(self, session_timeout_minutes: int = 30):
        """
        Initialize the SessionManager.
        
        Args:
            session_timeout_minutes: Minutes of inactivity before session expires
        """
        self._sessions: Dict[str, SessionContext] = {}
        self._lock = threading.RLock()  # Reentrant lock for thread safety
        self._session_timeout_minutes = session_timeout_minutes
    
    def create_session(self, task_type: str, session_id: Optional[str] = None) -> str:
        """
        Creates a new session with the specified task type.
        
        Args:
            task_type: Initial task type for the session
            session_id: Optional session ID to use (generates UUID if not provided)
        
        Returns:
            The session ID (either provided or generated)
        
        Example:
            >>> session_id = manager.create_session("symptom_analysis")
            >>> print(session_id)
            '550e8400-e29b-41d4-a716-446655440000'
        """
        with self._lock:
            if session_id is None:
                session_id = str(uuid.uuid4())
            
            # Create new session context
            context = SessionContext(
                session_id=session_id,
                task_type=task_type
            )
            
            self._sessions[session_id] = context
            return session_id
    
    def get_session(self, session_id: str) -> Optional[SessionContext]:
        """
        Retrieves a session by ID.
        
        Args:
            session_id: The session ID to retrieve
        
        Returns:
            SessionContext if found and not expired, None otherwise
        
        Example:
            >>> context = manager.get_session(session_id)
            >>> if context:
            ...     print(f"Task type: {context.task_type}")
        """
        with self._lock:
            context = self._sessions.get(session_id)
            
            if context is None:
                return None
            
            # Check if session is expired
            if context.is_expired(self._session_timeout_minutes):
                # Remove expired session
                del self._sessions[session_id]
                return None
            
            # Update access time
            context.update_access_time()
            return context
    
    def update_session(
        self,
        session_id: str,
        task_type: str,
        user_message: Optional[str] = None,
        assistant_response: Optional[str] = None,
        tools_used: Optional[List[str]] = None
    ) -> SessionContext:
        """
        Updates an existing session or creates a new one if it doesn't exist.
        
        This method handles:
        - Task type switching (context switching)
        - Message history tracking
        - Session access time updates
        
        Args:
            session_id: The session ID to update
            task_type: Current task type (may trigger context switch)
            user_message: Optional user message to add to history
            assistant_response: Optional assistant response to add to history
            tools_used: Optional list of tools used in response
        
        Returns:
            The updated SessionContext
        
        Example:
            >>> context = manager.update_session(
            ...     session_id="abc123",
            ...     task_type="doctor_matching",
            ...     user_message="Find me a cardiologist",
            ...     assistant_response="Here are some cardiologists...",
            ...     tools_used=["doctor_locator_tool"]
            ... )
        """
        with self._lock:
            context = self.get_session(session_id)
            
            # Create new session if it doesn't exist
            if context is None:
                self.create_session(task_type, session_id)
                context = self._sessions[session_id]
            
            # Handle task type switching
            context_switched = context.switch_task_type(task_type)
            
            # Add messages to history
            if user_message:
                context.add_message("user", user_message)
            
            if assistant_response:
                context.add_message("assistant", assistant_response, tools_used)
            
            # Update access time
            context.update_access_time()
            
            return context
    
    def delete_session(self, session_id: str) -> bool:
        """
        Deletes a session by ID.
        
        Args:
            session_id: The session ID to delete
        
        Returns:
            True if session was deleted, False if it didn't exist
        
        Example:
            >>> manager.delete_session(session_id)
            True
        """
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                return True
            return False
    
    def cleanup_expired_sessions(self) -> int:
        """
        Removes all expired sessions from the manager.
        
        Returns:
            Number of sessions that were cleaned up
        
        Example:
            >>> count = manager.cleanup_expired_sessions()
            >>> print(f"Cleaned up {count} expired sessions")
        """
        with self._lock:
            expired_sessions = [
                session_id
                for session_id, context in self._sessions.items()
                if context.is_expired(self._session_timeout_minutes)
            ]
            
            for session_id in expired_sessions:
                del self._sessions[session_id]
            
            return len(expired_sessions)
    
    def get_active_session_count(self) -> int:
        """
        Returns the number of active (non-expired) sessions.
        
        Returns:
            Count of active sessions
        
        Example:
            >>> count = manager.get_active_session_count()
            >>> print(f"Active sessions: {count}")
        """
        with self._lock:
            # Clean up expired sessions first
            self.cleanup_expired_sessions()
            return len(self._sessions)
    
    def get_session_stats(self) -> Dict[str, Any]:
        """
        Returns statistics about current sessions.
        
        Returns:
            Dictionary with session statistics including:
            - total_sessions: Total number of active sessions
            - sessions_by_task_type: Count of sessions per task type
            - average_messages_per_session: Average message count
            - context_switches_total: Total number of context switches
        
        Example:
            >>> stats = manager.get_session_stats()
            >>> print(f"Total sessions: {stats['total_sessions']}")
        """
        with self._lock:
            # Clean up expired sessions first
            self.cleanup_expired_sessions()
            
            if not self._sessions:
                return {
                    "total_sessions": 0,
                    "sessions_by_task_type": {},
                    "average_messages_per_session": 0,
                    "context_switches_total": 0
                }
            
            # Count sessions by task type
            sessions_by_task_type = defaultdict(int)
            total_messages = 0
            total_context_switches = 0
            
            for context in self._sessions.values():
                sessions_by_task_type[context.task_type] += 1
                total_messages += len(context.message_history)
                total_context_switches += len(context.metadata.get('context_switches', []))
            
            return {
                "total_sessions": len(self._sessions),
                "sessions_by_task_type": dict(sessions_by_task_type),
                "average_messages_per_session": total_messages / len(self._sessions),
                "context_switches_total": total_context_switches
            }
    
    def has_context_switched(self, session_id: str) -> bool:
        """
        Checks if a session has experienced any context switches.
        
        Args:
            session_id: The session ID to check
        
        Returns:
            True if context has switched at least once, False otherwise
        
        Example:
            >>> if manager.has_context_switched(session_id):
            ...     print("User has switched features")
        """
        with self._lock:
            context = self.get_session(session_id)
            if context is None:
                return False
            
            return len(context.metadata.get('context_switches', [])) > 0
    
    def get_context_switches(self, session_id: str) -> List[Dict[str, str]]:
        """
        Returns the history of context switches for a session.
        
        Args:
            session_id: The session ID to get switches for
        
        Returns:
            List of context switch records with 'from', 'to', and 'timestamp'
        
        Example:
            >>> switches = manager.get_context_switches(session_id)
            >>> for switch in switches:
            ...     print(f"Switched from {switch['from']} to {switch['to']}")
        """
        with self._lock:
            context = self.get_session(session_id)
            if context is None:
                return []
            
            return context.metadata.get('context_switches', [])


# Global session manager instance
_global_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """
    Returns the global SessionManager instance (singleton pattern).
    
    Creates the instance on first call.
    
    Returns:
        The global SessionManager instance
    
    Example:
        >>> manager = get_session_manager()
        >>> session_id = manager.create_session("symptom_analysis")
    """
    global _global_session_manager
    if _global_session_manager is None:
        _global_session_manager = SessionManager()
    return _global_session_manager


def reset_session_manager():
    """
    Resets the global session manager (useful for testing).
    
    Example:
        >>> reset_session_manager()  # Clear all sessions
    """
    global _global_session_manager
    _global_session_manager = None
