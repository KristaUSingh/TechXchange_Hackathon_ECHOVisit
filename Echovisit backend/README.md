# EchoVisit Backend

<img width="1920" height="1080" alt="DiagramReadme" src="https://github.com/user-attachments/assets/6cb8e210-bd1e-4e4f-9ae7-0482d8ee70e0" />

Backend service for **EchoVisit**, developed by **Beavers Intelligence Unit** for the **2025 IBM TechXchange Pre-Conference watsonx Hackathon**. The backend provides APIs for transcription, summarization, simplification, translation, follow-up Q&A, and medication interaction checks. It integrates with **OpenAI Whisper**, **IBM watsonx.ai**, and **Supabase**. The AI Agents was deployed using **watsonx Orchestrate Deployment Space**.


## Features
- **Doctor & Patient Authentication**: has patients' and doctors' login info in Supabase
- **Audio Transcription**: translates audio to speech using OpenAI Whisper  
- **Summarization Agent**: structures summary into Electronic Medical Record (EMR) categories using IBM watsonx.ai 
- **Simplification Agent**: easy-understanding summaries for someone with no medical knowledge 
- **Translation Agent**: multi-language summaries
- **Interactive Q&A Agent**: patient questions answered 
- **Drug Interaction Agent**: medication conflict checks 
- **Supabase Database**: store doctors, patients, and visits


## Tech Stack
- **Flask**: API framework 
- **OpenAI Whisper**: speech-to-text 
- **IBM watsonx AI**: agentic NLP pipeline and automated workflow 
- **Supabase**: auth & storage
- **Python 3.10+**: python version

## Project Structure
```
Echovisit_Backend/
│── api_server.py # Main Flask server & endpoints
│── watsonx_agent.py # IBM watsonx agent integrations
│── auth_route.py # Authentication routes (doctor/patient)
│── supa_client.py # Supabase client connection
│── models.py # DB model helpers
│── connection.py # DB connection utilities
│── ai_utils.py # Test stubs for Watsonx agent functions (mock logic)
│── pipeline.py # Test pipeline using ai_utils for end-to-end flow
│── requirements.txt # Python dependencies
│── README.md # This file
```

## API Endpoints
### Core
- **POST /transcribe**: Upload audio, receive structured summary --> Summarization Agent
- **POST /simplify_all**: Simplify transcript & summary --> Simplification Agent
- **POST /translate_all**: Translate full visit summary --> Translation Agent
- **POST /follow_up**: Generate follow-up questions --> Follow-Up Questions Agent
- **POST /translate_follow_up**: Translate follow-up questions --> Combo of Translation and Follow-Up Questions Agent 
- **POST /qa**: Ask custom interactive Q&A --> Interactive Q&A Agent 
- **POST /check_interactions**: Check drug interactions --> Drug Interaction Agent 

### Authentication
- **POST /signup/doctor:** Register a new doctor account with name, clinic, email, and password.
- **POST /login/doctor:** Authenticate a doctor and return their profile/ID.
- **POST /signup/patient:** Register a new patient account with name, birthday, email, and password.
- **POST /login/patient:** Authenticate a patient and return their profile/ID.

### Supabase: Doctor, Patient, & Visits
- **POST /save_visit**: Save visit summary
- **GET /visits/<visit_id>**: Fetch single visit
- **GET /visits/patient/<patient_id>**: Fetch visits for patient
