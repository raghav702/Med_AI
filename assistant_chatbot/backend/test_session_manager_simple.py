"""
Simple tests for Session Management System (no pytest required)

This module tests the session management functionality including:
- Session creation and retrieval
- Task type persistence
- Context switching
- Session isolation
"""

import time
from datetime import datetime, timedelta
from session_manager import (
    SessionManager,
    SessionContext,
    get_session_manager,
    reset_session_manager
)


def test_session_context_creation():
    """Test creating a new session context"""
    print("Testing session context creation...")
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
    print("✓ Session context creation test passed")


def test_add_message():
    """Test adding messages to session history"""
    print("Testing add message...")
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
    print("✓ Add message test passed")


def test_switch_task_type():
    """Test switching task type within a session"""
    print("Testing task type switching...")
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
    print("✓ Task type switching test passed")


def test_switch_to_same_task_type():
    """Test that switching to same task type returns False"""
    print("Testing switch to same task type...")
    context = SessionContext(
        session_id="test-123",
        task_type="symptom_analysis"
    )
    
    # Try to switch to same task type
    switched = context.switch_task_type("symptom_analysis")
    
    assert switched is False
    assert context.task_type == "symptom_analysis"
    assert "context_switches" not in context.metadata
    print("✓ Switch to same task type test passed")


def test_create_session():
    """Test creating a new session"""
    print("Testing session creation...")
    manager = SessionManager(session_timeout_minutes=30)
    session_id = manager.create_session("symptom_analysis")
    
    assert session_id is not None
    assert isinstance(session_id, str)
    
    # Verify session was created
    context = manager.get_session(session_id)
    assert context is not None
    assert context.task_type == "symptom_analysis"
    print("✓ Session creation test passed")


def test_create_session_with_custom_id():
    """Test creating a session with custom ID"""
    print("Testing session creation with custom ID...")
    manager = SessionManager(session_timeout_minutes=30)
    custom_id = "my-custom-session-123"
    session_id = manager.create_session("doctor_matching", custom_id)
    
    assert session_id == custom_id
    
    context = manager.get_session(custom_id)
    assert context is not None
    assert context.task_type == "doctor_matching"
    print("✓ Session creation with custom ID test passed")


def test_update_session_existing():
    """Test updating an existing session"""
    print("Testing session update...")
    manager = SessionManager(session_timeout_minutes=30)
    session_id = manager.create_session("symptom_analysis")
    
    context = manager.update_session(
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
    print("✓ Session update test passed")


def test_update_session_with_context_switch():
    """Test updating session with task type change"""
    print("Testing session update with context switch...")
    manager = SessionManager(session_timeout_minutes=30)
    session_id = manager.create_session("symptom_analysis")
    
    # First update with same task type
    manager.update_session(
        session_id=session_id,
        task_type="symptom_analysis",
        user_message="I have a headache"
    )
    
    # Second update with different task type (context switch)
    context = manager.update_session(
        session_id=session_id,
        task_type="doctor_matching",
        user_message="Find me a neurologist"
    )
    
    assert context.task_type == "doctor_matching"
    assert len(context.metadata.get("context_switches", [])) == 1
    assert context.metadata["context_switches"][0]["from"] == "symptom_analysis"
    assert context.metadata["context_switches"][0]["to"] == "doctor_matching"
    print("✓ Session update with context switch test passed")


def test_delete_session():
    """Test deleting a session"""
    print("Testing session deletion...")
    manager = SessionManager(session_timeout_minutes=30)
    session_id = manager.create_session("symptom_analysis")
    
    # Verify session exists
    assert manager.get_session(session_id) is not None
    
    # Delete session
    deleted = manager.delete_session(session_id)
    assert deleted is True
    
    # Verify session no longer exists
    assert manager.get_session(session_id) is None
    print("✓ Session deletion test passed")


def test_session_isolation():
    """Test that concurrent sessions are isolated from each other"""
    print("Testing session isolation...")
    manager = SessionManager(session_timeout_minutes=30)
    
    # Create two sessions with different task types
    session1 = manager.create_session("symptom_analysis")
    session2 = manager.create_session("doctor_matching")
    
    # Update both sessions
    manager.update_session(session1, "symptom_analysis", "Session 1 message")
    manager.update_session(session2, "doctor_matching", "Session 2 message")
    
    # Verify isolation
    context1 = manager.get_session(session1)
    context2 = manager.get_session(session2)
    
    assert context1.task_type == "symptom_analysis"
    assert context2.task_type == "doctor_matching"
    assert len(context1.message_history) == 1
    assert len(context2.message_history) == 1
    assert context1.message_history[0]["content"] == "Session 1 message"
    assert context2.message_history[0]["content"] == "Session 2 message"
    print("✓ Session isolation test passed")


def test_get_session_stats():
    """Test getting session statistics"""
    print("Testing session statistics...")
    manager = SessionManager(session_timeout_minutes=30)
    
    # Create sessions with different task types
    session1 = manager.create_session("symptom_analysis")
    session2 = manager.create_session("symptom_analysis")
    session3 = manager.create_session("doctor_matching")
    
    # Add messages and context switches
    manager.update_session(session1, "symptom_analysis", "Message 1")
    manager.update_session(session1, "doctor_matching", "Message 2")  # Context switch
    manager.update_session(session2, "symptom_analysis", "Message 3")
    
    stats = manager.get_session_stats()
    
    assert stats["total_sessions"] == 3
    assert stats["sessions_by_task_type"]["symptom_analysis"] == 1
    assert stats["sessions_by_task_type"]["doctor_matching"] == 2
    assert stats["context_switches_total"] == 1
    assert stats["average_messages_per_session"] > 0
    print("✓ Session statistics test passed")


def test_has_context_switched():
    """Test checking if a session has context switched"""
    print("Testing context switch detection...")
    manager = SessionManager(session_timeout_minutes=30)
    session_id = manager.create_session("symptom_analysis")
    
    # Initially no context switch
    assert manager.has_context_switched(session_id) is False
    
    # Perform context switch
    manager.update_session(session_id, "doctor_matching", "Find a doctor")
    
    # Now should have context switch
    assert manager.has_context_switched(session_id) is True
    print("✓ Context switch detection test passed")


def test_get_context_switches():
    """Test getting context switch history"""
    print("Testing context switch history...")
    manager = SessionManager(session_timeout_minutes=30)
    session_id = manager.create_session("symptom_analysis")
    
    # Perform multiple context switches
    manager.update_session(session_id, "doctor_matching", "Message 1")
    manager.update_session(session_id, "health_qa", "Message 2")
    manager.update_session(session_id, "medication_info", "Message 3")
    
    switches = manager.get_context_switches(session_id)
    
    assert len(switches) == 3
    assert switches[0]["from"] == "symptom_analysis"
    assert switches[0]["to"] == "doctor_matching"
    assert switches[1]["from"] == "doctor_matching"
    assert switches[1]["to"] == "health_qa"
    assert switches[2]["from"] == "health_qa"
    assert switches[2]["to"] == "medication_info"
    print("✓ Context switch history test passed")


def test_global_session_manager():
    """Test global session manager singleton"""
    print("Testing global session manager...")
    reset_session_manager()
    
    manager1 = get_session_manager()
    manager2 = get_session_manager()
    
    assert manager1 is manager2
    print("✓ Global session manager test passed")


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("Running Session Manager Tests")
    print("="*60 + "\n")
    
    tests = [
        test_session_context_creation,
        test_add_message,
        test_switch_task_type,
        test_switch_to_same_task_type,
        test_create_session,
        test_create_session_with_custom_id,
        test_update_session_existing,
        test_update_session_with_context_switch,
        test_delete_session,
        test_session_isolation,
        test_get_session_stats,
        test_has_context_switched,
        test_get_context_switches,
        test_global_session_manager,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"✗ {test.__name__} failed: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} error: {e}")
            failed += 1
    
    print("\n" + "="*60)
    print(f"Test Results: {passed} passed, {failed} failed")
    print("="*60 + "\n")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
