from flask import Flask, request, jsonify, Response
from watsonx_agent import simplify_summary, translation_summary, questions_suggestions, translation_summary_safe, interactive_qa, drug_interactions
import json
from watsonx_agent import process_transcript
from flask_cors import CORS
import whisper
import os
import re

whisper_model = whisper.load_model("base")
app = Flask("ECHOVisit")
app.config["JSON_AS_ASCII"] = False
CORS(app)

def transcribe_audio(file_path):
    result = whisper_model.transcribe(file_path)
    return result['text']


def full_pipeline(audio_file_path):
    transcript = transcribe_audio(audio_file_path)
    result = process_transcript(transcript)
    return {
        "transcript": transcript,
        **result
    }

def _to_text(v):
    if v is None:
        return ""
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    return str(v)

def _norm(v):
    # turn None → "", dict/list → JSON string, leave strings alone
    if v is None:
        return ""
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    return str(v)

def _normalize_summary_keys(s):
    # Accept strings/None gracefully
    if not isinstance(s, dict):
        return {
            "allergies": "",
            "symptoms": "",
            "diagnosis": "",
            "medications": "",
            "instructions": "",
            "notes": s if isinstance(s, str) else ""
        }
        

    # Map common translations/variants back to English keys
    keymap = {
        "allergies":   ["allergies","alergias","allergie","allergien","alergie"],
        "symptoms":    ["symptoms","síntomas","sintomas","symptômes","symptome","症状","أعراض","लक्षण"],
        "diagnosis":   ["diagnosis","diagnóstico","diagnostico","diagnose","diagnostic","診断","تشخيص"],
        "medications": ["medications","medication","medicamentos","medicamento","médicaments"],
        "instructions":["instructions","instrucciones","consignes","Anweisungen","指示"],
        "notes":       ["notes","notas","remarques","Notizen","備考"]
    }

    out = {}
    for std, cands in keymap.items():
        out[std] = ""
        for c in cands:
            if c in s and s[c] not in ("", None):
                out[std] = s[c]
                break
    return out




def _simp_prompt(kind: str, text: str) -> str:
    """
    Make the agent behave: short, patient-friendly, no disclaimers.
    For lists/objects we ask for bullets; for transcript, plain sentences.
    """
    if kind == "transcript":
        return (
            "Rewrite the following clinical transcript in simple, patient‑friendly language. "
            "Keep it concise (3–6 short sentences). "
            "Return ONLY the rewritten text, no preface, no explanations.\n\n"
            f"{text}"
        )
    if kind == "medications":
        # ordering hint (name, dose, frequency)
        return (
            "Simplify the following medication info for a patient. "
            "Return bullet points in this order ONLY: "
            "• name: ...\n• dose: ...\n• frequency: ...\n"
            "Do not add extra commentary. If a field is missing, omit it. "
            "Return ONLY the bullets.\n\n"
            f"{text}"
        )
    # generic sections: allergies, symptoms, diagnosis, instructions, notes
    return (
        f"Simplify the following {kind} for a patient. "
        "Return a short list of bullet points (max 5 bullets). "
        "Return ONLY the bullets, no preface, no extra text.\n\n"
        f"{text}"
    )


@app.route("/transcribe", methods=["POST"])
def transcribe_and_summarize():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    audio = request.files['audio']
    os.makedirs("temp", exist_ok=True)
    filepath = os.path.join("temp", audio.filename)
    audio.save(filepath)

    # ---- helpers to read & format intake meds ------------------------------
    def _parse_med_json(s):
        try:
            v = json.loads(s or "[]")
            return v if isinstance(v, list) else []
        except Exception:
            return []

    def _format_meds_for_summary(meds):
        """
        meds: list of {name, dose, frequency} (any may be missing).
        Returns a patient‑friendly bullet list as a string.
        """
        lines = []
        for m in meds:
            if not isinstance(m, dict): 
                # allow simple strings fallback
                txt = str(m).strip()
                if txt:
                    lines.append(f"• {txt}")
                continue
            parts = [m.get("name"), m.get("dose"), m.get("frequency")]
            txt = " — ".join([p for p in parts if p])
            if txt:
                lines.append(f"• {txt}")
        return "\n".join(lines).strip()

    try:
        # 1) Run the normal pipeline
        result = full_pipeline(filepath)

        # 2) See if the transcript/agent produced a medications section
        summary = result.get("summary") or {}
        meds_from_summary = summary.get("medications")
        meds_is_blank = not meds_from_summary or str(meds_from_summary).strip() in ("", "[]", "{}")

        # 3) Pull intake meds (optional) from the multipart form
        new_meds_intake     = _parse_med_json(request.form.get("new_meds_json"))
        current_meds_intake = _parse_med_json(request.form.get("current_meds_json"))

        # prefer new prescriptions, otherwise current meds from intake
        fallback_list = new_meds_intake if len(new_meds_intake) else current_meds_intake
        fallback_str  = _format_meds_for_summary(fallback_list)

        # 4) If extractor missed meds, patch with fallback; else, if both empty → N/A
        if meds_is_blank:
            if fallback_str:
                summary["medications"] = fallback_str
            else:
                summary["medications"] = "N/A"

        result["summary"] = summary

        # Optional: also mirror into simplified if you show that directly (safe default)
        if "simplified" in result and isinstance(result["simplified"], str):
            result["simplified"] = result["simplified"].replace("\n", " ").strip()

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    

@app.route("/simplify_all", methods=["POST"])
def simplify_all():
    """
    Body: { transcript: str, summary: {allergies, symptoms, diagnosis,
            medications, instructions, notes} }
    Returns: { transcript: str, summary: {...} }
    """
    data = request.get_json(force=True) or {}
    transcript = data.get("transcript", "") or ""
    summary_in = data.get("summary", {}) or {}

    # Build a single compact JSON the model can rewrite
    payload_in = {
        "transcript": transcript or "",
        "summary": {
            "allergies":    _norm(summary_in.get("allergies")    or ""),
            "symptoms":     _norm(summary_in.get("symptoms")     or ""),
            "diagnosis":    _norm(summary_in.get("diagnosis")    or ""),
            "medications":  _norm(summary_in.get("medications")  or ""),
            "instructions": _norm(summary_in.get("instructions") or ""),
            "notes":        _norm(summary_in.get("notes")        or "")
        }
    }


    # Strong instruction: return JSON only, concise, bullets for sections
    instruct = (
        "You are a medical simplification assistant. Rewrite EVERY field in the JSON below "
        "for a patient at a 6th‑grade reading level. Rules:\n"
        "• transcript: 3–6 short sentences (no bullets).\n"
        "• allergies/symptoms/diagnosis/instructions/notes: bullet points (max 5), no preface.\n"
        "• medications: bullet points exactly in this order — name, dose, frequency. Omit missing.\n"
        "Return ONLY valid JSON with the SAME keys and structure. Do not add commentary."
    )

    # Call your existing simplify_summary ONCE with the whole JSON string + instructions
    text_in = json.dumps(payload_in, ensure_ascii=False)
    out_text = simplify_summary(f"{instruct}\n\n{text_in}")

    try:
        out = json.loads(out_text)
        out.setdefault("transcript", payload_in["transcript"])
        out["summary"] = _normalize_summary_keys(out.get("summary", {}))
        return jsonify(out)
    except Exception as e:
        print("simplify_all parse error:", e, "\nRAW:", out_text[:800])
        return jsonify(payload_in)



@app.route("/translate_all", methods=["POST"])
def translate_all():
    """
    Body: { lang, mode, transcript, summary:{...} }
    Returns: { transcript, summary:{...} } translated.
    """
    data = request.get_json(force=True) or {}
    lang_code  = (data.get("lang") or "es").lower()
    transcript = data.get("transcript", "") or ""
    summary_in = data.get("summary", {}) or {}

    payload_in = {
        "transcript": transcript or "",
        "summary": {
            "allergies":    _norm(summary_in.get("allergies")    or ""),
            "symptoms":     _norm(summary_in.get("symptoms")     or ""),
            "diagnosis":    _norm(summary_in.get("diagnosis")    or ""),
            "medications":  _norm(summary_in.get("medications")  or ""),
            "instructions": _norm(summary_in.get("instructions") or ""),
            "notes":        _norm(summary_in.get("notes")        or "")
        }
    }


    LANG_MAP = {
        "en": "English","es":"Spanish","fr":"French","de":"German",
        "zh":"Chinese","ar":"Arabic","hi":"Hindi"
    }
    target = LANG_MAP.get(lang_code, lang_code.title())

    instruct = (
        f"Translate EVERY field in the JSON below into {target}. "
        "Preserve structure and keys. Preserve bullet points and line breaks. "
        "For medications, keep the order: name, dose, frequency. "
        "Return ONLY valid JSON with the SAME keys/structure."
    )
    text_in = json.dumps(payload_in, ensure_ascii=False)
    out_text = translation_summary(f"{instruct}\n\n{text_in}", target_lang=target)

    try:
        out = json.loads(out_text)
        out.setdefault("transcript", payload_in["transcript"])
        out["summary"] = _normalize_summary_keys(out.get("summary", {}))
        return jsonify(out)
    except Exception as e:
        print("translate_all parse error:", e, "\nRAW:", out_text[:800])
        return jsonify(payload_in)

@app.route("/follow_up", methods=["POST"])
def follow_up():
    payload = request.get_json(force=True) or {}
    summary = payload.get("summary") or {}
    try:
        qs = questions_suggestions(summary)
        if isinstance(qs, tuple): qs = qs[0]
        if not isinstance(qs, list): qs = [str(qs)]
        qs = [str(x).strip() for x in qs if str(x).strip()]
        return jsonify({"questions": qs[:3]}), 200
    except Exception as e:
        print("follow_up error:", e)
        return jsonify({"questions": ["Sorry, I couldn’t generate follow‑up questions."]}), 200
    

code_to_name = {
    "en": "English", "es": "Spanish", "fr": "French",
    "de": "German",  "zh": "Chinese", "ar": "Arabic", "hi": "Hindi",
}

def clean_translated_questions(output):
    """
    Extracts translated questions from raw output, assuming they are either in a JSON
    or appear as bullet points or numbered lines.
    """
    # Try to parse JSON response first
    if isinstance(output, dict) and "questions" in output:
        return output["questions"][:3]

    # If it's a string, extract bullet points manually
    if isinstance(output, str):
        lines = output.splitlines()
        extracted = []
        for line in lines:
            line = line.strip()
            if re.match(r"^[•\-–\d\*]+\s", line):  # bullets or numbers
                clean = re.sub(r"^[•\-–\d\*]+\s*", "", line)
                extracted.append(clean)
        return extracted[:3]

    # Fallback
    return []

@app.route("/translate_follow_up", methods=["POST"])
def translate_follow_up():
    payload = request.get_json(force=True) or {}
    questions = payload.get("questions") or []
    lang_code = (payload.get("lang") or "en").lower()
    target = code_to_name.get(lang_code, lang_code)

    qs = [str(q).strip() for q in questions[:3] if str(q).strip()]
    if not qs:
        return jsonify({"questions": []}), 200

    # Tag each question so structure survives translation
    block = "\n".join([f"[[Q{i+1}]] {q} [[/Q{i+1}]]" for i, q in enumerate(qs)])

    translated = translation_summary_safe(block, target_lang=target)

    # Pull each tagged item back out, even if the model added bullets/extra spaces
    pairs = re.findall(r"\[\[Q(\d+)\]\]\s*(.*?)\s*\[\[/Q\1\]\]", translated, flags=re.S)

    if len(pairs) < len(qs):
        print("⚠️ Tag matching failed. Falling back to bullet-based parsing.")
        # Try to extract up to 3 bullet points
        bullets = re.findall(r"[•\-–\*\d\.\)]\s*(.+)", translated)
        if len(bullets) >= len(qs):
            pairs = [(str(i+1), bullets[i]) for i in range(len(qs))]
        else:
            # Final fallback: just grab non-empty lines
            lines = [line.strip() for line in translated.splitlines() if line.strip()]
            pairs = [(str(i+1), lines[i]) for i in range(min(len(lines), len(qs)))]


    def clean(txt: str, orig: str) -> str:
        txt = (txt or "").replace("```"," ").strip()
        txt = re.sub(r"^[#>\-\*\s•\d\.\)\(]+", "", txt)  # strip bullets/numbers
        txt = re.sub(r"\s{2,}", " ", txt).strip()
        # keep only first line
        lines = txt.splitlines()
        for line in lines:
            if "?" in line and len(line.strip()) > 5:
                return line.strip()
        return orig

    out = []
    for i, orig in enumerate(qs, start=1):
        found = next((t for n, t in pairs if str(n) == str(i)), "")
        out.append(clean(found, orig))

    return jsonify({"questions": out}), 200

@app.post("/qa")
def qa_endpoint():
    """
    Body: {
      "question": str,
      "context": {
        "transcript": str,
        "summary": {
          "allergies": ..., "symptoms": ..., "diagnosis": ...,
          "medications": ..., "instructions": ..., "notes": ...
        }
      }
    }
    """
    data = request.get_json(force=True) or {}
    q = (data.get("question") or "").strip()
    ctx = data.get("context") or {}

    if not q:
        return jsonify({"answer": "Please enter a question.", "followups": []}), 200

    res = interactive_qa(q, ctx)
    return jsonify(res), 200

@app.post("/check_interactions")
def check_interactions():
    """
    Body: { "current_meds": [str], "new_meds": [str] }
    Returns: { "has_issue": bool, "interactions": [...], "raw": ... }
    """
    data = request.get_json(force=True) or {}
    current_meds = [str(x).strip() for x in (data.get("current_meds") or []) if str(x).strip()]
    new_meds     = [str(x).strip() for x in (data.get("new_meds") or [])     if str(x).strip()]

    res = drug_interactions(current_meds, new_meds)
    return jsonify(res), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
