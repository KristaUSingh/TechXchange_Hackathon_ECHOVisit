from flask import Flask, request, jsonify, Response
import json
from watsonx_agent import process_transcript
from flask_cors import CORS
import re
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
        return Response(
            json.dumps({"error": "No audio file uploaded"}, ensure_ascii=False, indent=2),
            mimetype="application/json"
        ), 400

    audio = request.files['audio']
    
    # Make sure temp folder exists
    os.makedirs("temp", exist_ok=True)

    filepath = os.path.join("temp", audio.filename)
    audio.save(filepath)

    try:
        result = full_pipeline(filepath)
        if "simplified" in result:
            result["simplified"] = result["simplified"].replace("\n", " ").strip()

        # Format JSON with readable line spacing between sections
        formatted_json = json.dumps(result, ensure_ascii=False, indent=2)
        formatted_json = formatted_json.replace('",\n  "summary":', '",\n\n  "summary":')
        formatted_json = formatted_json.replace('",\n  "simplified":', '",\n\n  "simplified":')
        formatted_json = formatted_json.replace('",\n  "translated":', '",\n\n  "translated":')
        formatted_json = formatted_json.replace('",\n  "questions":', '",\n\n  "questions":')

        return Response(formatted_json, mimetype="application/json")
    
    except Exception as e:
        return Response(
            json.dumps({"error": str(e)}, ensure_ascii=False, indent=2),
            mimetype="application/json"
        ), 500
    
    

if __name__ == "__main__":
    app.run(debug=True, port=5000)
