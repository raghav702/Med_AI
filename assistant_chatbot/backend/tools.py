# Step1: Setup Remote Ollama with Medgemma tool
import requests
import json
import logging
import os
from config import supabase
from langchain_core.tools import tool

# Configure logging for tools
logger = logging.getLogger(__name__)

# Remote Ollama configuration
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
# Since you only have one model, we'll auto-detect it or use a default
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'medgemma-4b-itmodel')

def call_remote_ollama(messages, options=None):
    """
    Call remote Ollama API instead of local instance.
    Simplified for single model setup without authentication.
    
    Args:
        messages: List of message dictionaries with role and content
        options: Optional parameters for the model
    
    Returns:
        Response from remote Ollama API
    """
    if options is None:
        options = {}
    
    # Prepare the request payload - simplified for your setup
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": options
    }
    
    try:
        # Make request to remote Ollama API
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
            timeout=60  # 60 second timeout
        )
        response.raise_for_status()
        
        result = response.json()
        
        # Return in the same format as local ollama.chat()
        return {
            'message': {
                'content': result.get('message', {}).get('content', '')
            }
        }
        
    except requests.exceptions.Timeout:
        logger.error(f"Remote Ollama API timeout after 60 seconds")
        raise Exception("Remote Ollama API timeout - please try again")
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot connect to remote Ollama at {OLLAMA_BASE_URL}")
        raise Exception(f"Cannot connect to remote Ollama server at {OLLAMA_BASE_URL}")
    except requests.exceptions.HTTPError as e:
        logger.error(f"Remote Ollama API HTTP error: {e}")
        raise Exception(f"Remote Ollama API error: {e}")
    except Exception as e:
        logger.error(f"Remote Ollama API error: {str(e)}")
        raise Exception(f"Remote Ollama API error: {str(e)}")

@tool
def medgemma_triage_tool(prompt: str) -> str:
    """
    Calls MedGemma model with a doctor personality profile.
    Returns structured JSON responses for medical triage.
    
    Args:
        prompt: User's symptom description or medical query
    
    Returns:
        JSON string with severity, likely_conditions, recommended_actions, 
        suggested_specialties, and clarifying_questions
    """
    system_prompt = """
You are MedGemma — a medical triage and symptom-analysis model.
Your purpose is to analyze symptoms, evaluate severity, identify possible medical specialties, 
and recommend safe next steps.

You MUST ALWAYS return your answer as VALID JSON with the following schema:

{
  "severity": "low" | "medium" | "high",
  "likely_conditions": [ "string", ... ],
  "recommended_actions": [ "string", ... ],
  "suggested_specialties": [ "string", ... ],
  "clarifying_questions": [ "string", ... ]
}

DEFINITIONS:
- "severity":
    • "low"    → mild symptoms, home care likely sufficient  
    • "medium" → symptoms that should be evaluated by a doctor soon  
    • "high"   → possible medical emergency, urgent care recommended

- "likely_conditions": 
    List possible conditions (non-diagnostic, probability-based and cautious).

- "recommended_actions": 
    Clear safe steps like:
      "stay hydrated", "monitor fever", 
      "take over-the-counter paracetamol 500 mg if needed", 
      "seek urgent care", etc.

- "suggested_specialties":
    A list of doctor specialties appropriate for the symptoms, such as:
    "General Physician", "Cardiologist", "Dermatologist", "ENT", 
    "Orthopedist", "Psychiatrist", "Neurologist", etc.

- "clarifying_questions":
    Additional questions needed for better triage (always short & specific).

SAFETY RULES:
1. NEVER give a final diagnosis. Only give possibilities.
2. If symptoms suggest:
       chest pain,
       difficulty breathing,
       stroke-like symptoms,
       severe bleeding,
       loss of consciousness,
       poisoning,
       major trauma,
   then set "severity": "high" and include 
   "recommended_actions": ["Seek emergency medical help immediately."]

3. Keep answers short, factual, and medically safe.
4. ALWAYS return valid JSON and NOTHING else.
"""
    
    try:
        response = call_remote_ollama(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            options={
                'num_predict': 350,
                'temperature': 0.7,
                'top_p': 0.9
            }
        )
        
        content = response['message']['content'].strip()
        
        # Remove markdown code blocks if present
        if content.startswith('```json'):
            content = content[7:]  # Remove ```json
        if content.startswith('```'):
            content = content[3:]  # Remove ```
        if content.endswith('```'):
            content = content[:-3]  # Remove trailing ```
        content = content.strip()
        
        # Try to parse as JSON to validate structure
        try:
            json_response = json.loads(content)
            # Validate required fields
            required_fields = ['severity', 'likely_conditions', 'recommended_actions', 
                             'suggested_specialties', 'clarifying_questions']
            if all(field in json_response for field in required_fields):
                logger.info(f"medgemma_triage_tool: Successfully analyzed symptoms")
                return content
            else:
                logger.warning(f"medgemma_triage_tool: Response missing required fields: {content}")
                return json.dumps({
                    "severity": "medium",
                    "likely_conditions": ["Unable to analyze symptoms properly"],
                    "recommended_actions": ["Please consult with a healthcare professional"],
                    "suggested_specialties": ["General Physician"],
                    "clarifying_questions": ["Could you describe your symptoms in more detail?"]
                })
        except json.JSONDecodeError as json_err:
            logger.error(f"medgemma_triage_tool: JSON decode error - {json_err}, content: {content}")
            # Return a safe default JSON response
            return json.dumps({
                "severity": "medium",
                "likely_conditions": ["Unable to analyze symptoms properly"],
                "recommended_actions": ["Please consult with a healthcare professional"],
                "suggested_specialties": ["General Physician"],
                "clarifying_questions": ["Could you describe your symptoms in more detail?"]
            })
            
    except Exception as e:
        logger.error(f"medgemma_triage_tool: Error querying MedGemma - {str(e)}", exc_info=True)
        return json.dumps({
            "severity": "low",
            "likely_conditions": ["Technical difficulty"],
            "recommended_actions": ["Please try again in a moment"],
            "suggested_specialties": ["General Physician"],
            "clarifying_questions": []
        })


import math

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth using Haversine formula.
    
    Args:
        lat1, lon1: Latitude and longitude of first point in decimal degrees
        lat2, lon2: Latitude and longitude of second point in decimal degrees
    
    Returns:
        Distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of Earth in kilometers
    r = 6371
    
    return c * r


@tool
def doctor_locator_tool(prompt: str) -> str:
    """
    Query actual Supabase database to find doctors by specialty and location.
    Now supports coordinate-based distance calculation for finding nearest doctors.
    
    Expected input formats:
    - "specialty=ENT, location=Delhi"
    - "specialty=Cardiologist, lat=28.6139, lon=77.2090"
    - "specialty=General Physician, lat=28.6139, lon=77.2090, radius=10"
    
    Args:
        prompt: Search query with specialty and optional location/coordinates
    
    Returns:
        Formatted list of up to 5 doctors with details, sorted by distance if coordinates provided
    """
    # Parse the input
    specialty = None
    location = None
    user_lat = None
    user_lon = None
    radius_km = 50  # Default radius in kilometers
    
    try:
        parts = prompt.split(',')
        for part in parts:
            part = part.strip()
            if 'specialty=' in part:
                specialty = part.split('=')[1].strip()
            elif 'location=' in part:
                location = part.split('=')[1].strip()
            elif 'lat=' in part:
                user_lat = float(part.split('=')[1].strip())
            elif 'lon=' in part:
                user_lon = float(part.split('=')[1].strip())
            elif 'radius=' in part:
                radius_km = float(part.split('=')[1].strip())
    except Exception as e:
        logger.error(f"doctor_locator_tool: Error parsing query '{prompt}' - {str(e)}")
        specialty = "General Physician"
    
    # Default to General Physician if no specialty provided
    if not specialty:
        specialty = "General Physician"
    
    # Query the database
    if not supabase:
        logger.error("doctor_locator_tool: Database connection not available")
        return "⚠️ Database connection not available. Please check backend configuration."
    
    try:
        # Query doctors table with specialty filter
        # Select all fields including latitude and longitude if they exist
        query = supabase.table('doctors').select('*')
        
        # Filter by specialty (case-insensitive partial match)
        query = query.ilike('specialty', f'%{specialty}%')
        
        # If we have coordinates, get more results to filter by distance
        limit = 50 if (user_lat is not None and user_lon is not None) else 5
        query = query.limit(limit)
        
        response = query.execute()
        
        if not response.data or len(response.data) == 0:
            logger.info(f"doctor_locator_tool: No doctors found for specialty '{specialty}'")
            return f"No doctors found for specialty: {specialty}. Try searching for 'General Physician' or other specialties."
        
        doctors = response.data
        
        # If user provided coordinates, calculate distances and sort by proximity
        if user_lat is not None and user_lon is not None:
            doctors_with_distance = []
            
            for doctor in doctors:
                # Check if doctor has latitude and longitude fields
                doctor_lat = doctor.get('latitude') or doctor.get('lat')
                doctor_lon = doctor.get('longitude') or doctor.get('lon')
                
                if doctor_lat is not None and doctor_lon is not None:
                    try:
                        # Convert to float if they're strings
                        doctor_lat = float(doctor_lat)
                        doctor_lon = float(doctor_lon)
                        
                        # Calculate distance
                        distance = calculate_distance(user_lat, user_lon, doctor_lat, doctor_lon)
                        
                        # Only include doctors within the specified radius
                        if distance <= radius_km:
                            doctor['distance_km'] = round(distance, 2)
                            doctors_with_distance.append(doctor)
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Invalid coordinates for doctor {doctor.get('name', 'Unknown')}: {e}")
                        continue
            
            # Sort by distance and take top 5
            doctors_with_distance.sort(key=lambda x: x['distance_km'])
            doctors = doctors_with_distance[:5]
            
            if not doctors:
                return f"No doctors found for specialty '{specialty}' within {radius_km}km of your location. Try increasing the search radius or searching for 'General Physician'."
        else:
            # No coordinates provided, just take first 5
            doctors = doctors[:5]
        
        # Format the results
        doctors_list = []
        for idx, doctor in enumerate(doctors, 1):
            distance_info = ""
            if 'distance_km' in doctor:
                distance_info = f"   🚗 {doctor['distance_km']} km away"
            
            doctor_info = f"""
{idx}. {doctor.get('name', 'Unknown')} - {doctor.get('specialty', 'N/A')}
   📍 {doctor.get('address', 'Address not available')}{distance_info}
   ⭐ {doctor.get('aggregate_rating', 'N/A')}/5 | {doctor.get('experience', 'N/A')} years experience
   💰 ₹{doctor.get('price_range', 'N/A')} consultation
   🏥 {doctor.get('works_for', 'N/A')}
   📞 Contact via appointment booking
"""
            doctors_list.append(doctor_info)
        
        # Create result message
        if user_lat is not None and user_lon is not None:
            result = f"Found {len(doctors)} nearest doctor(s) for {specialty} within {radius_km}km:\n" + "\n".join(doctors_list)
        else:
            result = f"Found {len(doctors)} doctor(s) for {specialty}:\n" + "\n".join(doctors_list)
            if location:
                result += f"\n💡 Showing results for {location}. For distance-based results, precise location coordinates would be needed."
            else:
                result += f"\n💡 Showing available {specialty.lower()}s. Results are not sorted by distance."
        
        logger.info(f"doctor_locator_tool: Successfully found {len(doctors)} doctors for specialty '{specialty}'")
        return result
        
    except Exception as e:
        logger.error(f"doctor_locator_tool: Database query error - {str(e)}", exc_info=True)
        return f"Error searching for doctors: {str(e)}. Please try again."


@tool
def emergency_alert_tool() -> str:
    """
    Triggers emergency alert.
    In production, this would call actual emergency services API.
    
    Returns:
        Emergency contact information and immediate action steps
    """
    emergency_message = """
🚨 EMERGENCY ALERT TRIGGERED 🚨

Immediate Actions:
1. Call emergency services: 112 (India) or 911 (US)
2. If possible, have someone stay with you
3. Do not drive yourself - call ambulance
4. Keep phone nearby and unlocked

Emergency Hotlines:
- Ambulance: 102
- Medical Emergency: 108
- Police: 100

Stay calm. Help is on the way.
"""
    # Log emergency with CRITICAL priority
    logger.critical("emergency_alert_tool: EMERGENCY ALERT TRIGGERED - Life-threatening symptoms detected")
    return emergency_message


@tool
def medication_lookup_tool(drug_name: str) -> str:
    """
    Retrieves comprehensive information about a medication including:
    - Indications and uses
    - Standard dosage ranges
    - Common and serious side effects
    - Contraindications
    - Drug class and mechanism
    
    Args:
        drug_name: Name of the medication (generic or brand name)
    
    Returns:
        Structured medication information as formatted string
    """
    if not drug_name or not drug_name.strip():
        return "Error: Please provide a medication name to look up."
    
    drug_name = drug_name.strip()
    
    # Create a specialized prompt for medication information
    medication_prompt = f"""
Provide comprehensive information about the medication: {drug_name}

Include the following information in a structured format:

1. DRUG NAME & CLASS:
   - Generic name
   - Common brand names
   - Drug class/category

2. INDICATIONS (What it's used for):
   - Primary uses
   - Common conditions treated

3. DOSAGE INFORMATION:
   - Standard adult dosage ranges
   - Available forms (tablet, capsule, liquid, etc.)
   - Important: Emphasize that actual dosing must be determined by healthcare provider

4. SIDE EFFECTS:
   - Common side effects (categorize as "Common")
   - Serious side effects requiring medical attention (categorize as "Serious")
   - Rare but important side effects (categorize as "Rare")

5. CONTRAINDICATIONS & WARNINGS:
   - Who should not take this medication
   - Important warnings
   - Pregnancy/breastfeeding considerations

6. SAFETY INFORMATION:
   - How to take it properly
   - What to avoid while taking it
   - Storage instructions

IMPORTANT: 
- If this is an over-the-counter (OTC) medication, include safe usage information
- Always emphasize consulting a healthcare provider or pharmacist
- If the medication name is not recognized, say so clearly
- Keep information factual and medically accurate
"""
    
    try:
        response = call_remote_ollama(
            messages=[
                {"role": "system", "content": "You are a medication information specialist. Provide accurate, comprehensive drug information in a clear, structured format. Always emphasize the importance of consulting healthcare providers."},
                {"role": "user", "content": medication_prompt}
            ],
            options={
                'num_predict': 600,
                'temperature': 0.3,  # Lower temperature for more factual responses
                'top_p': 0.9
            }
        )
        
        content = response['message']['content'].strip()
        
        # Add safety disclaimer
        safety_disclaimer = "\n\n⚠️ IMPORTANT: This information is for educational purposes only. Always consult your healthcare provider or pharmacist for personalized medical advice, dosing instructions, and before starting or stopping any medication."
        
        logger.info(f"medication_lookup_tool: Successfully retrieved information for '{drug_name}'")
        return content + safety_disclaimer
        
    except Exception as e:
        logger.error(f"medication_lookup_tool: Error looking up medication '{drug_name}' - {str(e)}", exc_info=True)
        return f"""
Error retrieving information for medication: {drug_name}

This could be due to:
- Medication name not recognized (check spelling)
- Technical difficulty accessing medication database
- Network connectivity issues

Please try:
1. Checking the spelling of the medication name
2. Using the generic name instead of brand name (or vice versa)
3. Consulting a pharmacist or healthcare provider directly

For immediate medication information, contact:
- Your local pharmacist
- Your healthcare provider
- Poison Control: 1-800-222-1222 (US)
"""


@tool
def find_nearest_doctors_tool(user_lat: float, user_lon: float, specialty: str = "General Physician", radius_km: float = 25.0, limit: int = 5) -> str:
    """
    Find the nearest doctors based on user's coordinates.
    
    Args:
        user_lat: User's latitude
        user_lon: User's longitude  
        specialty: Medical specialty to search for (default: "General Physician")
        radius_km: Search radius in kilometers (default: 25km)
        limit: Maximum number of doctors to return (default: 5)
    
    Returns:
        JSON string with nearest doctors sorted by distance
    """
    if not supabase:
        logger.error("find_nearest_doctors_tool: Database connection not available")
        return json.dumps({
            "error": "Database connection not available",
            "doctors": []
        })
    
    try:
        # Query doctors table with specialty filter
        query = supabase.table('doctors').select('*')
        
        # Filter by specialty if specified
        if specialty and specialty.lower() != "any":
            query = query.ilike('specialty', f'%{specialty}%')
        
        # Get more results to filter by distance
        query = query.limit(100)
        
        response = query.execute()
        
        if not response.data:
            return json.dumps({
                "message": f"No doctors found for specialty: {specialty}",
                "doctors": []
            })
        
        doctors_with_distance = []
        
        for doctor in response.data:
            # Check if doctor has latitude and longitude fields
            doctor_lat = doctor.get('latitude') or doctor.get('lat')
            doctor_lon = doctor.get('longitude') or doctor.get('lon')
            
            if doctor_lat is not None and doctor_lon is not None:
                try:
                    # Convert to float if they're strings
                    doctor_lat = float(doctor_lat)
                    doctor_lon = float(doctor_lon)
                    
                    # Calculate distance
                    distance = calculate_distance(user_lat, user_lon, doctor_lat, doctor_lon)
                    
                    # Only include doctors within the specified radius
                    if distance <= radius_km:
                        doctor_data = {
                            "id": doctor.get('id'),
                            "name": doctor.get('name'),
                            "specialty": doctor.get('specialty'),
                            "address": doctor.get('address'),
                            "rating": doctor.get('aggregate_rating'),
                            "experience": doctor.get('experience'),
                            "price_range": doctor.get('price_range'),
                            "works_for": doctor.get('works_for'),
                            "latitude": doctor_lat,
                            "longitude": doctor_lon,
                            "distance_km": round(distance, 2)
                        }
                        doctors_with_distance.append(doctor_data)
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid coordinates for doctor {doctor.get('name', 'Unknown')}: {e}")
                    continue
        
        # Sort by distance and take the requested limit
        doctors_with_distance.sort(key=lambda x: x['distance_km'])
        nearest_doctors = doctors_with_distance[:limit]
        
        result = {
            "message": f"Found {len(nearest_doctors)} nearest doctors for {specialty} within {radius_km}km",
            "search_params": {
                "user_lat": user_lat,
                "user_lon": user_lon,
                "specialty": specialty,
                "radius_km": radius_km,
                "limit": limit
            },
            "doctors": nearest_doctors
        }
        
        logger.info(f"find_nearest_doctors_tool: Found {len(nearest_doctors)} doctors within {radius_km}km")
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"find_nearest_doctors_tool: Error - {str(e)}", exc_info=True)
        return json.dumps({
            "error": f"Error finding nearest doctors: {str(e)}",
            "doctors": []
        })


@tool
def drug_interaction_tool(medications: str) -> str:
    """
    Checks for potential interactions between multiple medications.
    
    Args:
        medications: Comma-separated list of drug names
    
    Returns:
        Information about potential interactions, severity, and recommendations
    """
    if not medications or not medications.strip():
        return "Error: Please provide medication names to check for interactions."
    
    medications = medications.strip()
    
    # Parse the medication list
    med_list = [med.strip() for med in medications.split(',') if med.strip()]
    
    if len(med_list) < 2:
        return "Note: Drug interaction checking requires at least 2 medications. Please provide multiple medication names separated by commas."
    
    # Create a specialized prompt for drug interactions
    interaction_prompt = f"""
Analyze potential drug interactions between these medications:
{', '.join(med_list)}

Provide a comprehensive interaction analysis with the following structure:

1. MEDICATIONS BEING CHECKED:
   List each medication with its drug class

2. POTENTIAL INTERACTIONS:
   For each interaction found:
   - Which medications interact
   - Severity level (Minor, Moderate, Major, Severe)
   - Nature of the interaction (what happens)
   - Clinical significance

3. SEVERITY CATEGORIES:
   - MINOR: Minimal clinical significance, usually no action needed
   - MODERATE: May require monitoring or dosage adjustment
   - MAJOR: Significant interaction, may require alternative medication
   - SEVERE: Potentially life-threatening, avoid combination

4. RECOMMENDATIONS:
   - What to monitor for
   - When to contact healthcare provider
   - Timing considerations (if medications should be taken at different times)

5. SAFETY NOTES:
   - Additional precautions
   - Symptoms to watch for

IMPORTANT:
- If no significant interactions are found, state this clearly
- If medication names are not recognized, indicate which ones
- Always emphasize consulting healthcare provider
- Be specific about severity levels
"""
    
    try:
        response = call_remote_ollama(
            messages=[
                {"role": "system", "content": "You are a clinical pharmacology specialist focused on drug interactions. Provide accurate, detailed interaction analysis with clear severity categorization. Always prioritize patient safety."},
                {"role": "user", "content": interaction_prompt}
            ],
            options={
                'num_predict': 700,
                'temperature': 0.3,  # Lower temperature for more factual responses
                'top_p': 0.9
            }
        )
        
        content = response['message']['content'].strip()
        
        # Add critical safety warning
        safety_warning = f"""

🚨 CRITICAL SAFETY INFORMATION:
- This interaction check is for informational purposes only
- DO NOT start, stop, or change medications without consulting your healthcare provider
- If you experience unusual symptoms, contact your doctor immediately
- For medication emergencies, call your local emergency number or poison control
- Always inform all your healthcare providers about ALL medications you take (including OTC and supplements)

Number of medications checked: {len(med_list)}
"""
        
        logger.info(f"drug_interaction_tool: Successfully checked interactions for {len(med_list)} medications")
        return content + safety_warning
        
    except Exception as e:
        logger.error(f"drug_interaction_tool: Error checking interactions for '{medications}' - {str(e)}", exc_info=True)
        return f"""
Error checking drug interactions for: {medications}

This could be due to:
- Technical difficulty accessing interaction database
- Network connectivity issues
- Unrecognized medication names

⚠️ IMPORTANT - DO NOT IGNORE POTENTIAL INTERACTIONS:

Since we cannot verify interactions at this time, please:
1. Contact your pharmacist IMMEDIATELY to check these medications
2. Call your healthcare provider before taking these together
3. Do not start new medications without professional guidance

For immediate assistance:
- Your local pharmacist (most accessible)
- Your healthcare provider
- Poison Control: 1-800-222-1222 (US)

Medications you asked about: {medications}

NEVER assume medications are safe to combine without professional verification.
"""



# ============================================================================
# TOOLS DICTIONARY FOR AGENT FACTORY
# ============================================================================

# Dictionary mapping tool names to tool functions for use with UnifiedAgentFactory
TOOLS_DICT = {
    'medgemma_triage_tool': medgemma_triage_tool,
    'doctor_locator_tool': doctor_locator_tool,
    'emergency_alert_tool': emergency_alert_tool,
    'medication_lookup_tool': medication_lookup_tool,
    'drug_interaction_tool': drug_interaction_tool,
    'find_nearest_doctors_tool': find_nearest_doctors_tool
}

# Legacy function names for backward compatibility
query_medgemma = medgemma_triage_tool.func
find_doctors_in_db = doctor_locator_tool.func
call_emergency_service = emergency_alert_tool.func
