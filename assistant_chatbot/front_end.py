import streamlit as st
import requests
import uuid

backend_URL = "http://localhost:8000/ask"

st.set_page_config(
    page_title="AI Medical Assistant", 
    page_icon="🏥", 
    layout="wide"
)

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = []

if "task_type" not in st.session_state:
    st.session_state.task_type = "symptom_analysis"  # Default task type

if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())

if "emergency_alert" not in st.session_state:
    st.session_state.emergency_alert = False

# Title and description
st.title("🏥 AI Medical Assistant")
st.markdown("Select a feature below to get started with personalized medical assistance")

# Feature selection buttons
st.markdown("### Select a Feature")

col1, col2, col3, col4 = st.columns(4)

with col1:
    if st.button(
        "🩺 Symptom Analysis",
        use_container_width=True,
        type="primary" if st.session_state.task_type == "symptom_analysis" else "secondary"
    ):
        st.session_state.task_type = "symptom_analysis"
        st.session_state.emergency_alert = False
        st.rerun()

with col2:
    if st.button(
        "👨‍⚕️ Find Doctors",
        use_container_width=True,
        type="primary" if st.session_state.task_type == "doctor_matching" else "secondary"
    ):
        st.session_state.task_type = "doctor_matching"
        st.session_state.emergency_alert = False
        st.rerun()

with col3:
    if st.button(
        "❓ Health Q&A",
        use_container_width=True,
        type="primary" if st.session_state.task_type == "health_qa" else "secondary"
    ):
        st.session_state.task_type = "health_qa"
        st.session_state.emergency_alert = False
        st.rerun()

with col4:
    if st.button(
        "💊 Medication Info",
        use_container_width=True,
        type="primary" if st.session_state.task_type == "medication_info" else "secondary"
    ):
        st.session_state.task_type = "medication_info"
        st.session_state.emergency_alert = False
        st.rerun()

# Display current feature description
feature_descriptions = {
    "symptom_analysis": "🩺 **Symptom Analysis**: Describe your symptoms and get medical triage guidance with severity assessment and recommendations.",
    "doctor_matching": "👨‍⚕️ **Smart Doctor Matching**: Find suitable doctors based on your symptoms or specialty needs with location-based recommendations.",
    "health_qa": "❓ **24/7 Health Q&A**: Ask any health-related questions and get reliable, evidence-based medical information anytime.",
    "medication_info": "💊 **Medication Information**: Learn about medications, dosages, side effects, and potential drug interactions."
}

st.info(feature_descriptions[st.session_state.task_type])

# Display emergency alert if present
if st.session_state.emergency_alert:
    st.error("""
    ⚠️ **EMERGENCY DETECTED** ⚠️
    
    Based on your symptoms, you may need immediate medical attention.
    
    **Please take action now:**
    - 🚨 Call emergency services (112 in India, 911 in US)
    - 🏥 Go to the nearest emergency room
    - 📞 Contact your doctor immediately
    
    Do not wait for symptoms to worsen. Seek professional medical help right away.
    """)

# Divider
st.markdown("---")

# Chat interface
st.markdown("### Chat")

# Display chat messages from history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.write(message["content"])
        
        # Display metadata if available
        if message["role"] == "assistant" and "metadata" in message:
            with st.expander("ℹ️ Response Details"):
                metadata = message["metadata"]
                if "tools_used" in metadata and metadata["tools_used"]:
                    st.write(f"**Tools Used:** {', '.join(metadata['tools_used'])}")
                if "response_time_ms" in metadata:
                    st.write(f"**Response Time:** {metadata['response_time_ms']:.0f}ms")
                if "context_switched" in metadata and metadata["context_switched"]:
                    st.write("**Note:** Feature context was switched for this message")

# Chat input with dynamic placeholder based on task type
input_placeholders = {
    "symptom_analysis": "Describe your symptoms (e.g., 'I have a headache and fever')",
    "doctor_matching": "What kind of doctor do you need? (e.g., 'I need a cardiologist in Delhi')",
    "health_qa": "Ask any health question (e.g., 'What is diabetes?')",
    "medication_info": "Ask about a medication (e.g., 'Tell me about aspirin')"
}

user_input = st.chat_input(input_placeholders[st.session_state.task_type])

if user_input:
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": user_input})
    
    # Display user message
    with st.chat_message("user"):
        st.write(user_input)
    
    # Send request to backend with task_type
    try:
        with st.spinner("Processing your request..."):
            response = requests.post(
                backend_URL,
                json={
                    "message": user_input,
                    "task_type": st.session_state.task_type,
                    "session_id": st.session_state.session_id
                },
                timeout=30
            )
            
            if response.status_code == 200:
                response_data = response.json()
                backend_message = response_data["response"]
                emergency = response_data.get("emergency", False)
                tools_used = response_data.get("tools_used", [])
                metadata = response_data.get("metadata", {})
                
                # Update emergency alert state
                if emergency:
                    st.session_state.emergency_alert = True
                
                # Add assistant message to chat history with metadata
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": backend_message,
                    "metadata": {
                        "tools_used": tools_used,
                        "emergency": emergency,
                        "response_time_ms": metadata.get("response_time_ms", 0),
                        "context_switched": metadata.get("context_switched", False)
                    }
                })
                
                # Rerun to display the new message and emergency alert if needed
                st.rerun()
            else:
                error_message = f"Error: {response.status_code} - {response.text}"
                st.error(error_message)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": f"I apologize, but I encountered an error processing your request. Please try again. ({error_message})"
                })
    
    except requests.exceptions.Timeout:
        st.error("Request timed out. Please try again.")
        st.session_state.messages.append({
            "role": "assistant",
            "content": "I apologize, but the request took too long to process. Please try again."
        })
    
    except requests.exceptions.ConnectionError:
        st.error("Could not connect to the backend server. Please ensure the server is running.")
        st.session_state.messages.append({
            "role": "assistant",
            "content": "I apologize, but I cannot connect to the server. Please ensure the backend is running on http://localhost:8000"
        })
    
    except Exception as e:
        st.error(f"An unexpected error occurred: {str(e)}")
        st.session_state.messages.append({
            "role": "assistant",
            "content": f"I apologize, but an unexpected error occurred. Please try again. Error: {str(e)}"
        })

# Sidebar with additional information
with st.sidebar:
    st.markdown("### Session Information")
    st.write(f"**Session ID:** `{st.session_state.session_id[:8]}...`")
    st.write(f"**Current Feature:** {st.session_state.task_type.replace('_', ' ').title()}")
    st.write(f"**Messages:** {len(st.session_state.messages)}")
    
    st.markdown("---")
    
    if st.button("🔄 Clear Chat History", use_container_width=True):
        st.session_state.messages = []
        st.session_state.emergency_alert = False
        st.rerun()
    
    if st.button("🆕 New Session", use_container_width=True):
        st.session_state.messages = []
        st.session_state.session_id = str(uuid.uuid4())
        st.session_state.emergency_alert = False
        st.rerun()
    
    st.markdown("---")
    st.markdown("### About")
    st.markdown("""
    This AI Medical Assistant provides:
    - Symptom analysis and triage
    - Doctor recommendations
    - Health information
    - Medication guidance
    
    **⚠️ Disclaimer:** This is not a substitute for professional medical advice. Always consult healthcare providers for medical decisions.
    """)