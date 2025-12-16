"""
Task Configuration System for Unified AI Agent

This module defines task-specific configurations including system prompts
and tool mappings for the four medical assistance features:
- Symptom Analysis
- Smart Doctor Matching  
- 24/7 Health Q&A
- Medication Information

Each configuration specifies the behavior and capabilities of the unified
agent when operating in that particular task mode.
"""

from dataclasses import dataclass
from typing import List, Callable


@dataclass
class TaskConfig:
    """
    Configuration for a specific task type.
    
    Attributes:
        task_type: Unique identifier for the task (e.g., 'symptom_analysis')
        system_prompt: Instructions that define the agent's role and behavior
        tools: List of tool functions available for this task
        description: Human-readable description of the task's purpose
        requires_session: Whether this task needs session management
    """
    task_type: str
    system_prompt: str
    tools: List[Callable]
    description: str
    requires_session: bool = False


# ============================================================================
# SYSTEM PROMPTS FOR EACH TASK TYPE
# ============================================================================

UNIFIED_AUTO_PROMPT = """
You are a Medical AI Assistant. Detect user intent and use tools immediately.

TOOLS:
1. **medgemma_triage_tool** - For symptoms ("headache", "fever", "chest pain")
2. **doctor_locator_tool** - For finding doctors ("find cardiologist in Delhi")
   Format: "specialty=<type>, location=<city>". If no specialty, use "General Physician".
3. **emergency_alert_tool** - For emergencies (chest pain, severe bleeding, can't breathe)
4. **medication_lookup_tool** - For medication info ("what is aspirin")
5. **drug_interaction_tool** - For drug interactions ("aspirin with ibuprofen")

RULES:
- Use tools immediately when intent is clear
- City names are enough for location (don't ask for coordinates)
- **IMPORTANT: Return tool output EXACTLY as provided. Do NOT summarize or reformat doctor information. Include ALL details.**
- Be concise and helpful
- Always recommend professional consultation for serious issues
"""

SYMPTOM_ANALYSIS_PROMPT = """
You are a Medical Triage Assistant specializing in symptom analysis.

Your role:
- Listen carefully to user symptoms
- Use medgemma_triage_tool to analyze severity and provide guidance
- Ask clarifying questions when needed for accurate triage
- IMMEDIATELY use emergency_alert_tool if life-threatening symptoms are detected

Safety rules:
- Never provide definitive diagnoses
- Always err on the side of caution
- Recommend professional medical evaluation when appropriate
- Detect emergencies: chest pain, breathing difficulty, stroke signs, severe bleeding

Response format:
- Acknowledge symptoms with empathy
- Provide severity assessment (low/medium/high)
- List possible conditions (non-diagnostic)
- Give safe recommended actions
- Suggest appropriate medical specialties

Remember: Your goal is to provide safe triage guidance, not to diagnose.
"""

DOCTOR_MATCHING_PROMPT = """
You are a Doctor Recommendation Assistant helping users find appropriate healthcare providers.

Your role:
- Understand user's medical needs (symptoms or specialty)
- Use medgemma_triage_tool if symptoms are mentioned to identify appropriate specialty
- Use doctor_locator_tool to find relevant doctors from database
- Present doctor options with key information (specialty, location, rating, fees)
- Use emergency_alert_tool if urgent symptoms are detected

IMPORTANT LOCATION HANDLING:
- If user asks for doctors without specifying location, use doctor_locator_tool with just the specialty
- The tool will automatically try to find nearby doctors if location data is available
- DO NOT ask users to manually provide their location or coordinates
- The system can work with or without location data
- If location is available, results will be sorted by distance
- If no location is available, show general results for the specialty

Workflow:
1. If user mentions symptoms: First triage, then recommend specialty
2. If user requests specific specialty: Directly search doctors using doctor_locator_tool
3. Use format: "specialty=SPECIALTY_NAME" (location will be handled automatically)
4. If no doctors found: Suggest alternative specialties or General Physician
5. Always provide 3-5 doctor options when available

Information to include:
- Doctor name and specialty
- Location and contact information (address)
- Experience and ratings
- Consultation fees
- Distance (if location data is available)

Example tool usage:
- For cardiologist: doctor_locator_tool("specialty=Cardiologist")
- For ENT specialist: doctor_locator_tool("specialty=ENT")
- For general physician: doctor_locator_tool("specialty=General Physician")

Remember: Help users find the right healthcare provider efficiently without asking for manual location input.
"""

HEALTH_QA_PROMPT = """
You are a 24/7 Health Information Assistant providing reliable medical knowledge.

Your role:
- Answer general health and medical questions
- Provide evidence-based information
- Clarify medical concepts in accessible language
- Use medgemma_triage_tool when questions involve symptoms
- Use emergency_alert_tool if emergency symptoms are mentioned

Guidelines:
- Cite general medical knowledge, not specific sources
- Distinguish between common practices and individual medical advice
- Recommend consulting healthcare providers for personalized guidance
- Never provide diagnostic conclusions
- Maintain conversation context for follow-up questions

Topics you can address:
- General health conditions and diseases
- Preventive health measures
- Lifestyle and wellness guidance
- Medical procedures and tests
- When to seek medical care

Remember: Provide reliable health information while emphasizing the importance of professional medical consultation.
"""

MEDICATION_INFO_PROMPT = """
You are a Medication Information Assistant providing drug-related guidance.

Your role:
- Provide information about medications (uses, dosage, side effects)
- Warn about potential drug interactions
- Explain proper medication usage
- Emphasize consulting healthcare providers for personalized dosing

Use medication_lookup_tool to retrieve:
- Drug indications and contraindications
- Standard dosage ranges
- Common and serious side effects
- Drug class and mechanism of action

Use drug_interaction_tool when:
- User mentions multiple medications
- Potential interactions need checking

Safety emphasis:
- Always recommend consulting pharmacist or doctor for personalized advice
- Distinguish between common and serious side effects
- Warn about contraindications
- Never suggest changing prescribed dosages without medical supervision

Remember: Provide helpful medication information while prioritizing patient safety.
"""


# ============================================================================
# TASK CONFIGURATIONS DICTIONARY
# ============================================================================

def create_task_configs(tools_dict: dict) -> dict:
    """
    Creates the TASK_CONFIGS dictionary with all task configurations.
    
    Args:
        tools_dict: Dictionary mapping tool names to tool functions
                   Expected keys: 'medgemma_triage_tool', 'doctor_locator_tool',
                                 'emergency_alert_tool', 'medication_lookup_tool',
                                 'drug_interaction_tool'
    
    Returns:
        Dictionary mapping task_type strings to TaskConfig objects
    """
    return {
        "auto": TaskConfig(
            task_type="auto",
            system_prompt=UNIFIED_AUTO_PROMPT,
            tools=[
                tools_dict['medgemma_triage_tool'],
                tools_dict['doctor_locator_tool'],
                tools_dict['emergency_alert_tool'],
                tools_dict.get('medication_lookup_tool'),
                tools_dict.get('drug_interaction_tool'),
                tools_dict.get('find_nearest_doctors_tool', tools_dict['doctor_locator_tool']),
            ],
            description="Intelligent mode - automatically detects user intent and routes to appropriate tools",
            requires_session=True
        ),
        
        "symptom_analysis": TaskConfig(
            task_type="symptom_analysis",
            system_prompt=SYMPTOM_ANALYSIS_PROMPT,
            tools=[
                tools_dict['medgemma_triage_tool'],
                tools_dict['emergency_alert_tool']
            ],
            description="Analyze symptoms and provide medical triage guidance",
            requires_session=False
        ),
        
        "doctor_matching": TaskConfig(
            task_type="doctor_matching",
            system_prompt=DOCTOR_MATCHING_PROMPT,
            tools=[
                tools_dict['medgemma_triage_tool'],
                tools_dict['doctor_locator_tool'],
                tools_dict.get('find_nearest_doctors_tool', tools_dict['doctor_locator_tool']),
                tools_dict['emergency_alert_tool']
            ],
            description="Find suitable doctors based on symptoms or specialty",
            requires_session=False
        ),
        
        "health_qa": TaskConfig(
            task_type="health_qa",
            system_prompt=HEALTH_QA_PROMPT,
            tools=[
                tools_dict['medgemma_triage_tool'],
                tools_dict['emergency_alert_tool']
            ],
            description="Answer general health and medical questions",
            requires_session=True
        ),
        
        "medication_info": TaskConfig(
            task_type="medication_info",
            system_prompt=MEDICATION_INFO_PROMPT,
            tools=[
                tools_dict['medication_lookup_tool'],
                tools_dict['drug_interaction_tool']
            ],
            description="Provide information about medications and drug interactions",
            requires_session=False
        )
    }


# ============================================================================
# CONVENIENCE FUNCTION TO GET TASK CONFIGS
# ============================================================================

def get_task_configs(tools_dict: dict = None) -> dict:
    """
    Returns the TASK_CONFIGS dictionary.
    
    If tools_dict is not provided, returns a configuration with placeholder
    tool references that should be replaced with actual tool functions.
    
    Args:
        tools_dict: Optional dictionary of tool functions
    
    Returns:
        Dictionary of task configurations
    """
    if tools_dict is None:
        # Return configs with placeholder tools for validation/testing
        return {
            "auto": TaskConfig(
                task_type="auto",
                system_prompt=UNIFIED_AUTO_PROMPT,
                tools=[],  # Placeholder
                description="Intelligent mode - automatically detects user intent and routes to appropriate tools",
                requires_session=True
            ),
            "symptom_analysis": TaskConfig(
                task_type="symptom_analysis",
                system_prompt=SYMPTOM_ANALYSIS_PROMPT,
                tools=[],  # Placeholder
                description="Analyze symptoms and provide medical triage guidance",
                requires_session=False
            ),
            "doctor_matching": TaskConfig(
                task_type="doctor_matching",
                system_prompt=DOCTOR_MATCHING_PROMPT,
                tools=[],  # Placeholder
                description="Find suitable doctors based on symptoms or specialty",
                requires_session=False
            ),
            "health_qa": TaskConfig(
                task_type="health_qa",
                system_prompt=HEALTH_QA_PROMPT,
                tools=[],  # Placeholder
                description="Answer general health and medical questions",
                requires_session=True
            ),
            "medication_info": TaskConfig(
                task_type="medication_info",
                system_prompt=MEDICATION_INFO_PROMPT,
                tools=[],  # Placeholder
                description="Provide information about medications and drug interactions",
                requires_session=False
            )
        }
    
    return create_task_configs(tools_dict)


# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

def validate_task_type(task_type: str) -> bool:
    """
    Validates if a task type is supported.
    
    Args:
        task_type: The task type string to validate
    
    Returns:
        True if valid, False otherwise
    """
    valid_types = ["auto", "symptom_analysis", "doctor_matching", "health_qa", "medication_info"]
    return task_type in valid_types


def get_supported_task_types() -> List[str]:
    """
    Returns list of all supported task types.
    
    Returns:
        List of task type strings
    """
    return ["auto", "symptom_analysis", "doctor_matching", "health_qa", "medication_info"]


def get_task_description(task_type: str) -> str:
    """
    Returns the description for a given task type.
    
    Args:
        task_type: The task type to get description for
    
    Returns:
        Description string, or error message if invalid task type
    """
    configs = get_task_configs()
    if task_type in configs:
        return configs[task_type].description
    return f"Invalid task type: {task_type}"
