"""
Tests for Session Management System

This module tests the session management functionality including:
- Session creation and retrieval
- Task type persistence
- Context switching
- Session isolation
- Session expiration and cleanup
"""

import pytest
import time
from datetime import datetime, timedelta
from session_manager import (
    SessionManager,
    SessionContext,
    get_session_manager,
    reset_session_manager
)


class TestSessionContext:
    """Tests for SessionContext dataclass"""
    
    def test_session_context_creation(self):
        """Test creating a new session context"""
        context = SessionContext(
            session_id="test-123",
            task_type="symptom_analysis"
        )
        
        assert context.session_id == "test-123"
        assert context.task_type == "symptom_analysis"
        assert isinstance(context.created_at, datetime)
        assert isinstance(context.last_accessed, datetime)
        assert context.message_history == []
        assert context.metadata == {}
    
    def test_update_access_time(self):
        """Test updating last accessed timestamp"""
        context = SessionContext(
            session_id="test-123",
            task_type="symptom_analysis"
        )
        
        original_time = context.last_accessed
        time.sleep(0.01)  # Small delay
        context.update_access_time()
        
        assert context.last_accessed > original_time
    
    def test_add_message(self):
        """Test adding messages to session history"""
        context = SessionContext(
            session_id="test-123",
            task_type="symptom_analysis"
        )
        
        context.add_message("user", "I have a headache")
        context.add_message("assistant", "I can help with that", ["medgemma_triage_tool"])
        
        assert len(context.message_history) == 2
        assert context.message_history[0]["role"] == "user"
        assert context.message_history[0]["content"] == "I have a headache"
        assert context.message_history[1]["role"] == "assistant"
        assert context.message_history[1]["tools_used"] == ["medgemma_triage_tool"]
    
    def test_switch_task_type(self):
        """Test switching task type within a session"""
        context = SessionContext(
            session_id="test-123",
            task_type="symptom_analysis"
        )
        
        # Switch to different task type
        switched = context.switch_task_type("doctor_matching")
        
        assert switched is True
        assert context.task_type == "doctor_matching"
        assert "context_switches" in context.metadata
        assert len(context.metadata["context_switches"]) == 1
        assert context.metadata["context_switches"][0]["from"] == "symptom_analysis"
        assert context.metadata["context_switches"][0]["to"] == "doctor_matching"
    
    def test_switch_to_same_task_type(self):
        """Test that switching to same task type returns False"""
        context = SessionContext(
            session_id="test-123",
            task_type="symptom_analysis"
        )
        
        # Try to switch to same task type
        switched = context.switch_task_type("symptom_analysis")
        
        assert switched is False
        assert context.task_type == "symptom_analysis"
        assert "context_switches" not in context.metadata
    
    def test_is_expired(self):
        """Test session expiration detection"""
        context = SessionContext(
            session_id="test-123",
            task_type="symptom_analysis"
        )
        
        # Fresh session should not be expired
        assert context.is_expired(timeout_minutes=30) is False
        
        # Manually set last_accessed to past
        context.last_accessed = datetime.utcnow() - timedelta(minutes=31)
        
        # Now should be expired
        assert context.is_expired(timeout_minutes=30) is True


class TestSessionManager:
    """Tests for SessionManager class"""
    
    def setup_method(self):
        """Create a fresh SessionManager for each test"""
        self.manager = SessionManager(session_timeout_minutes=30)
    
    def test_create_session(self):
        """Test creating a new session"""
        session_id = self.manager.create_session("symptom_analysis")
        
        assert session_id is not None
        assert isinstance(session_id, str)
        
        # Verify session was created
        context = self.manager.get_session(session_id)
        assert context is not None
        assert context.task_type == "symptom_analysis"
    
    def test_create_session_with_custom_id(self):
        """Test creating a session with custom ID"""
        custom_id = "my-custom-session-123"
        session_id = self.manager.create_session("doctor_matching", custom_id)
        
        assert session_id == custom_id
        
        context = self.manager.get_session(custom_id)
        assert context is not None
        assert context.task_type == "doctor_matching"
    
    def test_get_session_nonexistent(self):
        """Test getting a session that doesn't exist"""
        context = self.manager.get_session("nonexistent-id")
        assert context is None
    
    def test_get_session_updates_access_time(self):
        """Test that getting a session updates its access time"""
        session_id = self.manager.create_session("symptom_analysis")
        context1 = self.manager.get_session(session_id)
        original_time = context1.last_accessed
        
        time.sleep(0.01)
        context2 = self.manager.get_session(session_id)
        
        assert context2.last_accessed > original_time
    
    def test_update_session_existing(self):
        """Test updating an existing session"""
        session_id = self.manager.create_session("symptom_analysis")
        
        context = self.manager.update_session(
            session_id=session_id,
            task_type="symptom_analysis",
            user_message="I have a fever",
            assistant_response="Let me help you with that",
            tools_used=["medgemma_triage_tool"]
        )
        
        assert context.session_id == session_id
        assert len(context.message_history) == 2
        assert context.message_history[0]["content"] == "I have a fever"
        assert context.message_history[1]["tools_used"] == ["medgemma_triage_tool"]
    
    def test_update_session_creates_if_not_exists(self):
        """Test that update_session creates a new session if it doesn't exist"""
        new_session_id = "new-session-456"
        
        context = self.manager.update_session(
            session_id=new_session_id,
            task_type="health_qa",
            user_message="What is diabetes?"
        )
        
        assert context.session_id == new_session_id
        assert context.task_type == "health_qa"
        assert len(context.message_history) == 1
    
    def test_update_session_with_context_switch(self):
        """Test updating session with task type change"""
        session_id = self.manager.create_session("symptom_analysis")
        
        # First update with same task type
        self.manager.update_session(
            session_id=session_id,
            task_type="symptom_analysis",
            user_message="I have a headache"
        )
        
        # Second update with different task type (context switch)
        context = self.manager.update_session(
            session_id=session_id,
            task_type="doctor_matching",
            user_message="Find me a neurologist"
        )
        
        assert context.task_type == "doctor_matching"
        assert len(context.metadata.get("context_switches", [])) == 1
        assert context.metadata["context_switches"][0]["from"] == "symptom_analysis"
        assert context.metadata["context_switches"][0]["to"] == "doctor_matching"
    
    def test_delete_session(self):
        """Test deleting a session"""
        session_id = self.manager.create_session("symptom_analysis")
        
        # Verify session exists
        assert self.manager.get_session(session_id) is not None
        
        # Delete session
        deleted = self.manager.delete_session(session_id)
        assert deleted is True
        
        # Verify session no longer exists
        assert self.manager.get_session(session_id) is None
    
    def test_delete_nonexistent_session(self):
        """Test deleting a session that doesn't exist"""
        deleted = self.manager.delete_session("nonexistent-id")
        assert deleted is False
    
    def test_cleanup_expired_sessions(self):
        """Test cleaning up expired sessions"""
        # Create multiple sessions
        session1 = self.manager.create_session("symptom_analysis")
        session2 = self.manager.create_session("doctor_matching")
        session3 = self.manager.create_session("health_qa")
        
        # Manually expire session2
        context2 = self.manager.get_session(session2)
        context2.last_accessed = datetime.utcnow() - timedelta(minutes=31)
        
        # Clean up expired sessions
        count = self.manager.cleanup_expired_sessions()
        
        assert count == 1
        assert self.manager.get_session(session1) is not None
        assert self.manager.get_session(session2) is None  # Expired
        assert self.manager.get_session(session3) is not None
    
    def test_get_active_session_count(self):
        """Test getting count of active sessions"""
        assert self.manager.get_active_session_count() == 0
        
        # Create sessions
        self.manager.create_session("symptom_analysis")
        self.manager.create_session("doctor_matching")
        
        assert self.manager.get_active_session_count() == 2
    
    def test_get_session_stats(self):
        """Test getting session statistics"""
        # Create sessions with different task types
        session1 = self.manager.create_session("symptom_analysis")
        session2 = self.manager.create_session("symptom_analysis")
        session3 = self.manager.create_session("doctor_matching")
        
        # Add messages and context switches
        self.manager.update_session(session1, "symptom_analysis", "Message 1")
        self.manager.update_session(session1, "doctor_matching", "Message 2")  # Context switch
        self.manager.update_session(session2, "symptom_analysis", "Message 3")
        
        stats = self.manager.get_session_stats()
        
        assert stats["total_sessions"] == 3
        assert stats["sessions_by_task_type"]["symptom_analysis"] == 1
        assert stats["sessions_by_task_type"]["doctor_matching"] == 2
        assert stats["context_switches_total"] == 1
        assert stats["average_messages_per_session"] > 0
    
    def test_has_context_switched(self):
        """Test checking if a session has context switched"""
        session_id = self.manager.create_session("symptom_analysis")
        
        # Initially no context switch
        assert self.manager.has_context_switched(session_id) is False
        
        # Perform context switch
        self.manager.update_session(session_id, "doctor_matching", "Find a doctor")
        
        # Now should have context switch
        assert self.manager.has_context_switched(session_id) is True
    
    def test_get_context_switches(self):
        """Test getting context switch history"""
        session_id = self.manager.create_session("symptom_analysis")
        
        # Perform multiple context switches
        self.manager.update_session(session_id, "doctor_matching", "Message 1")
        self.manager.update_session(session_id, "health_qa", "Message 2")
        self.manager.update_session(session_id, "medication_info", "Message 3")
        
        switches = self.manager.get_context_switches(session_id)
        
        assert len(switches) == 3
        assert switches[0]["from"] == "symptom_analysis"
        assert switches[0]["to"] == "doctor_matching"
        assert switches[1]["from"] == "doctor_matching"
        assert switches[1]["to"] == "health_qa"
        assert switches[2]["from"] == "health_qa"
        assert switches[2]["to"] == "medication_info"
    
    def test_session_isolation(self):
        """Test that concurrent sessions are isolated from each other"""
        # Create two sessions with different task types
        session1 = self.manager.create_session("symptom_analysis")
        session2 = self.manager.create_session("doctor_matching")
        
        # Update both sessions
        self.manager.update_session(session1, "symptom_analysis", "Session 1 message")
        self.manager.update_session(session2, "doctor_matching", "Session 2 message")
        
        # Verify isolation
        context1 = self.manager.get_session(session1)
        context2 = self.manager.get_session(session2)
        
        assert context1.task_type == "symptom_analysis"
        assert context2.task_type == "doctor_matching"
        assert len(context1.message_history) == 1
        assert len(context2.message_history) == 1
        assert context1.message_history[0]["content"] == "Session 1 message"
        assert context2.message_history[0]["content"] == "Session 2 message"


class TestGlobalSessionManager:
    """Tests for global session manager singleton"""
    
    def setup_method(self):
        """Reset global session manager before each test"""
        reset_session_manager()
    
    def test_get_session_manager_singleton(self):
        """Test that get_session_manager returns singleton instance"""
        manager1 = get_session_manager()
        manager2 = get_session_manager()
        
        assert manager1 is manager2
    
    def test_reset_session_manager(self):
        """Test resetting the global session manager"""
        manager1 = get_session_manager()
        session_id = manager1.create_session("symptom_analysis")
        
        # Reset
        reset_session_manager()
        
        # Get new manager
        manager2 = get_session_manager()
        
        # Should be different instance
        assert manager1 is not manager2
        
        # Session should not exist in new manager
        assert manager2.get_session(session_id) is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
