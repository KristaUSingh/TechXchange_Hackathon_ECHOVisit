from flask import Flask, request, jsonify, Response
from watsonx_agent import simplify_summary, translation_summary
import json
from watsonx_agent import process_transcript
from flask_cors import CORS
import whisper
import os

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

    try:
        result = full_pipeline(filepath)

        if "simplified" in result:
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



if __name__ == "__main__":
    app.run(debug=True, port=5000)
