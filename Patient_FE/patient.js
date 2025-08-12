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
    
      let action = null;
      const langName = langSelect.options[langSelect.selectedIndex]?.text || lang;

      if (lang !== 'en' && simp) {
        action = `Simplifying and translating to ${langName}...`;
      } else if (lang !== 'en') {
        action = `Translating to ${langName}...`;
      } else if (simp) {
        action = "Simplified version loading...";
      }

      if (action) showOverlay(action);
    
      try {
        if (lang === 'en' && !simp) {
          render(toViewData(cache.get('original|en')));
          hideOverlay(); // ✅ ADD THIS
        } else if (lang === 'en' && simp) {
          const simpData = await getSimplified();
          render(toViewData(simpData));
          hideOverlay(); // ✅ ADD THIS
        } else {
          // any non-English
          const mode = simp ? 'simplified' : 'original';
    
          // Run both translation and follow-up translation in parallel
          const [translated, followUps] = await Promise.all([
            getTranslated(lang, mode),
            (fuWrap.style.display === 'block' && baseFollowUpsEN)
              ? translateFollowUps(baseFollowUpsEN, lang)
              : Promise.resolve(null)
          ]);
    
          render(toViewData(translated));
          if (followUps) showFollowUps(followUps);
          hideOverlay(); // hide after successful load
        }
      } catch (e) {
        console.error(e);
        render(originalView);
        hideOverlay(); // hide even on failure
      }
    }    
  
    simplifyToggle.addEventListener('change', refresh);
    langSelect.addEventListener('change', refresh);
  
    // Allow URL presets (?lang=es&simp=1)
    const urlLang = new URLSearchParams(location.search).get('lang');
    const urlSimp = new URLSearchParams(location.search).get('simp');
    if (urlLang) langSelect.value = urlLang;
    if (urlSimp === '1') simplifyToggle.checked = true;

    // ---------- FOLLOW-UP Qs (one-time generation, language-switch reuses) ----------
    const followTranslations = new Map(); // lang -> ["q1","q2","q3"]
    let baseFollowUpsEN = null;          // the canonical English questions

    // UI elements
    const yesFU = byId('yesFollowUp');
    const noFU  = byId('noFollowUp');
    const fuWrap = byId('followUpOutput');
    const fuTA   = byId('followUpTA');

    let loadingInterval = null;

    function showOverlay(message = "Loading...") {
      const overlay = document.getElementById("pageOverlay");
      const msg = document.getElementById("overlayMessage");
      if (overlay && msg) {
        msg.textContent = message;
        overlay.style.display = "flex";
      }
    }
    
    function hideOverlay() {
      const overlay = document.getElementById("pageOverlay");
      if (overlay) overlay.style.display = "none";
    }
    

    function showFollowUpLoading() {
      fuWrap.style.display = 'block';
      fuTA.value = "Generating follow-up questions";
      let dots = "";
      loadingInterval = setInterval(() => {
        dots = dots.length >= 3 ? "" : dots + ".";
        fuTA.value = "Generating follow-up questions" + dots;
      }, 500);
    }
    
    function stopFollowUpLoading() {
      clearInterval(loadingInterval);
      loadingInterval = null;
    }
    

    function showFollowUps(qs) {
      fuTA.value = (qs && qs.length) ? qs.map((q) => `• ${q}`).join('\n') : '';
      fuWrap.style.display = 'block';
    }
    function hideFollowUps() {
      fuTA.value = '';
      fuWrap.style.display = 'none';
    }

    async function fetchFollowUpsEN() {
      const src = makeBaseSource();
      const data = await postJSON(`${API_BASE}/follow_up`, { summary: src.summary });
      const arr = Array.isArray(data.questions) ? data.questions : [];
      return arr.slice(0, 3);
    }

    async function translateFollowUps(questions, lang) {
      if (!questions || !questions.length || lang === 'en') return questions || [];
      // cached?
      if (followTranslations.has(lang)) return followTranslations.get(lang);
      const data = await postJSON(`${API_BASE}/translate_follow_up`, {
        questions,
        lang
      });
      const out = Array.isArray(data.questions) ? data.questions.slice(0, 3) : [];
      followTranslations.set(lang, out);
      return out;
    }

    yesFU?.addEventListener('click', async () => {
      yesFU.disabled = true;
      showFollowUpLoading(); // <- start animation
      try {
        // Generate EN only once
        if (!baseFollowUpsEN) {
          baseFollowUpsEN = await fetchFollowUpsEN();
          followTranslations.set('en', baseFollowUpsEN);
        }
        const lang = (langSelect?.value || 'en');
        const qs = await translateFollowUps(baseFollowUpsEN, lang);
        stopFollowUpLoading(); // <- stop animation
        showFollowUps(qs);
      } catch (e) {
        console.error('follow-up generate error:', e);
        stopFollowUpLoading(); // <- stop animation even on error
        showFollowUps(["Sorry, I couldn’t generate follow-up questions right now."]);
      } finally {
        yesFU.disabled = false;
      }
    });
    

    noFU?.addEventListener('click', () => {
      hideFollowUps();
    });

    // If the user switches language AFTER generation, just translate the one-time EN set.
    langSelect?.addEventListener('change', async () => {
      if (fuWrap.style.display === 'block' && baseFollowUpsEN) {
        try {
          const lang = (langSelect.value || 'en');
          const qs = await translateFollowUps(baseFollowUpsEN, lang);
          showFollowUps(qs);
        } catch (e) {
          console.error('follow-up retranslate error:', e);
        }
      }
    });

    // === Interactive Q&A (safe wrapper) ===
(function QAModule(){
  const API = (typeof API_BASE === "string" && API_BASE) || "http://127.0.0.1:5000";

  const qaStream = document.getElementById("qa-stream");
  const qaForm   = document.getElementById("qa-form");
  const qaInput  = document.getElementById("qa-input");
  const qaSend   = document.getElementById("qa-send");

  if (!qaForm || !qaInput || !qaSend || !qaStream) {
    console.warn("[Q&A] missing DOM elements");
    return; // prevents ReferenceError
  }

  function qaAdd(role, text){
    const wrap = document.createElement("div");
    wrap.className = `qa-msg ${role}`;
    const meta = document.createElement("div");
    meta.className = "qa-meta";
    meta.textContent = role === "user" ? "You" : "ECHOVisit";
    const body = document.createElement("div");
    body.textContent = text;
    wrap.append(meta, body);
    qaStream.appendChild(wrap);
    qaStream.scrollTop = qaStream.scrollHeight;
    return wrap;
  }
  function qaTyping(){
    const t = document.createElement("div");
    t.className = "typing";
    t.textContent = "Agent is typing…";
    qaStream.appendChild(t);
    qaStream.scrollTop = qaStream.scrollHeight;
    return t;
  }

  // auto-grow textarea; Enter=send, Shift+Enter=newline
  qaInput.addEventListener("input", () => {
    qaInput.style.height = "auto";
    qaInput.style.height = Math.min(qaInput.scrollHeight, 180) + "px";
  });
  qaInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      qaForm.requestSubmit();
    }
  });

  qaForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const q = (qaInput.value || "").trim();
    if (!q) return;

    qaAdd("user", q);
    qaInput.value = ""; qaInput.style.height = "auto";
    qaInput.disabled = true; qaSend.disabled = true;
    const typing = qaTyping();

    const src = typeof makeBaseSource === "function" ? makeBaseSource() : { transcript:"", summary:{} };
    const url = `${API}/qa`;
    const body = { question: q, context: src };

    try{
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(body)
      });
      const raw = await res.text();
      let data; try { data = JSON.parse(raw); } catch { data = { answer: raw }; }

      typing.remove();
      qaAdd("bot", data.answer || "Sorry — I didn’t get that.");

      if (Array.isArray(data.followups) && data.followups.length){
        const chips = document.createElement("div");
        chips.style.display="flex"; chips.style.flexWrap="wrap"; chips.style.gap="8px"; chips.style.marginTop="6px";
        data.followups.forEach(text=>{
          const btn = document.createElement("button");
          btn.type="button"; btn.textContent=text;
          btn.style.border="1px solid rgba(0,0,0,.15)";
          btn.style.padding="6px 10px"; btn.style.borderRadius="999px";
          btn.style.background="#fff"; btn.style.cursor="pointer";
          btn.onclick = ()=>{
            qaInput.value = text;
            qaForm.requestSubmit();
          };
          chips.appendChild(btn);
        });
        qaStream.lastElementChild.appendChild(chips);
        qaStream.scrollTop = qaStream.scrollHeight;
      }
    }catch(err){
      typing.remove();
      qaAdd("bot","Network error. Check backend console.");
      console.error("[Q&A] fetch error:", err);
    }finally{
      qaInput.disabled = false; qaSend.disabled = false; qaInput.focus();
    }
  });
})();

    refresh();


  });
  