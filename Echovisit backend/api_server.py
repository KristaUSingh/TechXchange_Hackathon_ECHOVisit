# api_server.py
from flask import Flask, request, jsonify
from watsonx_agent import run_prompt
import json

app = Flask("ECHOVisit")

def extract_clean_json(raw_text):
    try:
        # Extract JSON block from the string
        json_str = raw_text[raw_text.find('{'):raw_text.rfind('}') + 1]
        parsed = json.loads(json_str)

        # Replace nulls with "N/A"
        def replace(obj):
            if isinstance(obj, dict):
                return {k: replace(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [replace(i) for i in obj]
            return "N/A" if obj is None else obj

        return replace(parsed)

    except Exception as e:
        raise ValueError(f"Failed to parse clean JSON: {e}")


@app.route('/ask', methods=['POST'])
def ask_watsonx():
    data = request.get_json()
    user_prompt = data.get('prompt', '')

    if not user_prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    try:
        result = run_prompt(user_prompt)
        lines = [line.strip() for line in result.split("\n") if line.strip()]
        return jsonify({"response": lines})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

# SUMMARIZATION - symptoms, diagnosis, medications, instructions, additional notes
@app.route('/summary', methods=['POST'])
def summarize_transcript():
    data = request.get_json()
    transcript = data.get('transcript', '')

    if not transcript:
        return jsonify({'error': 'Transcript is required'}), 400

    # Prompt format: summarization request for the transcript
    summary_prompt = f"""You are a clinical summarization agent. 

            From the provided doctor's notes, extract the following fields

            - Symptoms
            - Diagnosis
            - Medications (list each med with dose and frequency)
            - Instructions (any guidance for patient)
            - Additional Notes (anything extra doctor mentioned)

            DO NOT add extra information or assume anything about the patient that wasn't explicitly mentioned.
            DO NOT assume extra follow-up instructions that the doctor didn't explicitly provide, even generic comments like "increase fluid intake"
            DO NOT generate your own follow-up instructions if none are provided in the transcript.

            - If any field is missing, return it as "N/A"
            - Return only one single JSON object and nothing else

            Conversation:
            {transcript}
            """

    try:
        result = run_prompt(summary_prompt)
        summary = extract_clean_json(result)
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# SIMPLIFICATION - someone with no medical background or knowledge:
@app.route('/simplify', methods=['POST'])
def simplify_transcript():
    data = request.get_json()
    transcript = data.get('transcript', '')

    if not transcript:
        return jsonify({'error': 'Transcript is required'}), 400
    
    simplify_prompt = f""" You are a medical assistant helping patients understand medical information.

            Please rewrite the following conversation or notes in simple, plain English for a patient with no medical background.

            Instructions:
            - DO NOT repeat or quote the original conversation
            - DO NOT include any headings, titles, or extra formatting
            - Use short, simple sentences
            - Keep it friendly and reassuring
            - Aim for a 6th-grade reading level
            - Focus ONLY on the important information the patient needs
            - Make it no longer than 3–5 sentences unless absolutely necessary

            Here is the original text:
            {transcript}
            """
    try:
        result = run_prompt(simplify_prompt)
        simplification = result.strip()
        return jsonify({"simplified_t": simplification})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
