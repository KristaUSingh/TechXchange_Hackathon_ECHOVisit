window.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://127.0.0.1:5000'; // adjust if needed
    const lockedClass = 'ta-locked';
  
    // --- demo fallback (optional; keep if you want ?demo=1 to work) ---
    const DEMO = new URLSearchParams(location.search).get('demo') === '1';
    const FALLBACK_AUDIO = 'assets/sample.mp3';
    const FALLBACK_PAYLOAD = {
      transcript:
        "This is a demo transcript. The patient reports chest tightness and shortness of breath when walking upstairs. Symptoms are worse at night.",
      summary: {
        allergies: "No known drug allergies",
        symptoms: [
          "shortness of breath when walking upstairs",
          "chest tightness",
          "worse at night"
        ],
        diagnosis: "mild asthma",
        medication: { name: "albuterol inhaler", dose: "2 puffs", frequency: "as needed" },
        instructions: [
          "use inhaler as prescribed",
          "avoid known triggers",
          "track symptom frequency"
        ],
        notes: "Follow up in 4–6 weeks if symptoms persist."
      }
    };
  
    // audio setup
    const audioData = sessionStorage.getItem("echovisit-audio");
    const audioEl = document.getElementById("reviewAudio");
    if (audioData) {
      audioEl.src = audioData;
      document.getElementById("playbackWrap").hidden = false;
    } else if (DEMO) {
      audioEl.src = FALLBACK_AUDIO;
      document.getElementById("playbackWrap").hidden = false;
    }
  
    // base payload from session or demo 
    let raw = sessionStorage.getItem("echovisit-result");
    let basePayload = {};
    try { basePayload = JSON.parse(raw || "{}"); } catch {}
    if ((!raw || !Object.keys(basePayload).length) && DEMO) {
      basePayload = FALLBACK_PAYLOAD;
      const blurb = document.getElementById('reviewBlurb');
      if (blurb) blurb.textContent = "HERE'S YOUR DOCTOR'S RECORDING & TRANSCRIPT";
    }
  
    // helpers
    const get  = (o,p)=>p.split('.').reduce((x,k)=>(x&&x[k]!=null)?x[k]:undefined,o);
    const pick = (o,paths,fb="") => { for (const p of paths){ const v=get(o,p); if(v!=null && String(v).trim()!=="") return v; } return fb; };
  
    function parseMaybeJSON(val) {
      if (typeof val !== "string") return val;
      const t = val.trim(); if (!t) return t;
      if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
        try { return JSON.parse(t); } catch {}
      }
      return val;
    }
    function formatValue(val, indent = 0) {
      val = parseMaybeJSON(val);
      const pad = "  ".repeat(indent);
  
      if (Array.isArray(val)) {
        return val.map(item =>
          typeof item === "object" ? formatValue(item, indent)
                                   : pad + "• " + formatValue(item, indent + 1)
        ).join("\n");
      }
      if (val && typeof val === "object") {
        if (val.name || val.dose || val.frequency) {
          const order = ["name","dose","frequency"];
          return order
            .filter(k => val[k] != null && String(val[k]).trim() !== "")
            .map(k => pad + "• " + k + ": " + String(val[k]))
            .join("\n");
        }
        return Object.entries(val)
          .map(([k, v]) => pad + "• " + k + ": " + (v && typeof v === "object" ? "\n"+formatValue(v, indent+1) : String(v)))
          .join("\n");
      }
      if (typeof val === "string" && (val.includes("\n") || val.includes(","))) {
        const parts = val.split(/\n|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) return parts.map(s => `• ${s}`).join("\n");
      }
      return String(val);
    }
  
    function toViewData(payload) {
      const summary = pick(payload, ["summary"], null) || payload;
      return {
        transcript:  pick(payload, ["transcript","text","summary.transcript"]),
        allergies:   pick(summary, ["allergies"], ""),
        symptoms:    pick(summary, ["symptoms"], ""),
        diagnosis:   pick(summary, ["diagnosis"], ""),
        medications: pick(summary, ["medication","medications"], ""),
        instructions:pick(summary, ["follow-up-instructions","instructions","follow_up_instructions"], ""),
        notes:       pick(summary, ["notes","additional_notes"], "")
      };
    }
  
    const originalView = toViewData(basePayload);
  
    // render
    const byId = id => document.getElementById(id);
    function setVal(id, val, {bullet=true} = {}) {
      const el = byId(id);
      if (!el) return;
      if (val == null || String(val).trim() === "") { el.value = ""; return; }
      el.value = bullet ? formatValue(val) : parseMaybeJSON(val);
      el.readOnly = true;
      el.classList.add(lockedClass);
    }
    function render(view) {
      setVal("rawTranscript", view.transcript, { bullet:false });
      document.getElementById("transcriptionWrap").hidden = !view.transcript;
  
      setVal("allergiesTA",    view.allergies);
      setVal("symptomsTA",     view.symptoms);
      setVal("diagnosisTA",    view.diagnosis);
      setVal("medicationsTA",  view.medications);
      setVal("instructionsTA", view.instructions);
      setVal("notesTA",        view.notes);
    }
  
    // initial paint
    render(originalView);
  
    // ---------- API + cache ----------
    const cache = new Map(); // key: `${mode}|${lang}`, value: payload shape {transcript, summary:{...}}
    cache.set('original|en', basePayload);
  
    async function postJSON(url, body){
      const resp = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      return resp.json();
    }
  
    function makeBaseSource() {
      return {
        transcript: originalView.transcript || "",
        summary: {
          allergies:   originalView.allergies   ?? "",
          symptoms:    originalView.symptoms    ?? "",
          diagnosis:   originalView.diagnosis   ?? "",
          medications: originalView.medications ?? "",
          instructions:originalView.instructions?? "",
          notes:       originalView.notes       ?? ""
        }
      };
    }
  
    async function getSimplified() {
      const key = 'simplified|en';
      if (cache.has(key)) return cache.get(key);
      const src = makeBaseSource();
      const data = await postJSON(`${API_BASE}/simplify_all`, src);
      cache.set(key, data);
      return data;
    }
  
    async function getTranslated(lang, mode /* 'original'|'simplified' */) {
      const key = `${mode}|${lang}`;
      if (cache.has(key)) return cache.get(key);
  
      const src = (mode === 'simplified') ? await getSimplified() : makeBaseSource();
      const data = await postJSON(`${API_BASE}/translate_all`, {
        lang,
        mode,
        transcript: src.transcript,
        summary: src.summary
      });
      cache.set(key, data);
      return data;
    }
  
    // UI wiring 
    const simplifyToggle = byId('simplifyToggle');
    const langSelect     = byId('langSelect');
  
    async function refresh() {
      const lang = langSelect.value || 'en';
      const simp = simplifyToggle.checked;
  
      try {
        if (lang === 'en' && !simp) {
          render(toViewData(cache.get('original|en')));
          return;
        }
        if (lang === 'en' && simp) {
          const simpData = await getSimplified();
          render(toViewData(simpData));
          return;
        }
        // any non-English
        const mode = simp ? 'simplified' : 'original';
        const translated = await getTranslated(lang, mode);
        render(toViewData(translated));
      } catch (e) {
        console.error(e);
        render(originalView);
      }
    }
  
    simplifyToggle.addEventListener('change', refresh);
    langSelect.addEventListener('change', refresh);
  
    // Allow URL presets (?lang=es&simp=1)
    const urlLang = new URLSearchParams(location.search).get('lang');
    const urlSimp = new URLSearchParams(location.search).get('simp');
    if (urlLang) langSelect.value = urlLang;
    if (urlSimp === '1') simplifyToggle.checked = true;
  
    refresh();
  });
  