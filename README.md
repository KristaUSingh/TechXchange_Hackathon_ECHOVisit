# ECHOVisit Frontend

The **ECHOVisit Frontend** provides an intuitive web-based interface for both healthcare providers and patients.  
It consists of **two connected portals**: one for **Doctors** and one for **Patients**, built to ensure seamless interaction with the backend services and Watsonx AI agents.  


## Technologies Used
- **HTML5 / CSS3 / JavaScript (Vanilla)**: Core web technologies for structure, style, and interactivity
- **Flask (backend connection)**: REST API calls to connect with backend endpoints
- **IBM Watsonx AI**: Powers transcription, summarization, simplification, translation, and Q&A (via backend)
- **Supabase**: Used for authentication and database access (patient/doctor accounts, visit storage)
- **OpenAI Whisper**: Transcription of doctor audio (via backend)
- **Design Tools**: Figma (UI/UX wireframes and prototypes)


## Doctor Portal Features

### Doctor Login
- Secure login via email + password
  - If they don't have an account, doctors can create one with name, email, clinic name, and password 
- Integrated with Supabase Auth  

### Basic Information Entry
- Doctors fill in patient details (name, birthday, phone number, etc.)
- Vitals input (height, weight, blood pressure)  
- Medication + new prescriptions entry  
- **Smart Alerts**:  
  - BMI & blood pressure flagged if outside normal range  
  - Severity of drug interactions flagged between patient's current and newly prescribed medications (via backend Drug Interaction AI agent)  

### Verbal Summary
- Record a short audio note directly in the portal  
- Audio → automatically **transcribed** (Whisper)  
- Transcription → sent to **Watsonx Summarization Agent**  
- Organized into categories: **Symptoms, Diagnosis, Medications, Follow-up Instructions, Additional Notes**

### Review & Submit
- Doctor can **review, edit, or approve** structured categories  
- Finalized record sent to **Patient Portal**  


## Patient Portal Features

### Patient Login
- Secure login via email + password
  - If they don't have an account, doctors can create one with name, email, date of birth, and password  
- Patients select a visit to review  

### Reviewing Notes
- Access to:  
  - Doctor’s audio recording  
  - Full text transcription  
  - Structured summary (allergies, symptoms, medications, instructions, notes)  

### Simplification
- **Watsonx Simplification Agent** generates an easy-to-read version of the summary  

### Translation
- **Watsonx Translation Agent** translates summaries into supported languages  
- **Currently Supported**: Spanish, French, German  

### Patient Questions 
- Patients can ask clarifying questions about their care in simple language
- **Watsonx Follow-Up Question Agent** generated suggested questions that the patient can ask based on their visit 
- **Watsonx Interactive Q&A Agent** provides answers to patient questions via chat
  

## User Flow Summary

### Doctor Side
1. Login → Enter patient info → Add vitals & meds  
2. System flags abnormal vitals & drug interactions between current and newly prescribed medications 
3. Record audio → Backend processes (transcribe + summarize)  
4. Doctor reviews structured summary → Submit to patient portal  

### Patient Side
1. Login → Select a visit  
2. View doctor’s audio + transcription + structured notes  
3. Simplify the summary for easy understanding  
4. Translate into preferred language  
5. Generate follow-up questions via AI agent
6. Get answers to questions via AI Agent chat 


## Design & Usability
- **Calm Healthcare Palette**:  
  - Teal (#006D77), Mint (#83C5BE), Off-white (#EDF6F9), Coral (#FFDDD2), Deep Gray (#333)  
- **Accessibility-first**: Large text, simple navigation, clear labels  
