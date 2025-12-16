"""
Unified Agent Factory for Task-Based AI Agent Configuration

This module provides the UnifiedAgentFactory class that dynamically creates
and configures LangGraph agents based on task type. It enables a single LLM
to handle multiple specialized medical assistance features by switching
context through task-specific system prompts and tool configurations.

The factory pattern ensures consistent agent creation while maintaining
separation between task configuration and agent logic.
"""

from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import MemorySaver

from task_config import TaskConfig, get_task_configs, validate_task_type


class UnifiedAgentFactory:
    """
    Factory for creating task-specific LangGraph agents.
    
    This class manages the creation of ReAct agents configured with
    task-specific system prompts and tool sets. It uses a single LLM
    instance across all task types to ensure consistency and efficiency.
    
    Attributes:
        llm: The ChatGoogleGenerativeAI instance used for all agents
        task_configs: Dictionary mapping task types to their configurations
    
    Example:
        >>> from langchain_google_genai import ChatGoogleGenerativeAI
        >>> llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite")
        >>> factory = UnifiedAgentFactory(llm, tools_dict)
        >>> agent = factory.create_agent("symptom_analysis")
        >>> prompt = factory.get_system_prompt("symptom_analysis")
    """
    
    def __init__(self, llm: ChatGoogleGenerativeAI, tools_dict: Optional[dict] = None):
        """
        Initialize the UnifiedAgentFactory.
        
        Args:
            llm: ChatGoogleGenerativeAI instance to use for all agents
            tools_dict: Optional dictionary mapping tool names to tool functions.
                       If not provided, task configs will have empty tool lists.
        
        Raises:
            ValueError: If llm is None
        """
        if llm is None:
            raise ValueError("LLM instance cannot be None")
        
        self.llm = llm
        self.task_configs = get_task_configs(tools_dict)
        
        # Initialize memory saver for conversation history (CRITICAL for context retention)
        self.checkpointer = MemorySaver()
    
    def create_agent(self, task_type: str) -> CompiledStateGraph:
        """
        Creates a LangGraph ReAct agent configured for the specified task type.
        
        This method dynamically binds the appropriate tools to the LLM based on
        the task type, creating a specialized agent that can only access tools
        relevant to its specific task.
        
        Args:
            task_type: One of 'symptom_analysis', 'doctor_matching', 
                      'health_qa', 'medication_info'
        
        Returns:
            CompiledGraph: A configured LangGraph agent ready to process messages
        
        Raises:
            ValueError: If task_type is not recognized or not in task_configs
        
        Example:
            >>> agent = factory.create_agent("symptom_analysis")
            >>> inputs = {
            ...     "messages": [
            ...         ("system", factory.get_system_prompt("symptom_analysis")),
            ...         ("user", "I have a headache and fever")
            ...     ]
            ... }
            >>> stream = agent.stream(inputs, stream_mode="updates")
        """
        # Validate task type
        if not validate_task_type(task_type):
            valid_types = list(self.task_configs.keys())
            raise ValueError(
                f"Unknown task type: '{task_type}'. "
                f"Valid task types are: {', '.join(valid_types)}"
            )
        
        # Get configuration for this task type
        config = self.task_configs.get(task_type)
        if not config:
            raise ValueError(f"No configuration found for task type: '{task_type}'")
        
        # Create ReAct agent with task-specific tools AND checkpointer for memory
        agent = create_react_agent(self.llm, tools=config.tools, checkpointer=self.checkpointer)
        
        return agent
    
    def get_system_prompt(self, task_type: str) -> str:
        """
        Returns the system prompt for the specified task type.
        
        The system prompt defines the agent's role, behavior, capabilities,
        and constraints for a specific task. It should be included as the
        first message when invoking the agent.
        
        Args:
            task_type: One of 'symptom_analysis', 'doctor_matching',
                      'health_qa', 'medication_info'
        
        Returns:
            str: The system prompt text for the specified task type
        
        Raises:
            ValueError: If task_type is not recognized or not in task_configs
        
        Example:
            >>> prompt = factory.get_system_prompt("doctor_matching")
            >>> print(prompt[:50])
            You are a Doctor Recommendation Assistant helping...
        """
        # Validate task type
        if not validate_task_type(task_type):
            valid_types = list(self.task_configs.keys())
            raise ValueError(
                f"Unknown task type: '{task_type}'. "
                f"Valid task types are: {', '.join(valid_types)}"
            )
        
        # Get configuration for this task type
        config = self.task_configs.get(task_type)
        if not config:
            raise ValueError(f"No configuration found for task type: '{task_type}'")
        
        return config.system_prompt
    
    def get_task_config(self, task_type: str) -> TaskConfig:
        """
        Returns the complete TaskConfig for the specified task type.
        
        This method provides access to the full configuration including
        description, tools, and session requirements.
        
        Args:
            task_type: One of 'symptom_analysis', 'doctor_matching',
                      'health_qa', 'medication_info'
        
        Returns:
            TaskConfig: The complete configuration object for the task type
        
        Raises:
            ValueError: If task_type is not recognized or not in task_configs
        
        Example:
            >>> config = factory.get_task_config("medication_info")
            >>> print(config.description)
            Provide information about medications and drug interactions
            >>> print(config.requires_session)
            False
        """
        # Validate task type
        if not validate_task_type(task_type):
            valid_types = list(self.task_configs.keys())
            raise ValueError(
                f"Unknown task type: '{task_type}'. "
                f"Valid task types are: {', '.join(valid_types)}"
            )
        
        # Get configuration for this task type
        config = self.task_configs.get(task_type)
        if not config:
            raise ValueError(f"No configuration found for task type: '{task_type}'")
        
        return config
    
    def get_supported_task_types(self) -> list[str]:
        """
        Returns a list of all supported task types.
        
        Returns:
            list[str]: List of task type identifiers
        
        Example:
            >>> factory.get_supported_task_types()
            ['symptom_analysis', 'doctor_matching', 'health_qa', 'medication_info']
        """
        return list(self.task_configs.keys())
    
    def validate_task_type(self, task_type: str) -> bool:
        """
        Validates if a task type is supported by this factory.
        
        Args:
            task_type: The task type string to validate
        
        Returns:
            bool: True if the task type is valid, False otherwise
        
        Example:
            >>> factory.validate_task_type("symptom_analysis")
            True
            >>> factory.validate_task_type("invalid_task")
            False
        """
        return task_type in self.task_configs
