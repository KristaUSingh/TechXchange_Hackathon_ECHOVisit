# TechXchange_Hackathon_ECHOVisit
<div align="center">
<img width="250" height="250" alt="Image" src="https://github.com/user-attachments/assets/50c2a6e3-fab4-4082-96e8-5fef510f6dcf" />
</div>

Explains the work done by our team **Beavers Intelligence Unit** for the **2025 IBM TechXchange Pre-Conference WatsonX Hackathon**. The goal of the hackathon is the use agentic AI to create an innovative solve to an everyday, real-world problem. This project was completed using Javascript, css, and html.

# Video
https://vimeo.com/1110564140

# What is ECHOVisit?
<div align="center">
<img width="704" height="264" alt="Image" src="https://github.com/user-attachments/assets/11b25f72-0548-44c1-b71b-0faa63b3eea3" />
</div>

ECHOVisit is an AI agent, powered by WatsonX AI's Granite models, that turns a doctor’s quick verbal description of a case into a standardized, shareable visit summary. Clinicians simply record a brief spoken note; our system transcribes the audio, extracts and organizes clinical data (symptoms, diagnosis, meds, instructions), and rewrites it in plain language for patients, and translates it to languages other than English on patient request. The product is a web-based platform, which includes two connected portals — one for clinicians and one for patients.


# Why is ECHOVisit Useful?
ECHOVisit cuts clinicians’ documentation overhead and improves patient follow-through. Clinicians spend less time writing notes, patients get clear, plain-language visit records, translations when needed, and an integrated AI-enabled chat for asking medicine-related questions, and both parties can use the same standardized summary for follow-up, referrals, or EHR imports.

# Features
## Clinician-Facing
- **Quick verbal input** — Clinicians record a short spoken case description.  
- **Lightweight note editing & approval** — Transcribed and AI-extracted summaries are shown to clinicians for review and sign-off before publishing to the patient.  
- **EHR-ready export** — Structured JSON output (EHR/FHIR-friendly) for integrations, referrals, and analytics.

## Automated Backend (What the System Does)
- **Speech → Text** — Accurate audio transcription with timestamps and speaker metadata.  
- **Information extraction** — **Watsonx AI summarization agent** pulls structured data (symptoms, vitals, diagnosis, medications, instructions, additional notes).  
- **Simplification & translation** — Dedicated **Watsonx AI agents** generate plain-language patient summaries and translated variants on demand.  
- **Medication checks** — Flags potential drug–drug interactions and allergy conflicts.  
- **Health flagging** — Detects out-of-range vitals (e.g., BP, BMI) with configurable thresholds and highlights them for clinician review.  

## Patient-Facing
- **Plain-language visit summary** — Easy-to-read summary of the visit with key action items.  
- **Integrated AI chat** — Patients can ask follow-up questions about diagnoses, meds, or instructions; responses can be translated. This chatbot is powered by a **Watsonx AI agent**  

## Safety, Privacy & Ops
- **Clinician control** — All patient-visible content is gated by clinician approval.  
- **Configurable rules** — Thresholds for flags and interaction checks can be tuned per clinic.  

---

# Conclusion

EchoVisit began as a focused hackathon prototype, but our goal is bigger: to make every outpatient visit leave behind a clear, usable record for patients and a lighter paperwork load for clinicians. By combining staff-entered vitals and clerical data with a clinician’s spoken case narrative, EchoVisit produces structured records, plain-language summaries, medication checks, and an interactive patient Q&A — all with clinician review at the center.

Next steps include pilot testing in clinical settings, building FHIR/EHR connectors, strengthening medication-reconciliation and safety checks, and localizing the patient experience into more languages. If you’re a developer, clinician, or potential pilot partner, please open a GitHub issue or start a discussion — we’d love to collaborate.
