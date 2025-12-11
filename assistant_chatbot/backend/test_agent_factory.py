"""
Tests for UnifiedAgentFactory

This module tests the agent factory's ability to create task-specific
agents with correct configurations.
"""

from unittest.mock import Mock
from langchain_google_genai import ChatGoogleGenerativeAI
from agent_factory import UnifiedAgentFactory
from task_config import TaskConfig


def test_factory_initialization_with_llm():
    """Test that factory initializes correctly with an LLM instance."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    factory = UnifiedAgentFactory(llm)
    
    assert factory.llm is llm
    assert factory.task_configs is not None
    assert len(factory.task_configs) == 4


def test_factory_initialization_without_llm():
    """Test that factory raises ValueError when LLM is None."""
    try:
        UnifiedAgentFactory(None)
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "LLM instance cannot be None" in str(e)


def test_get_system_prompt_valid_task():
    """Test getting system prompt for valid task types."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    factory = UnifiedAgentFactory(llm)
    
    # Test all valid task types
    task_types = ["symptom_analysis", "doctor_matching", "health_qa", "medication_info"]
    
    for task_type in task_types:
        prompt = factory.get_system_prompt(task_type)
        assert isinstance(prompt, str)
        assert len(prompt) > 0
        print(f"✓ {task_type}: prompt length = {len(prompt)}")


def test_get_system_prompt_invalid_task():
    """Test that invalid task type raises ValueError."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    factory = UnifiedAgentFactory(llm)
    
    try:
        factory.get_system_prompt("invalid_task_type")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "Unknown task type" in str(e)


def test_create_agent_invalid_task():
    """Test that creating agent with invalid task type raises ValueError."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    factory = UnifiedAgentFactory(llm)
    
    try:
        factory.create_agent("invalid_task_type")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "Unknown task type" in str(e)


def test_get_task_config_valid_task():
    """Test getting task configuration for valid task types."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    factory = UnifiedAgentFactory(llm)
    
    config = factory.get_task_config("symptom_analysis")
    
    assert isinstance(config, TaskConfig)
    assert config.task_type == "symptom_analysis"
    assert config.description is not None
    assert isinstance(config.tools, list)


def test_get_task_config_invalid_task():
    """Test that invalid task type raises ValueError."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    factory = UnifiedAgentFactory(llm)
    
    try:
        factory.get_task_config("invalid_task_type")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "Unknown task type" in str(e)


def test_get_supported_task_types():
    """Test getting list of supported task types."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    factory = UnifiedAgentFactory(llm)
    
    task_types = factory.get_supported_task_types()
    
    assert isinstance(task_types, list)
    assert len(task_types) == 4
    assert "symptom_analysis" in task_types
    assert "doctor_matching" in task_types
    assert "health_qa" in task_types
    assert "medication_info" in task_types


def test_validate_task_type():
    """Test task type validation."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    factory = UnifiedAgentFactory(llm)
    
    # Valid task types
    assert factory.validate_task_type("symptom_analysis") is True
    assert factory.validate_task_type("doctor_matching") is True
    assert factory.validate_task_type("health_qa") is True
    assert factory.validate_task_type("medication_info") is True
    
    # Invalid task types
    assert factory.validate_task_type("invalid_task") is False
    assert factory.validate_task_type("") is False
    assert factory.validate_task_type("SYMPTOM_ANALYSIS") is False


def test_system_prompts_are_different():
    """Test that each task type has a unique system prompt."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    factory = UnifiedAgentFactory(llm)
    
    prompts = {}
    task_types = ["symptom_analysis", "doctor_matching", "health_qa", "medication_info"]
    
    for task_type in task_types:
        prompts[task_type] = factory.get_system_prompt(task_type)
    
    # Verify all prompts are different
    unique_prompts = set(prompts.values())
    assert len(unique_prompts) == 4, "Each task type should have a unique system prompt"


def test_factory_with_tools_dict():
    """Test factory initialization with tools dictionary."""
    llm = Mock(spec=ChatGoogleGenerativeAI)
    
    # Create mock tools
    mock_tool_1 = Mock()
    mock_tool_2 = Mock()
    mock_tool_3 = Mock()
    
    tools_dict = {
        'medgemma_triage_tool': mock_tool_1,
        'doctor_locator_tool': mock_tool_2,
        'emergency_alert_tool': mock_tool_3,
        'medication_lookup_tool': Mock(),
        'drug_interaction_tool': Mock()
    }
    
    factory = UnifiedAgentFactory(llm, tools_dict)
    
    # Verify tools are assigned correctly
    symptom_config = factory.get_task_config("symptom_analysis")
    assert len(symptom_config.tools) == 2  # medgemma_triage_tool, emergency_alert_tool
    
    doctor_config = factory.get_task_config("doctor_matching")
    assert len(doctor_config.tools) == 3  # medgemma_triage_tool, doctor_locator_tool, emergency_alert_tool


if __name__ == "__main__":
    # Run basic tests
    print("Running UnifiedAgentFactory tests...\n")
    
    test_factory_initialization_with_llm()
    print("✓ Factory initialization test passed")
    
    test_get_system_prompt_valid_task()
    print("✓ System prompt retrieval test passed")
    
    test_get_supported_task_types()
    print("✓ Supported task types test passed")
    
    test_validate_task_type()
    print("✓ Task type validation test passed")
    
    test_system_prompts_are_different()
    print("✓ Unique system prompts test passed")
    
    print("\n✅ All basic tests passed!")
