
# Import Required Packages

from langchain_core.tools import tool
from tools import (
    query_medgemma,         # Function that calls MedGemma LLM
    find_doctors_in_db,     # Function that queries your doctors DB
    call_emergency_service  # Function that triggers emergency call/alert
)

# -------------------------------
# TOOL 1: Medical Triage (MedGemma)
# -------------------------------
@tool
def medgemma_triage_tool(symptom_text: str) -> str:
    """
    Analyze symptoms using MedGemma LLM and return structured triage:
    severity, recommended actions, and suggested specialties.
    Use this when user shares symptoms, medical complaints, or asks
    for medical guidance of any kind.
    """
    # Sanitize input to prevent model instability
    if not symptom_text or len(symptom_text.strip()) == 0:
        return "Please provide symptom details for analysis."
    
    # Limit input length to prevent overflow
    sanitized_text = symptom_text.strip()[:1000]
    
    try:
        return query_medgemma(sanitized_text)
    except Exception as e:
        logger.error(f"MedGemma tool error: {str(e)}")
        return "I'm having trouble analyzing symptoms right now. Please consult a healthcare professional for immediate assistance."


# -------------------------------
# TOOL 2: Doctor Locator Tool
# -------------------------------
@tool
def doctor_locator_tool(specialty_and_location: str) -> str:
    """
    Returns the nearest 5 doctors based on specialty + user location.
    Expected input format: "specialty=<>, location=<city or lat,lon>"
    Example: "specialty=ENT, location=Delhi"
    """
    return find_doctors_in_db(specialty_and_location)


# -------------------------------
# TOOL 3: Emergency Tool
# -------------------------------
@tool
def emergency_alert_tool() -> None:
    """
    Trigger emergency action (call ambulance/emergency hotline).
    Use IMMEDIATELY when user describes:
        - chest pain
        - difficulty breathing
        - severe bleeding
        - loss of consciousness
        - stroke symptoms
        - ANY life-threatening condition
    """
    call_emergency_service()


# -------------------------------
# Create AI Agent + LangGraph
# -------------------------------
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from config import GOOGLE_API_KEY
import logging

logger = logging.getLogger(__name__)

tools = [
    medgemma_triage_tool,
    doctor_locator_tool,
    emergency_alert_tool
]

def create_llm_with_fallback():
    """Create LLM with fallback models if primary fails"""
    models_to_try = [
        {
            "model": "gemini-2.5-flash-lite",
            "temperature": 0.3,
            "max_tokens": 1024,
            "top_p": 0.8
        },
        {
            "model": "gemini-pro",
            "temperature": 0.2,
            "max_tokens": 1024,
            "top_p": 0.9
        }
    ]
    
    for i, config in enumerate(models_to_try):
        try:
            llm = ChatGoogleGenerativeAI(
                google_api_key=GOOGLE_API_KEY,
                **config
            )
            # Test the model with a simple query
            test_response = llm.invoke("Hello")
            logger.info(f"Successfully initialized {config['model']}")
            return llm
        except Exception as e:
            logger.warning(f"Failed to initialize {config['model']}: {str(e)}")
            if i == len(models_to_try) - 1:
                raise Exception(f"All model fallbacks failed. Last error: {str(e)}")
            continue

try:
    llm = create_llm_with_fallback()
    graph = create_react_agent(llm, tools=tools)
    logger.info("AI agent initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize AI agent: {str(e)}")
    raise


# -------------------------------
# SYSTEM PROMPT – (FINAL VERSION)
# -------------------------------
SYSTEM_PROMPT = """
You are an AI Orchestrator supporting safe and responsible medical symptom conversations.
You have access to three tools:

1. `medgemma_triage_tool`
   - Use this whenever the user mentions symptoms, health concerns, or medical questions.
   - The tool analyzes severity, suggests next steps, and identifies medical specialties.

2. `doctor_locator_tool`
   - Use this when:
       • MedGemma triage suggests a specialty, OR
       • The user asks for nearby doctors, OR
       • Recommending professional help is appropriate.
   - Pass both specialty and user location.

3. `emergency_alert_tool`
   - USE IMMEDIATELY if the user describes a medical emergency:
       chest pain, severe breathing problems, stroke signs,
       heavy bleeding, loss of consciousness, or any life-threatening condition.

BEHAVIOR GUIDELINES:
- Always prioritize safety and caution.
- Ask brief clarifying questions if needed for proper triage.
- Do NOT diagnose; provide supportive, medically safe guidance.
- Use tools whenever required; never hesitate in emergencies.
- Respond with warmth, clarity, and professionalism.

Your goal:
- Understand user intent
- Decide the correct tool(s)
- Provide medical guidance safely + send doctor recommendations when appropriate.
"""


# -------------------------------
# STREAM RESPONSE PARSER
# -------------------------------
def parse_response(stream):
    """
    Parse response stream with robust error handling for NaN values and model failures.
    """
    tool_called_name = "None"
    final_response = None
    
    try:
        for s in stream:
            try:
                tool_data = s.get('tools')
                if tool_data:
                    tool_messages = tool_data.get('messages')
                    if tool_messages and isinstance(tool_messages, list):
                        for msg in tool_messages:
                            tool_called_name = getattr(msg, 'name', 'None')

                agent_data = s.get('agent')
                if agent_data:
                    messages = agent_data.get('messages')
                    if messages and isinstance(messages, list):
                        for msg in messages:
                            if msg.content:
                                final_response = msg.content
            except Exception as chunk_error:
                logger.warning(f"Error processing stream chunk: {str(chunk_error)}")
                continue
                
    except Exception as stream_error:
        logger.error(f"Critical error in stream parsing: {str(stream_error)}")
        # Return safe fallback response
        final_response = "I'm experiencing technical difficulties. Please try rephrasing your question or contact support if the issue persists."
        tool_called_name = "None"

    # Validate final response
    if not final_response or final_response.strip() == "":
        final_response = "I'm here to help with your health questions. Could you please provide more details about what you'd like to know?"
    
    return tool_called_name, final_response


# -------------------------------
# OPTIONAL: Interactive Testing
# -------------------------------
"""
if __name__ == "__main__":
    while True:
        user_input = input("User: ")
        inputs = {"messages": [("system", SYSTEM_PROMPT), ("user", user_input)]}
        stream = graph.stream(inputs, stream_mode="updates")
        tool_called_name, final_response = parse_response(stream)
        print("TOOL CALLED:", tool_called_name)
        print("ANSWER:", final_response)
"""
