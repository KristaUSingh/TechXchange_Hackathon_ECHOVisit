window.addEventListener('DOMContentLoaded', () => {
    // 1) Inject buttons with clear classes
    const buttonHTML = `
      <button type="button" class="btn-17 btn-correct">
        <span class="text-container"><span class="text">CORRECT</span></span>
      </button>
      <button type="button" class="btn-17 btn-edit">
        <span class="text-container"><span class="text">EDIT</span></span>
      </button>
    `;
    document.querySelectorAll('.decision-buttons').forEach(c => (c.innerHTML = buttonHTML));

    // 2) Helpers for lock/unlock visuals
    function lock(ta, correctBtn, editBtn) {
      ta.readOnly = true;
      ta.classList.add('ta-locked');
      correctBtn.classList.add('pill-active');
      editBtn.classList.remove('pill-active');
    }
    function unlock(ta, correctBtn, editBtn) {
      ta.readOnly = false;
      ta.classList.remove('ta-locked');
      editBtn.classList.add('pill-active');
      correctBtn.classList.remove('pill-active');
    }

    // 3) Wire each group to its explicit target textarea
    document.querySelectorAll('.decision-buttons').forEach(group => {
      const targetId = group.dataset.target;    // <- allergiesTA, symptomsTA, ...
      const ta = document.getElementById(targetId);
      if (!ta) return;

      const correctBtn = group.querySelector('.btn-correct');
      const editBtn    = group.querySelector('.btn-edit');

      // default: unlocked
      unlock(ta, correctBtn, editBtn);

      correctBtn.addEventListener('click', e => {
        e.preventDefault();
        lock(ta, correctBtn, editBtn);
      });

      editBtn.addEventListener('click', e => {
        e.preventDefault();
        unlock(ta, correctBtn, editBtn);
        ta.focus();
        const v = ta.value; ta.setSelectionRange(v.length, v.length);
      });
    });

    // 4) (Optional) auto‑lock fields that already have content after you set values
    ["allergiesTA","symptomsTA","diagnosisTA","medicationsTA","instructionsTA","notesTA"].forEach(id => {
      const ta = document.getElementById(id);
      if (!ta || !ta.value.trim()) return;
      const group = document.querySelector(`.decision-buttons[data-target="${id}"]`);
      const correctBtn = group?.querySelector('.btn-correct');
      const editBtn    = group?.querySelector('.btn-edit');
      if (correctBtn && editBtn) lock(ta, correctBtn, editBtn);
    });
  
    // ----- Modal wiring -----
    const continueBtn  = document.querySelector('.border-el-btn');
    const confirmModal = document.getElementById('confirmationModal');
    const successModal = document.getElementById('successModal');
    const confirmYes   = document.getElementById('confirmYes');
    const confirmNo    = document.getElementById('confirmNo');
    const goMenuBtn    = document.getElementById('goMenuBtn');
    const signOutBtn   = document.getElementById('signOutBtn');
  
    const openModal  = m => { m.classList.add('show'); m.style.display = 'block'; };
    const closeModal = m => { m.classList.remove('show'); m.style.display = 'none'; };
  
    continueBtn.addEventListener('click', e => { e.preventDefault(); openModal(confirmModal); });
    confirmYes.addEventListener('click', () => { closeModal(confirmModal); openModal(successModal); });
    confirmNo.addEventListener('click', () => closeModal(confirmModal));
    window.addEventListener('click', e => { if (e.target === confirmModal) closeModal(confirmModal); if (e.target === successModal) closeModal(successModal); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(confirmModal); closeModal(successModal); }});
    goMenuBtn.addEventListener('click', () => { window.location.href = 'menu.html'; });
    signOutBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
  
    // ===== Load audio + results from sessionStorage =====
    const audioData = sessionStorage.getItem("echovisit-audio");
    const resultRaw = sessionStorage.getItem("echovisit-result");
    console.log("echovisit-result (raw):", resultRaw);
  
    // Audio
    if (audioData) {
      const audioEl = document.getElementById("reviewAudio");
      audioEl.src = audioData;
      document.getElementById("playbackWrap").hidden = false;
    }
  
    // Parse payload once
    let payload = {};
    try { payload = JSON.parse(resultRaw || "{}"); } catch(e){ console.error("Bad JSON in session:", e); }
  
    // ---------- DEBUG: show the real shape in console ----------
    console.log("echovisit-result (parsed):", payload);
  
    // Helpers
    const get  = (o,p)=>p.split('.').reduce((x,k)=>(x && x[k] != null) ? x[k] : undefined, o);
    const pick = (o,paths,fb="") => { for (const p of paths) { const v=get(o,p); if (v!=null && String(v).trim()!=="") return v; } return fb; };
  
    // Fuzzy search across ANY nested object for keys like /symptom|diagnos|medicat|instruct|note|allerg/i
    function findByKeyLike(obj, re) {
      let out = [];
      (function walk(o){
        if (o && typeof o === 'object') {
          for (const [k,v] of Object.entries(o)) {
            if (re.test(k)) {
              if (v != null && String(v).trim() !== "") out.push(v);
            }
            if (v && typeof v === 'object') walk(v);
          }
        }
      })(obj);
      // Prefer strings; if arrays/objects, stringify nicely
      const first = out[0];
      if (first == null) return "";
      if (typeof first === "string") return first;
      try { return JSON.stringify(first, null, 2); } catch { return String(first); }
    }
  
    const summary = pick(payload, ["summary"], null) || payload;
  
    const data = {
      transcript:  pick(payload, ["transcript","text","summary.transcript"]),
      allergies:   pick(summary, ["allergies"], "")       || findByKeyLike(summary, /allerg/i),
      symptoms:    pick(summary, ["symptoms"], "")        || findByKeyLike(summary, /symptom/i),
      diagnosis:   pick(summary, ["diagnosis"], "")       || findByKeyLike(summary, /diagnos/i),
      medications: pick(summary, ["medication","medications"], "") || findByKeyLike(summary, /medic(at|ine)|rx|meds/i),
      instructions:pick(summary, ["follow-up-instructions","instructions","follow_up_instructions"], "") || findByKeyLike(summary, /instruct|follow[-_\s]?up/i),
      notes:       pick(summary, ["notes","additional_notes"], "") || findByKeyLike(summary, /note/i),
    };
  
    console.log("mapped (after fuzzy):", data);

    // Try to turn a JSON-looking string into a real value
    function parseMaybeJSON(val) {
      if (typeof val !== "string") return val;
      const t = val.trim();
      if (!t) return t;
      if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
        try { return JSON.parse(t); } catch { /* leave as string */ }
      }
      return val;
    }

    function formatValue(val, indent = 0) {
      val = parseMaybeJSON(val); // parse stringified JSON first
      const pad = "  ".repeat(indent);

      if (Array.isArray(val)) {
        return val.map(item =>
          typeof item === "object"
            ? formatValue(item, indent) // no outer bullet here
            : pad + "- " + formatValue(item, indent + 1)
        ).join("\n");
      }

      if (val && typeof val === "object") {
        // Special case: medications
        if (val.name || val.dose || val.frequency) {
          const order = ["name", "dose", "frequency"];
          return order
            .filter(k => val[k] != null && String(val[k]).trim() !== "")
            .map(k => pad + "- " + k + ": " + String(val[k]))
            .join("\n");
        }
        // Generic object formatting
        return Object.entries(val)
          .map(([k, v]) => pad + "- " + k + ": " + String(v))
          .join("\n");
      }

      // Comma/newline separated strings → bullets
      if (typeof val === "string" && (val.includes("\n") || val.includes(","))) {
        const parts = val.split(/\n|,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
          .map(s => s.trim())
          .filter(Boolean);
        if (parts.length > 1) return parts.map(s => `- ${s}`).join("\n");
      }

      return String(val);
    }


    // Use this to set textarea values
    const byId = (id) => document.getElementById(id);
    function setVal(id, val) {
      const el = byId(id);
      if (!el || val == null || String(val).trim() === "") return;

      // Skip bullet formatting for transcript only
      if (id === "rawTranscript") {
        el.value = parseMaybeJSON(val); // keep original formatting
      } else {
        el.value = formatValue(val);
      }
    }


    if (data.transcript) {
      setVal("rawTranscript", data.transcript);
      document.getElementById("transcriptionWrap").hidden = false;
    }
    setVal("allergiesTA",    data.allergies);
    setVal("symptomsTA",     data.symptoms);
    setVal("diagnosisTA",    data.diagnosis);
    setVal("medicationsTA",  data.medications);
    setVal("instructionsTA", data.instructions);
    setVal("notesTA",        data.notes);
  
    if (!audioData && !resultRaw) {
      document.getElementById("reviewBlurb").textContent = "No recording found. Please record a summary first.";
    }
});