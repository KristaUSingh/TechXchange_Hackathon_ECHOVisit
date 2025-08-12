import requests
import os
import json
from dotenv import load_dotenv
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
    ENDPOINT = "https://us-south.ml.cloud.ibm.com"
    SUMMARIZE_DEPLOYMENT_ID = "1d7d250b-5b6a-4e6e-a01f-f579f40e8a7b"
    VERSION = "2021-05-01"

    # 1) Get IAM token
    token_resp = requests.post(
        "https://iam.cloud.ibm.com/identity/token",
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": API_KEY
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token_resp.raise_for_status()
    token = token_resp.json()["access_token"]

    # 2) Call the agent
    url = f"{ENDPOINT}/ml/v4/deployments/{SUMMARIZE_DEPLOYMENT_ID}/ai_service?version={VERSION}"
    payload = {"messages": [{"role": "user", "content": transcript}]}

    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=90,
    )
    resp.raise_for_status()
    data = resp.json()

    # 3) Extract JSON string from the choices structure
    try:
        content_str = data["choices"][0]["message"]["content"]
        # Parse the string to a Python dict
        return json.loads(content_str)
    except Exception as e:
        print("Failed to parse agent content:", e)
        return {"raw_output": data}


def simplify_summary(transcript):
    """
    Calls the EchoVisit_Simplification_Agent and returns the simplified plain‑language text.
    `text` can be the raw transcript or the JSON summary string—whatever you trained the agent for.
    """
    API_KEY = os.getenv("WATSONX_API_KEY")
    ENDPOINT = "https://us-south.ml.cloud.ibm.com"
    SIMPLIFY_DEPLOYMENT_ID = "ef5b963b-1277-4ea1-a4a8-c491b91c903c"
    VERSION = "2021-05-01"

    # 1) Get IAM token
    token_resp = requests.post(
        "https://iam.cloud.ibm.com/identity/token",
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": API_KEY
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if token_resp.status_code != 200:
        print("IAM auth failed:", token_resp.status_code, token_resp.text)
        return "Could not authenticate"
    token = token_resp.json()["access_token"]

    # 2) Call the agent (non‑streaming endpoint)
    url = f"{ENDPOINT}/ml/v4/deployments/{SIMPLIFY_DEPLOYMENT_ID}/ai_service?version={VERSION}"
    payload = {"messages": [{"role": "user", "content": transcript}]}
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=90,
    )

    if resp.status_code != 200:
        print("Simplification agent call failed:", resp.status_code)
        try:
            print("Response JSON:", resp.json())
        except Exception:
            print("Response text:", resp.text)
        return "Could not simplify summary"

    # 3) Extract the assistant’s content from the choices structure
    try:
        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        # optional: strip code fences/backticks if the agent ever returns them
        content = content.strip().strip("`")
        content = content.replace("```", "").strip()

        return content
    except Exception as e:
        print("Failed to extract simplification content:", e)
        print("Raw response:", resp.text[:2000])
        return "Could not simplify summary"



def translation_summary(text, target_lang="spanish"):
    """
    Calls the EchoVisit_Translation_Agent to translate the simplified text.
    `text` should be the output from simplify_summary().
    """
    API_KEY = os.getenv("WATSONX_API_KEY")
    ENDPOINT = "https://us-south.ml.cloud.ibm.com"
    # <- from your screenshot
    TRANSLATION_DEPLOYMENT_ID = "97d9e613-fa9d-4834-83ce-8c9bc1b59579"
    VERSION = "2021-05-01"

    # 1) IAM token
    tok = requests.post(
        "https://iam.cloud.ibm.com/identity/token",
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": API_KEY,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if tok.status_code != 200:
        print("IAM auth failed:", tok.status_code, tok.text)
        return "Authentication failed"
    token = tok.json()["access_token"]

    # 2) Call the translation agent (non‑streaming)
    url = f"{ENDPOINT}/ml/v4/deployments/{TRANSLATION_DEPLOYMENT_ID}/ai_service?version={VERSION}"
    # Keep the instruction light; your agent already knows how to translate.
    payload = {
        "messages": [
            {
                "role": "user",
                "content": (
                    f"Translate the following text into {target_lang}. "
                    "If a medical term has no precise equivalent, keep the English term.\n\n"
                    f"{text}"
                ),
            }
        ]
    }
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=90,
    )

    if resp.status_code != 200:
        print("Translation agent call failed:", resp.status_code)
        try:
            print("Response JSON:", resp.json())
        except Exception:
            print("Response text:", resp.text)
        return "Watsonx failed to translate"

    # 3) Extract assistant content
    try:
        data = resp.json()
        translated = data["choices"][0]["message"]["content"]
        # De‑fence, de‑clutter
        translated = translated.replace("```", "").strip().strip("`")
        # Optional: collapse multi‑spaces/newlines if you like:
        translated = " ".join(translated.split())
        translated = translated.encode('utf-8').decode('utf-8')
        return translated
    except Exception as e:
        print("Failed to extract translation:", e)
        print("Raw response:", resp.text[:2000])
        return "Translation error"


def questions_suggestions(summary):
    """
    Calls EchoVisit_FollowUpQuestions_Agent and returns 3 follow‑up questions.
    On errors, returns a single-item list with a helpful message and embeds
    the server error in a 'debug' field when possible.
    """
    API_KEY = os.getenv("WATSONX_API_KEY")
    ENDPOINT = "https://us-south.ml.cloud.ibm.com"
    FOLLOWUP_DEPLOYMENT_ID = "15f999f8-46b3-4b01-bd67-be63bed4a605"  # <-- confirm this
    VERSION = "2021-05-01"

    # 1) IAM token
    tok = requests.post(
        "https://iam.cloud.ibm.com/identity/token",
        data={"grant_type": "urn:ibm:params:oauth:grant-type:apikey", "apikey": API_KEY},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if tok.status_code != 200:
        return [f"IAM auth failed: {tok.status_code}"], {"error": tok.text}

    token = tok.json().get("access_token")

    # 2) Normalize the input summary to a compact string
    if isinstance(summary, (dict, list)):
        # compact, no ASCII escaping
        summary_text = json.dumps(summary, ensure_ascii=False, separators=(",", ":"))
    else:
        summary_text = str(summary)

    # 3) Call the agent
    url = f"{ENDPOINT}/ml/v4/deployments/{FOLLOWUP_DEPLOYMENT_ID}/ai_service?version={VERSION}"
    payload = {
        "messages": [
            {
                "role": "user",
                "content": (
                    "Based on the medical summary below, produce EXACTLY THREE plain‑language "
                    "follow‑up questions a patient might ask their clinician. "
                    "Return ONLY a JSON array of strings (no prose, no numbering).\n\n"
                    f"{summary_text}"
                ),
            }
        ]
    }

    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=90,
    )

    # If not 200, show the real error so we can fix the root cause
    if resp.status_code != 200:
        try:
            err_json = resp.json()
        except Exception:
            err_json = {"raw": resp.text}
        # Return a helpful message + debug for visibility
        return [f"Follow‑up agent error: HTTP {resp.status_code}"], {"debug": err_json}

    # 4) Parse the output
    try:
        data = resp.json()

        # Typical shape: {"choices":[{"message":{"role":"assistant","content":"..."}},...]}
        content = data["choices"][0]["message"]["content"].strip()

        # First try strict JSON array parse (what we asked the agent to return)
        try:
            arr = json.loads(content)
            if isinstance(arr, list) and arr:
                # Coerce to strings, trim, cap at 3
                return [str(q).strip() for q in arr][:3]
        except Exception:
            pass

        # Fallback: model returned numbered/bulleted text
        import re as _re
        chunks = _re.split(r"\n+\s*|\s*\d+\.\s*|\s*-\s*|\s*•\s*", content)
        cleaned = [c.strip().strip('"').strip("'") for c in chunks if c.strip()]
        if cleaned:
            return cleaned[:3]

        # Last resort: return the raw content as a single item
        return [content]

    except Exception as e:
        # Surface parse issues with debug context
        return [f"Failed to parse follow‑up output: {e}"], {"debug": resp.text[:2000]}


# Keep your existing translation_summary as-is if you prefer.
# Add this safe wrapper and call THIS from Flask.

def translation_summary_safe(text: str, target_lang: str = "Spanish") -> str:
    try:
        # Map codes to names (handles 'de' -> 'German')
        m = {"en":"English","es":"Spanish","fr":"French","de":"German","zh":"Chinese","ar":"Arabic","hi":"Hindi"}
        target = m.get((target_lang or "").lower(), target_lang)

        # Call your existing translator exactly how it worked before:
        out = translation_summary(text, target_lang=target)  # <-- your original function
        if not isinstance(out, str) or not out.strip():
            return text
        # light cleanup only; keep newlines
        out = out.replace("```"," ").strip()
        return out
    except Exception as e:
        print("translation_summary_safe error:", repr(e))
        return text

def interactive_qa(question: str, context: dict):
    """
    Calls your deployed Interactive Q&A agent.
    Returns: {"answer": str, "followups": [..]}
    """
    API_KEY = os.getenv("WATSONX_API_KEY")
    ENDPOINT = "https://us-south.ml.cloud.ibm.com"
    QA_DEPLOYMENT_ID = "cddad2f5-ba1d-4b92-87bf-94011877e5ec"  # <- from your screenshot
    VERSION = "2021-05-01"

    token = get_access_token(API_KEY)
    if not token:
        return {"answer": "Auth failed.", "followups": []}

    url = f"{ENDPOINT}/ml/v4/deployments/{QA_DEPLOYMENT_ID}/ai_service?version={VERSION}"

    # Keep payload in the same "messages" style you use elsewhere.
    # We pass both the question and the visit context as one user message.
    user_content = json.dumps(
        {"question": question, "context": context},
        ensure_ascii=False, separators=(",", ":")
    )
    payload = {"messages": [{"role": "user", "content": user_content}]}

    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
            timeout=90,
        )
        resp.raise_for_status()
        data = resp.json()

        content = (data["choices"][0]["message"]["content"] or "").strip()

        # Try to parse structured output first: {"answer": "...", "followups": ["..",".."]}
        try:
            j = json.loads(content)
            answer = (j.get("answer") or "").strip()
            follows = j.get("followups") or []
            if answer:
                return {"answer": answer, "followups": follows if isinstance(follows, list) else []}
        except Exception:
            pass

        # Fallback: model returned plain text
        return {"answer": content, "followups": []}

    except Exception as e:
        print("Interactive Q&A error:", repr(e))
        try:
            print("RAW:", resp.text[:1200])
        except Exception:
            pass
        return {"answer": "Sorry, I ran into an issue answering that.", "followups": []}



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