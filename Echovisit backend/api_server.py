from flask import Flask, request, jsonify
from watsonx_agent import process_transcript
from flask_cors import CORS
import whisper
import os

whisper_model = whisper.load_model("base")
app = Flask("ECHOVisit")
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

@app.route("/transcribe", methods=["POST"])
def transcribe_and_summarize():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    audio = request.files['audio']
    
    # Make sure temp folder exists
    os.makedirs("temp", exist_ok=True)

    filepath = os.path.join("temp", audio.filename)
    audio.save(filepath)

    try:
        result = full_pipeline(filepath)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
