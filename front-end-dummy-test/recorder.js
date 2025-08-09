let mediaRecorder;
let audioChunks = [];

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const playback = document.getElementById("audioPlayback");
const resultDiv = document.getElementById("result");

startBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    audioChunks = [];

    mediaRecorder.ondataavailable = e => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks);
      const audioURL = URL.createObjectURL(audioBlob);
      playback.src = audioURL;
      playback.load();

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      resultDiv.innerText = "Uploading and processing audio...";

      try {
        const response = await fetch("http://127.0.0.1:5000/transcribe", {
          method: "POST",
          body: formData
        });

        const result = await response.json();
        resultDiv.innerText = JSON.stringify(result, null, 2);
      } catch (err) {
        console.error(err);
        resultDiv.innerText = "❌ Upload failed.";
      }
    };

    mediaRecorder.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } catch (err) {
    alert("Mic access failed. Please allow mic permissions.");
    console.error("Mic error:", err);
  }
};

stopBtn.onclick = () => {
  mediaRecorder.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;
};
