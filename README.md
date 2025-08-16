# TechXchange_Hackathon_ECHOVisit
<div align="center">
<img width="250" height="250" alt="Image" src="https://github.com/user-attachments/assets/50c2a6e3-fab4-4082-96e8-5fef510f6dcf" />
</div>

Explains the work done by our team, **Beavers Intelligence Unit**, for the **2025 IBM TechXchange Pre-Conference watsonx Hackathon**. The goal of the hackathon is to utilize agentic AI to develop an innovative solution to a real-world, everyday problem. This project was completed using JavaScript, CSS, and HTML for the front end, and Python's Flask for the backend. 


# Video - Click on Thumbnail to Watch
[![Watch the video](https://i.vimeocdn.com/video/2048355535-e6c601fe2375a32c9de50153ab1c71ef5758753582af0720072a49a649c0fc0d-d_960x540?&r=pad&region=us)](https://vimeo.com/1110564140)
https://vimeo.com/1110564140

# What is ECHOVisit?
<div align="center">
<img width="704" height="264" alt="Image" src="https://github.com/user-attachments/assets/11b25f72-0548-44c1-b71b-0faa63b3eea3" />
</div>


ECHOVisit is a web-based platform, powered by IBM watsonx.ai Granite model, that transforms complex medical notes into clear, patient-friendly visit summaries. With two connected portals—one for doctors and one for patients—EchoVisit helps doctors save time on documentation while giving patients the clarity they deserve about their health.


# Why is ECHOVisit Useful?
Medical communication is broken:
- **Doctors** face overwhelming documentation workloads.
- **Patients** leave confused, struggling with medical jargon, poor handwriting, or language barriers.


EchoVisit bridges this gap. By combining transcription, summarization, simplification, translation, and interactive Q&A into a single workflow, we eliminate confusion for patients and stress for doctors.


# Features
### 1. Doctor Portal
- Record a short audio note after each visit.
- AI agents transcribe, structure into EMR fields, flag abnormal vitals, and check drug interactions.
- Doctor reviews and approves before sending to patient.

### 2. Patient Portal
- View summaries simplified into layman’s terms.
- Translate instantly into multiple languages.
- Access AI-generated follow-up questions.
- Chat with an Interactive Q&A Agent for visit-specific answers.

### 3. Agentic AI Pipeline
- **Summarization Agent** → EMR-ready structured notes.
- **Simplification Agent** → Jargon-free, patient-friendly language.
- **Translation Agent** → Multi-language support.
- **Follow-up Generator** → Predicts patient questions.
- **Interactive Q&A** → Answers in context, prompts doctor when needed.
- **Drug Interaction Agent** → Flags medication conflicts.


# Technical Overview
- **Backend:** Flask, Supabase (PostgreSQL with row-level security & auth).
- **Transcription:** OpenAI Whisper
- **AI Agents:** Built and prompt-tuned in IBM watsonx.ai (Granite-3-3-8b-instruct)
- **Agentic AI:** Orchestrated pipeline with fallbacks (e.g., if Q&A agent is uncertain, patient is prompted to ask their doctor).

### Datasets:
- Medical glossary for simplification.
- EMR-compatible schema for structuring visit data.
- Common health questions dataset for improving Q&A accuracy.


# Conclusion
EchoVisit is the foundation of something bigger. We imagine this platform not only supporting doctors in their daily workflows but also extending into ambulance settings, where EMTs could use it for rapid, on-scene entry of electronic medical records. By turning complex notes into clear, structured, and patient-friendly summaries, EchoVisit reduces burnout for providers and gives patients the understanding they need to take control of their care.

While this version is a proof-of-concept, the potential of watsonx.ai makes us confident that EchoVisit can continue to grow into a scalable solution for healthcare communication.

Thank you for checking out EchoVisit! We hope to see you at the watsonx Hackathon finals in Orlando, Florida!
