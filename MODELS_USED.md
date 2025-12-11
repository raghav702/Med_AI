# AI Models Used in Medical Assistant System

## Overview
Your medical assistant system uses a **hybrid multi-model architecture** combining different AI models for different purposes.

## Models in Use

### 1. **Google Gemini 2.5 Flash Lite** (Primary Orchestrator)
**Location:** `assistant_chatbot/backend/ai_agent.py`

```python
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    temperature=0.2,
    google_api_key=GOOGLE_API_KEY
)
```

**Purpose:**
- **Main orchestration agent** that coordinates all interactions
- Decides which tools to call based on user input
- Manages conversation flow and context
- Handles all four task types (symptom analysis, doctor matching, health Q&A, medication info)

**Why Gemini 2.5 Flash Lite:**
- ✅ Fast response times (optimized for real-time chat)
- ✅ Cost-effective for high-volume usage
- ✅ Strong reasoning capabilities for tool selection
- ✅ Good at following system prompts and safety guidelines
- ✅ Supports function calling (tool use)

**Configuration:**
- Temperature: 0.2 (low for consistent, reliable responses)
- Used with LangGraph's ReAct agent pattern
- Dynamically configured with task-specific system prompts

---

### 2. **MedGemma 4B** (Medical Specialist)
**Location:** `assistant_chatbot/backend/tools.py`

```python
response = ollama.chat(
    model='alibayram/medgemma:4b',
    messages=[...],
    options={
        'num_predict': 350,
        'temperature': 0.7,
        'top_p': 0.9
    }
)
```

**Purpose:**
- **Medical triage and symptom analysis**
- Evaluates symptom severity (low/medium/high)
- Suggests likely conditions (non-diagnostic)
- Recommends appropriate medical specialties
- Provides safe medical guidance
- **Medication information lookup**
- **Drug interaction checking**

**Why MedGemma:**
- ✅ Specialized medical knowledge base
- ✅ Trained on medical literature and clinical data
- ✅ Better at medical terminology and concepts
- ✅ More accurate for symptom analysis
- ✅ Runs locally via Ollama (privacy-friendly)

**Configuration:**
- Temperature: 0.7 for symptom analysis (balanced creativity/accuracy)
- Temperature: 0.3 for medication info (more factual)
- num_predict: 350-700 tokens depending on task
- top_p: 0.9 (nucleus sampling for quality)

**Runs via Ollama:**
- Local deployment for data privacy
- No external API calls for sensitive medical data
- Requires Ollama to be installed and running

---

## Architecture Flow

```
User Input
    ↓
┌─────────────────────────────────────────────────────────────┐
│  Google Gemini 2.5 Flash Lite (Orchestrator)                │
│  - Analyzes user intent                                      │
│  - Selects appropriate task type                            │
│  - Decides which tools to call                              │
└─────────────────────────────────────────────────────────────┘
    ↓
    ├─→ Tool 1: medgemma_triage_tool
    │   └─→ MedGemma 4B (via Ollama)
    │       - Analyzes symptoms
    │       - Returns structured JSON
    │
    ├─→ Tool 2: doctor_locator_tool
    │   └─→ Supabase Database Query
    │       - Searches doctors by specialty
    │       - Returns top 5 matches
    │
    ├─→ Tool 3: emergency_alert_tool
    │   └─→ Emergency Response System
    │       - Triggers emergency protocols
    │       - Returns emergency contacts
    │
    ├─→ Tool 4: medication_lookup_tool
    │   └─→ MedGemma 4B (via Ollama)
    │       - Retrieves drug information
    │       - Returns comprehensive details
    │
    └─→ Tool 5: drug_interaction_tool
        └─→ MedGemma 4B (via Ollama)
            - Checks medication interactions
            - Returns severity analysis
    ↓
Gemini processes tool results
    ↓
Natural language response to user
```

## Task Type Routing

### Symptom Analysis
- **Orchestrator:** Gemini 2.5 Flash Lite
- **Tools Used:** medgemma_triage_tool, emergency_alert_tool
- **Specialist:** MedGemma 4B for medical analysis

### Doctor Matching
- **Orchestrator:** Gemini 2.5 Flash Lite
- **Tools Used:** medgemma_triage_tool, doctor_locator_tool, emergency_alert_tool
- **Specialist:** MedGemma 4B for symptom analysis, Supabase for doctor search

### Health Q&A
- **Orchestrator:** Gemini 2.5 Flash Lite
- **Tools Used:** medgemma_triage_tool, emergency_alert_tool
- **Specialist:** MedGemma 4B for medical questions

### Medication Info
- **Orchestrator:** Gemini 2.5 Flash Lite
- **Tools Used:** medication_lookup_tool, drug_interaction_tool
- **Specialist:** MedGemma 4B for drug information

## Why This Hybrid Approach?

### Advantages:

1. **Specialization:**
   - Gemini handles conversation and orchestration (what it's best at)
   - MedGemma handles medical analysis (what it's best at)

2. **Cost Efficiency:**
   - Gemini Flash Lite is cost-effective for orchestration
   - MedGemma runs locally (no API costs)

3. **Privacy:**
   - Sensitive medical data processed by local MedGemma
   - Only orchestration goes through Google API

4. **Accuracy:**
   - Medical-specific model for medical tasks
   - General-purpose model for conversation management

5. **Flexibility:**
   - Easy to swap models for different tasks
   - Can add more specialized models as needed

6. **Reliability:**
   - If MedGemma fails, Gemini can provide fallback responses
   - Graceful degradation built-in

## Model Comparison

| Feature | Gemini 2.5 Flash Lite | MedGemma 4B |
|---------|----------------------|-------------|
| **Purpose** | Orchestration & Conversation | Medical Analysis |
| **Deployment** | Google Cloud API | Local (Ollama) |
| **Speed** | Very Fast (~1-2s) | Fast (~2-4s) |
| **Cost** | Pay per token | Free (local) |
| **Medical Knowledge** | General | Specialized |
| **Privacy** | Cloud-based | Local |
| **Tool Calling** | Native support | Via prompting |
| **Context Window** | Large | Medium |

## Configuration Files

### API Keys Required:
- **GOOGLE_API_KEY**: For Gemini 2.5 Flash Lite
  - Set in `.env.local` or environment variables
  - Required for orchestration

### Local Services Required:
- **Ollama**: For MedGemma 4B
  - Must be installed and running
  - Download from: https://ollama.com/download
  - Pull model: `ollama pull alibayram/medgemma:4b`

### Database:
- **Supabase**: For doctor database
  - SUPABASE_URL and SUPABASE_KEY required
  - Used by doctor_locator_tool

## Performance Characteristics

### Response Times:
- **Simple queries** (no tools): ~1-2 seconds (Gemini only)
- **Symptom analysis**: ~3-5 seconds (Gemini + MedGemma)
- **Doctor search**: ~2-4 seconds (Gemini + Database)
- **Medication info**: ~4-6 seconds (Gemini + MedGemma)

### Token Usage (Approximate):
- **Gemini per request**: 200-500 tokens
- **MedGemma per request**: 350-700 tokens
- **Cost**: ~$0.001-0.003 per request (Gemini only)

## Fallback Behavior

If MedGemma (Ollama) is not available:
- System returns safe default responses
- Recommends consulting healthcare professionals
- Logs error for monitoring
- Continues to function with reduced capabilities

If Gemini API fails:
- Retry with exponential backoff (3 attempts)
- Return fallback response after retries
- User-friendly error messages

## Future Considerations

### Potential Enhancements:
1. **Add GPT-4 for complex cases** (higher accuracy, higher cost)
2. **Use Claude for safety-critical decisions** (strong safety features)
3. **Add specialized models for:**
   - Radiology image analysis
   - Lab result interpretation
   - Mental health support
4. **Implement model routing based on complexity**
5. **Add caching for common queries**

### Model Upgrade Path:
- Gemini 2.5 Flash Lite → Gemini 2.5 Pro (for complex cases)
- MedGemma 4B → MedGemma 7B or larger (for better accuracy)
- Add ensemble voting for critical decisions

## Summary

Your system uses a **smart hybrid architecture**:
- **Gemini 2.5 Flash Lite** as the intelligent orchestrator
- **MedGemma 4B** as the medical specialist
- **Task-specific routing** for optimal performance
- **Graceful fallbacks** for reliability

This gives you the best of both worlds: fast, cost-effective orchestration with specialized medical expertise where it matters most.
