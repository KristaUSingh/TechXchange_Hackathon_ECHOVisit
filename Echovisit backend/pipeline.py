from flask import Flask, request, jsonify
import json
from ai_utils import (
    summary_transcript, simplify_summary, translation_summary, questions_suggestions
)
import whisper
import tempfile
import os
from werkzeug.utils import secure_filename

app = Flask("EchoVisit")
model = whisper.load_model("base")


def transcribe_audio(audio_file):
    # Get file extension
    filename = secure_filename(audio_file.filename)
    ext = os.path.splitext(filename)[1] or ".m4a"

    # Save with correct extension so ffmpeg can decode it
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp:
        input_path = temp.name
        audio_file.save(input_path)

    # Transcribe
    result = model.transcribe(input_path)
    os.remove(input_path)

    return result["text"]


@app.route("/pipeline", methods=["POST"])
def entire_pipeline():
    audio = request.files["audioRecording"]

    transcript = transcribe_audio(audio)

    # Processing pipeline using ai_utils
    summary = summary_transcript(transcript)
    simplification = simplify_summary(summary)
    translation = translation_summary(simplification, target_lang="es")
    follow_up_questions = questions_suggestions(summary)

    response = {
        "transcript": transcript,
        "summary": summary,
        "simplification": simplification,
        "translation_language": translation,
        "follow_up_questions": follow_up_questions
    }

    print("[Pipeline Output]")
    print(json.dumps(response, indent=2))  # <-- pretty print in terminal

    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True)
