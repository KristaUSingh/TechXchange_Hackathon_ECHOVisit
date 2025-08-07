import requests
import os
import json
from dotenv import load_dotenv
from flask import Response
import re

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
def simplify_summary(transcript):
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
    You are a medical assistant that simplifies complex medical summaries into easy-to-understand language for patients and caregivers.
    Rewrite the following summary in plain language that a non-medical person can easily understand. Use clear, friendly, and conversational phrasing. Avoid medical jargon when possible, and briefly explain any necessary medical terms. Maintain all important information, including symptoms, diagnosis, medications, follow-up instructions, and notes.

    EXAMPLE:
    Input:
    "Summary: Symptoms: A 4-year-old girl was brought in with complaints of ear pain on the right side for the past two days, accompanied by fever (maximum temperature 101.8°F) and decreased appetite. She has also been more irritable than usual and tugging at her ear. No vomiting, diarrhea, or rash observed. Diagnosis: Likely acute otitis media (middle ear infection), based on the presence of fever, localized ear pain, and visible redness and bulging of the right tympanic membrane on examination.
    Medications: Amoxicillin (250 mg) has been prescribed twice daily for 10 days.
    Follow-up instructions: Parents are advised to complete the full course of antibiotics and monitor for improvement in symptoms within 48–72 hours. Return if the fever persists beyond three days or if new symptoms develop (e.g., ear discharge, stiff neck).
    Additional notes: Child has no known drug allergies. Immunizations are up to date.”

    Output:
    “A 4-year-old girl came in with ear pain on her right side for the past couple of days. Along with the pain, she had a fever reaching 101.8°F and wasn't eating as much as usual. She's also been fussier than normal and has been pulling at her ear. There was no throwing up, diarrhea, or rash noticed.
    The doctor thinks she likely has an ear infection called acute otitis media. This diagnosis is based on her fever, ear pain, and redness and swelling seen in her eardrum.
    To help her feel better, she's been given an antibiotic called Amoxicillin, which she should take twice a day for 10 days.
    The parents should make sure she finishes all the medicine and watch for her symptoms to get better within 48 to 72 hours. If her fever lasts more than three days or if she starts showing new symptoms like ear drainage or a stiff neck, they should bring her back.
    The girl doesn't have any known allergies to medicines, and her vaccinations are up-to-date.”

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
            "stop_sequences": ["\n\n"]
            
        }
    }

    response = requests.post(
        f"{ENDPOINT}/ml/v1/text/generation?version=2024-05-29",
        headers=headers,
        json=body
    )

    if response.status_code != 200:
        print("Watsonx API error:", response.status_code, response.text)
        return "Could not simplify summary"

    generated = response.json().get("results", [{}])[0].get("generated_text", "")
    cleaned_text = generated.strip().strip('`').strip()
    return cleaned_text


def translation_summary(text, target_lang="spanish"):
    API_KEY = os.getenv("WATSONX_API_KEY")
    PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
    MODEL_ID = "ibm/granite-3-3-8b-instruct"
    ENDPOINT = "https://us-south.ml.cloud.ibm.com"

    token = get_access_token(API_KEY)
    if not token:
        return "Authentication failed"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


    prompt = f"""
    Translate this message into {target_lang}. If there is not a translation for a certain medical term, leave the word in English.


    Input:
    {text}

    Output: 
    """

    body = {
        "input": prompt,
        "model_id": MODEL_ID,
        "project_id": PROJECT_ID,
        "parameters": {
            "decoding_method": "greedy",
            "max_new_tokens": 400,
            "stop_sequences": ["\n\n"]
        }
    }

    response = requests.post(
        f"{ENDPOINT}/ml/v1/text/generation?version=2024-05-29",
        headers=headers,
        json=body
    )

    if response.status_code != 200:
        print("Watsonx API error:", response.status_code, response.text)
        return "Watsonx failed to translate"

    try:
        translated_text = response.json().get("results", [{}])[0].get("generated_text", "").strip()
        if not translated_text:
            print("Watsonx returned empty translated text")
            print("Prompt sent:", prompt)
            print("API response:", response.json())
            return "Translation not available"
    except Exception as e:
        print("Error parsing Watsonx response:", e)
        print("Raw response:", response.text)
        return "Translation error"

    translated_text = translated_text.replace("\n", " ").replace("  ", " ")
    return translated_text


def questions_suggestions(summary):
    API_KEY = os.getenv("WATSONX_API_KEY")
    PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
    MODEL_ID = "ibm/granite-3-3-8b-instruct"
    ENDPOINT = "https://us-south.ml.cloud.ibm.com"

    token = get_access_token(API_KEY)
    if not token:
        return ["Could not authenticate with Watsonx"]

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    prompt = f"""
    You are a helpful assistant that suggests follow-up questions a patient might want to ask based on a medical summary. 
    Read the summary below and generate 3 natural-sounding questions the patient may ask their doctor or healthcare provider. 
    The questions should reflect common patient concerns about their diagnosis, treatment, or next steps. 
    Avoid technical jargon and use plain language.
    
    Input:
    Symptoms: A 45-year-old male presented with a persistent dry cough, mild shortness of breath when walking up stairs, and occasional chest tightness over the past three weeks. No fever, weight loss, or night sweats. He reports that the symptoms worsen at night and after exposure to dust. Diagnosis: Likely newly diagnosed mild asthma, possibly triggered by environmental allergens or occupational exposure. Diagnosis supported by symptom pattern and spirometry showing reversible airway obstruction.
    Medications: Prescribed a short-acting bronchodilator inhaler (Albuterol) to use as needed for symptom relief.
    Follow-up Instructions: Advised to avoid known triggers (e.g., dust, cold air), use the inhaler as prescribed, and track symptom frequency. Referred to pulmonology for further evaluation and possible long-term management. Instructed to return if symptoms worsen or if he experiences difficulty breathing.
    Additional Notes: Patient works in construction and has frequent exposure to dust and chemicals. No previous history of asthma or allergies. Non-smoker.

    Output:
    "1. What kind of long-term asthma management plan should I expect from the pulmonologist, and are there any lifestyle changes or modifications I should consider to help control my symptoms?"
    "2. Given my occupation in construction, are there specific protective measures or equipment I should use to minimize exposure to dust and chemicals that might exacerbate my asthma symptoms?"
    "3. Are there any over-the-counter medications or supplements that could complement my Albuterol inhaler and help alleviate my symptoms, especially during flare-ups or when avoiding triggers is not possible?"

    Input:
    {json.dumps(summary, indent=2)}

    Output:
    1.
    """

    body = {
        "input": prompt,
        "model_id": MODEL_ID,
        "project_id": PROJECT_ID,
        "parameters": {
            "decoding_method": "greedy",
            "max_new_tokens": 400,
            "stop_sequences": ["\n\n"]
        }
    }

    response = requests.post(
        f"{ENDPOINT}/ml/v1/text/generation?version=2024-05-29",
        headers=headers,
        json=body
    )

    if response.status_code != 200:
        print("Watsonx API error:", response.status_code, response.text)
        return ["Watsonx API failed to generate questions"]

    generated = response.json().get("results", [{}])[0].get("generated_text", "").strip()

    # Fix escape characters and ensure uniform formatting
    generated = generated.replace('\\"', '"').replace("\\n", "\n")

    # If model output is jammed into one line, manually split by number+dot (e.g., 1., 2., 3.)
    lines = re.split(r'\n?\s*\d+\.\s*', generated)
    questions = [q.strip().strip('"') for q in lines if q.strip()]

    # Optional: re-number the questions cleanly
    cleaned = [f"{i+1}. {q}" for i, q in enumerate(questions)]

    return cleaned if cleaned else [generated]

# Final pipeline
def process_transcript(transcript):
    summary = summarize_transcript(transcript)
    simplified = simplify_summary(transcript)
    translated = translation_summary(simplified, target_lang="spanish")
    questions = questions_suggestions(summary)

    return {
        "summary": summary,
        "simplified": simplified,
        "translated": translated,
        "questions": questions
    }