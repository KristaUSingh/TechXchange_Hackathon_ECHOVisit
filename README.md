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

ECHOVisit is a web-based platform, powered by IBM watsonx.ai Granite model, that turns a doctor’s quick verbal description of a case into a standardized, shareable visit summary. Doctors can record their notes about their patients' visits. Our system can then transcribe the audio, extract and organize clinical data (symptoms, diagnosis, medication, instructions, etc.), rewrite it in plain language for patients, and translate it to languages other than English on patient request. The platform includes two connected portals — one for doctors and one for patients.


# Why is ECHOVisit Useful?
ECHOVisit cuts clinicians’ documentation overhead and improves patient follow-through. Doctors spend less time writing notes, patients receive clear, plain-language visit records, translations when needed, and an integrated AI-enabled chat for asking medicine-related questions. 

# Features
1. Clinician-Facing
- **Quick verbal input** — Clinicians record a short spoken case description.  
- **Lightweight note editing & approval** — Transcribed and AI-extracted summaries are shown to clinicians for review and sign-off before publishing to the patient.  
- **EHR-ready export** — Structured JSON output (EHR/FHIR-friendly) for integrations, referrals, and analytics.

2. Automated Backend (What the System Does)
- **Speech → Text** — Accurate audio transcription with timestamps and speaker metadata.  
- **Information extraction** — **Watsonx AI summarization agent** pulls structured data (symptoms, vitals, diagnosis, medications, instructions, additional notes).  
- **Simplification & translation** — Dedicated **Watsonx AI agents** generate plain-language patient summaries and translated variants on demand.  
- **Medication checks** — Flags potential drug–drug interactions and allergy conflicts.  
- **Health flagging** — Detects out-of-range vitals (e.g., BP, BMI) with configurable thresholds and highlights them for clinician review.  

3. Patient-Facing
- **Plain-language visit summary** — Easy-to-read summary of the visit with key action items.  
- **Integrated AI chat** — Patients can ask follow-up questions about diagnoses, meds, or instructions; responses can be translated. This chatbot is powered by a **Watsonx AI agent**  

4. Safety, Privacy & Ops
- **Clinician control** — All patient-visible content is gated by clinician approval.  
- **Configurable rules** — Thresholds for flags and interaction checks can be tuned per clinic.  

---

# Conclusion

EchoVisit began as a focused hackathon prototype, but our goal is bigger: to make every outpatient visit leave behind a clear, usable record for patients and a lighter paperwork load for clinicians. By combining staff-entered vitals and clerical data with a clinician’s spoken case narrative, EchoVisit produces structured records, plain-language summaries, medication checks, and an interactive patient Q&A — all with clinician review at the center.

Next steps include pilot testing in clinical settings, building FHIR/EHR connectors, strengthening medication-reconciliation and safety checks, and localizing the patient experience into more languages. If you’re a developer, clinician, or potential pilot partner, please open a GitHub issue or start a discussion — we’d love to collaborate.
