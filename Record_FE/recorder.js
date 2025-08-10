let mediaRecorder;
let audioChunks = [];
let stream;
let isRecording = false;

const recordBtn   = document.getElementById("recordBtn");
const recordLabel = document.getElementById("recordLabel");
const resultEl    = document.getElementById("result");
const continueBtn = document.getElementById("continueBtn");

const NEXT_PAGE_URL = "../Transcript_FE/review_transcript.html";

function setUI(recording) {
  isRecording = recording;
  recordBtn.setAttribute("aria-pressed", String(recording));
  recordBtn.classList.toggle("recording", recording);
  recordLabel.innerHTML = recording ? "Click to stop<br>recording" : "Click to start<br>recording";
  if (recording) resultEl.textContent = "";
}

async function blobToDataURL(blob){
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

async function start() {
  try {
    // start fresh
    sessionStorage.removeItem("echovisit-audio");
    sessionStorage.removeItem("echovisit-result");

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Safari/iOS fallback for mimeType
    const canWebm = typeof MediaRecorder.isTypeSupported === "function"
      ? MediaRecorder.isTypeSupported("audio/webm")
      : false;

    mediaRecorder = canWebm
      ? new MediaRecorder(stream, { mimeType: "audio/webm" })
      : new MediaRecorder(stream);

    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => e.data && audioChunks.push(e.data);

    mediaRecorder.onstop = async () => {
      try {
        const type = canWebm ? "audio/webm" : (audioChunks[0]?.type || "audio/mp4");
        const audioBlob = new Blob(audioChunks, { type });

        resultEl.textContent = "Uploading and processing audio…";
        recordBtn.disabled = true; // prevent double clicks

        const form = new FormData();
        form.append("audio", audioBlob, "recording.webm");

        const resp = await fetch("http://127.0.0.1:5000/transcribe", {
          method: "POST",
          body: form,
        });

        if (!resp.ok) {
          resultEl.textContent = `❌ Upload failed (${resp.status}).`;
          return;
        }

        let data;
        try {
          data = await resp.json();
        } catch (e) {
          console.error("JSON parse error:", e);
          resultEl.textContent = "❌ Server returned invalid JSON.";
          return;
        }

        resultEl.textContent = "✅ Uploaded. Transcript received.";

        const audioDataURL = await blobToDataURL(audioBlob);
        sessionStorage.setItem("echovisit-audio", audioDataURL);
        sessionStorage.setItem("echovisit-result", JSON.stringify(data));
        console.log("Saved echovisit-result:", data);

        continueBtn.hidden = false;
        continueBtn.onclick = () => { window.location.href = NEXT_PAGE_URL; };

      } catch (err) {
        console.error(err);
        resultEl.textContent = "❌ Processing failed.";
      } finally {
        recordBtn.disabled = false;
        if (stream) stream.getTracks().forEach(t => t.stop());
      }
    };

    mediaRecorder.start();
    setUI(true);
  } catch (err) {
    console.error("Mic error:", err);
    alert("Mic access failed. Please allow microphone permissions.");
    setUI(false);
  }
}

function stop() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  setUI(false);
}

recordBtn.addEventListener("click", () => (isRecording ? stop() : start()));
