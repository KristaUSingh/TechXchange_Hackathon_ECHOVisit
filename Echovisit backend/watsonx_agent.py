import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

def get_access_token(api_key):
    response = requests.post(
        "https://iam.cloud.ibm.com/identity/token",
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": api_key
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    if response.status_code != 200:
        print("Failed to get token:", response.status_code, response.text)
        return None

    return response.json().get("access_token")

def summarize_transcript(transcript):
    API_KEY = os.getenv("WATSONX_API_KEY")
    PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
    MODEL_ID = "ibm/granite-3-3-8b-instruct"
    ENDPOINT = "https://us-south.ml.cloud.ibm.com"

    token = get_access_token(API_KEY)
    if not token:
        return {"error": "Could not authenticate"}

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    prompt = f"""
    You are a clinical summarization agent. From the provided doctor's transcript, extract the following fields and return them as JSON:

    - Symptoms
    - Diagnosis
    - Medications
    - Follow-up instructions
    - Additional Notes

    DO NOT make up anything not explicitly mentioned. If a field is missing, write "N/A".

    Example:
    Input:
    Patient is a 36 year old female presents with 4 days of worsening right flank pain, fever, and chills. Also reports burning with urination and increased frequency. Denies nausea or vomiting. On exam, right CVA tenderness present. Vitals show T 101.9, HR 102, BP 124 over 76. Urinalysis shows positive nitrites, leukocyte esterase, and moderate bacteria. WBC count 14.3. Diagnosis is acute pyelonephritis. Started on oral cipro 500mg twice daily for 7 days. Advised to increase fluid intake, take meds with food, and return if symptoms worsen or she develops vomiting. F/U with PCP in one week.

    Output:
    {{
    "Symptoms": ["worsening right flank pain", "fever", "chills", "burning with urination", "increased frequency"],
    "Diagnosis": "acute pyelonephritis",
    "Medications": [{{ "name": "Ciprofloxacin", "dose": "500 mg", "frequency": "twice daily for 7 days" }}],
    "Instructions": ["increase fluid intake", "take meds with food", "return if symptoms worsen or she develops vomiting"],
    "Additional Notes": ["36-year-old female", "Right CVA tenderness present", "Vitals show T 101.9, HR 102, BP 124 over 76", "Urinalysis shows positive nitrites, leukocyte esterase, and moderate bacteria", "WBC count 14.3", "Follow-up with PCP in one week"]
    }}

    Input:
    {transcript}

    Output:
    """

    body = {
        "input": prompt,
        "model_id": MODEL_ID,
        "project_id": PROJECT_ID,
        "parameters": {
            "decoding_method": "greedy",
            "max_new_tokens": 300,
            "stop_sequences": ["}\n\n"]
        }
    }

    response = requests.post(
        f"{ENDPOINT}/ml/v1/text/generation?version=2024-05-29",
        headers=headers,
        json=body
    )

    if response.status_code != 200:
        print("Watsonx API error:", response.status_code, response.text)
        return {
            "Symptoms": "N/A",
            "Diagnosis": "N/A",
            "Medications": "N/A",
            "Instructions": "N/A",
            "Additional Notes": "N/A"
        }

    generated = response.json().get("results", [{}])[0].get("generated_text", "")
    try:
        return json.loads(generated)
    except json.JSONDecodeError:
        return {"raw_output": generated}

# Additional logic
def simplify_summary(summary):
    return "simplification summary - you might have bronchitis"

def translation_summary(summary, target_lang="es"):
    return "hola yo necesito agua"

def questions_suggestions(summary):
    return [
        "Are there any side effects I should watch out for?",
        "When should I return for follow-up?",
        "Can I continue with my current medications?"
    ]

# Final pipeline
def process_transcript(transcript):
    summary = summarize_transcript(transcript)
    simplified = simplify_summary(summary)
    translated = translation_summary(summary)
    questions = questions_suggestions(summary)

    return {
        "summary": summary,
        "simplified": simplified,
        "translated": translated,
        "questions": questions
    }
