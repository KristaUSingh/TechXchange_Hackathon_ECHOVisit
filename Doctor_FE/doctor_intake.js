// doctor-intake.js
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://127.0.0.1:5000'; // adjust if needed
  const form = document.getElementById('patientForm');

    // Store patient basic info for linking visits in Supabase
  const patientEmailInput = document.getElementById('patientEmail');
  const patientDOBInput = document.getElementById('patientDOB');

  // Whenever doctor moves forward, save these so review_transcript.js can use them
  function savePatientLinkInfo() {
    const email = patientEmailInput?.value.trim();
    const dob = patientDOBInput?.value.trim();
    if (email && dob) {
      sessionStorage.setItem('patient_email', email);
      sessionStorage.setItem('patient_birthday', dob);
    }
  }
  
  // NEW: store immediately when values change
  patientEmailInput?.addEventListener('input', savePatientLinkInfo);
  patientDOBInput?.addEventListener('input', savePatientLinkInfo);


  // NEW: submit button control + flag
  const submitBtn = form?.querySelector('button[type="submit"]');
  let checkingInteractions = false;
  function setSubmitEnabled(enabled) {
    if (!submitBtn) return;
    submitBtn.disabled = !enabled;
    submitBtn.classList.toggle('is-disabled', !enabled);
    submitBtn.setAttribute('aria-busy', (!enabled).toString());
  }

  // --- Height/Weight/BMI elements
  const feetEl   = document.getElementById('height-feet');
  const inchEl   = document.getElementById('height-inches');
  const weightEl = document.getElementById('weight');
  const unitEl   = document.getElementById('weight-unit');
  const bmiEl    = document.getElementById('bmi');
  const bmiIndicator = document.getElementById('bmi-indicator');

  const heightCmHidden = document.getElementById('height-cm');
  const weightKgHidden = document.getElementById('weight-kg');

  // --- Blood Pressure elements
  const bpSysEl  = document.getElementById('bp-sys');
  const bpDiaEl  = document.getElementById('bp-dia');
  const bpIndEl  = document.getElementById('bp-indicator');
  const bpWrap   = document.getElementById('bp-wrap'); // optional border tint

  const bpSysHidden = document.getElementById('bp-systolic');
  const bpDiaHidden = document.getElementById('bp-diastolic');
  const bpCatHidden = document.getElementById('bp-category');

  // --- Interaction results panel
  const interactionBox = document.getElementById('interaction-result');

  // ==== helpers =============================================================
  function classifyBMI(bmi){
    if (bmi < 18.5) return { label: 'Low',    cls: 'bmi-low',  inputCls: 'low'  };
    if (bmi < 25.0) return { label: 'Normal', cls: 'bmi-ok',   inputCls: 'ok'   };
    return             { label: 'High',       cls: 'bmi-high', inputCls: 'high' };
  }

  // Low: sys < 90 OR dia < 60; Normal: sys <=130 AND dia <=85; High: otherwise
  function classifyBP(sys, dia){
    if (sys < 90 || dia < 60)   return { label: 'Low',    cls: 'bmi-low',  inputCls: 'low'  };
    if (sys <= 130 && dia <=85) return { label: 'Normal', cls: 'bmi-ok',   inputCls: 'ok'   };
    return                         { label: 'High',       cls: 'bmi-high', inputCls: 'high' };
  }

  // ==== calculators =========================================================
  function computeBMI() {
    const ft  = parseInt((feetEl && feetEl.value) || '', 10);
    const ins = parseInt((inchEl && inchEl.value) || '', 10);
    const w   = parseFloat((weightEl && weightEl.value) || '');

    if (Number.isNaN(ft) || Number.isNaN(ins) || Number.isNaN(w)) {
      if (bmiEl) bmiEl.value = '';
      if (bmiIndicator) { bmiIndicator.textContent = ''; bmiIndicator.className = 'bmi-indicator'; }
      if (heightCmHidden) heightCmHidden.value = '';
      if (weightKgHidden) weightKgHidden.value = '';
      if (bmiEl) bmiEl.classList.remove('ok','low','high');
      return;
    }

    const totalIn  = ft * 12 + ins;
    const heightM  = totalIn * 0.0254;          // inches → meters
    const heightCm = Math.round(heightM * 100); // for backend

    const weightKg = (unitEl && unitEl.value === 'kg') ? w : (w * 0.45359237);
    if (heightM <= 0) { if (bmiEl) bmiEl.value = ''; return; }

    const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10; // 1 dp
    if (bmiEl) bmiEl.value = String(bmi);
    if (heightCmHidden) heightCmHidden.value = String(heightCm);
    if (weightKgHidden) weightKgHidden.value = String(Math.round(weightKg * 10) / 10);

    if (bmiIndicator) {
      const { label, cls, inputCls } = classifyBMI(bmi);
      bmiIndicator.textContent = `BMI ${bmi} — ${label}`;
      bmiIndicator.className = `bmi-indicator ${cls}`;
      if (bmiEl) {
        bmiEl.classList.remove('ok','low','high');
        bmiEl.classList.add(inputCls);
      }
    }
  }

  function computeBP(){
    const sys = parseInt((bpSysEl && bpSysEl.value) || '', 10);
    const dia = parseInt((bpDiaEl && bpDiaEl.value) || '', 10);

    if (Number.isNaN(sys) || Number.isNaN(dia)) {
      if (bpIndEl) { bpIndEl.textContent = ''; bpIndEl.className = 'bmi-indicator'; }
      if (bpSysHidden) bpSysHidden.value = '';
      if (bpDiaHidden) bpDiaHidden.value = '';
      if (bpCatHidden) bpCatHidden.value = '';
      if (bpWrap) bpWrap.classList.remove('ok','low','high');
      return;
    }

    const { label, cls, inputCls } = classifyBP(sys, dia);

    if (bpIndEl) {
      bpIndEl.textContent = `BP ${sys}/${dia} mmHg — ${label}`;
      bpIndEl.className = `bmi-indicator ${cls}`;
    }
    if (bpSysHidden) bpSysHidden.value = String(sys);
    if (bpDiaHidden) bpDiaHidden.value = String(dia);
    if (bpCatHidden) bpCatHidden.value = label;

    if (bpWrap) {
      bpWrap.classList.remove('ok','low','high');
      bpWrap.classList.add(inputCls);
    }
  }

  // ==== CURRENT MEDS ========================================================
  (function(){
    const launchBtn = document.getElementById('med-launch');
    const entryRow  = document.getElementById('meds-entry');

    const nameIn = document.getElementById('med-name-input');
    const doseIn = document.getElementById('med-dose-input');
    const freqIn = document.getElementById('med-freq-input');
    const addBtn = document.getElementById('med-add-btn');

    const chips  = document.getElementById('meds-chips');
    const hiddenJson = document.getElementById('current-meds-json');
    const hiddenList = document.getElementById('current-meds-list');

    const meds = [];

    // Hide fields at start
    entryRow.hidden = true;
    entryRow.classList.remove('hidden');

    function showEntry(){
      entryRow.hidden = false;
      launchBtn.classList.add('hidden');
      nameIn.focus();
    }
    function hideEntry(){
      entryRow.hidden = true;
      launchBtn.classList.remove('hidden');
    }

    function render(){
      chips.innerHTML = '';
      if (meds.length === 0){
        chips.innerHTML = '<div class="meds-empty">No medications added.</div>';
        return;
      }
      meds.forEach((m, i) => {
        const chip = document.createElement('div');
        chip.className = 'med-chip';
        const text = [m.name, m.dose, m.frequency].filter(Boolean).join(' — ');
        chip.innerHTML = `<span>${text}</span><button type="button" class="x" aria-label="Remove">×</button>`;
        chip.querySelector('.x').addEventListener('click', () => {
          meds.splice(i,1);
          syncHidden(); render();
          document.dispatchEvent(new CustomEvent('medsChanged'));
        });
        chips.appendChild(chip);
      });
    }

    function syncHidden(){
      hiddenJson.value = JSON.stringify(meds);
      const flat = meds.map(m => [m.name, m.dose, m.frequency].filter(Boolean).join(' — '));
      hiddenList.value = JSON.stringify(flat);
    }

    function addFromInputs(){
      const name = (nameIn.value || '').trim();
      const dose = (doseIn.value || '').trim();
      const freq = (freqIn.value || '').trim();
      if (!name && !dose && !freq) return;
      if (!name) { nameIn.focus(); return; }

      meds.push({ name, dose, frequency: freq });
      nameIn.value=''; doseIn.value=''; freqIn.value='';
      syncHidden(); render();
      hideEntry();
      document.dispatchEvent(new CustomEvent('medsChanged'));
    }

    launchBtn?.addEventListener('click', showEntry);
    addBtn?.addEventListener('click', addFromInputs);

    [nameIn, doseIn, freqIn].forEach(el => {
      el?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter'){ e.preventDefault(); addFromInputs(); }
        if (e.key === 'Escape'){ e.preventDefault(); hideEntry(); }
      });
    });

    document.getElementById('patientForm')?.addEventListener('submit', syncHidden);

    render();
  })();

  // ==== NEW MEDS (after-visit prescriptions) ================================
  let NEW_MEDS_STATE = [];

  (function(){
    const launchBtn = document.getElementById('newmed-launch');
    const entryRow  = document.getElementById('newmeds-entry');

    const nameIn = document.getElementById('newmed-name-input');
    const doseIn = document.getElementById('newmed-dose-input');
    const freqIn = document.getElementById('newmed-freq-input');
    const addBtn = document.getElementById('newmed-add-btn');

    const chips  = document.getElementById('newmeds-chips');
    const hiddenJson = document.getElementById('new-meds-json');
    const hiddenList = document.getElementById('new-meds-list');

    if (entryRow) {
      entryRow.hidden = true;
      entryRow.classList.remove('hidden');
    }

    function showEntry(){
      entryRow.hidden = false;
      launchBtn.classList.add('hidden');
      nameIn.focus();
    }
    function hideEntry(){
      entryRow.hidden = true;
      launchBtn.classList.remove('hidden');
    }

    function render(){
      chips.innerHTML = '';
      if (NEW_MEDS_STATE.length === 0){
        chips.innerHTML = '<div class="meds-empty">No new prescriptions added.</div>';
        return;
      }
      NEW_MEDS_STATE.forEach((m, i) => {
        const chip = document.createElement('div');
        chip.className = 'med-chip';
        const text = [m.name, m.dose, m.frequency].filter(Boolean).join(' — ');
        chip.innerHTML = `<span>${text}</span><button type="button" class="x" aria-label="Remove">×</button>`;
        chip.querySelector('.x').addEventListener('click', () => {
          NEW_MEDS_STATE.splice(i,1);
          syncHidden(); render();
          document.dispatchEvent(new CustomEvent('newMedsChanged'));
        });
        chips.appendChild(chip);
      });
    }

    function syncHidden(){
      if (hiddenJson) hiddenJson.value = JSON.stringify(NEW_MEDS_STATE);
      if (hiddenList) {
        const flat = NEW_MEDS_STATE.map(m => [m.name, m.dose, m.frequency].filter(Boolean).join(' — '));
        hiddenList.value = JSON.stringify(flat);
      }
    }

    function addFromInputs(){
      const name = (nameIn?.value || '').trim();
      const dose = (doseIn?.value || '').trim();
      const freq = (freqIn?.value || '').trim();
      if (!name && !dose && !freq) return;
      if (!name) { nameIn.focus(); return; }

      NEW_MEDS_STATE.push({ name, dose, frequency: freq });
      if (nameIn) nameIn.value=''; if (doseIn) doseIn.value=''; if (freqIn) freqIn.value='';
      syncHidden(); render();
      hideEntry();
      document.dispatchEvent(new CustomEvent('newMedsChanged'));
    }

    launchBtn?.addEventListener('click', showEntry);
    addBtn?.addEventListener('click', addFromInputs);

    [nameIn, doseIn, freqIn].forEach(el => {
      el?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter'){ e.preventDefault(); addFromInputs(); }
        if (e.key === 'Escape'){ e.preventDefault(); hideEntry(); }
      });
    });

    document.getElementById('patientForm')?.addEventListener('submit', syncHidden);

    render();
  })();

  // ==== DRUG INTERACTION CHECK =============================================
  let inflight = null;
  async function runInteractionCheck() {
    const currentHidden = document.getElementById('current-meds-json');
    const currentList = (() => {
      try { return JSON.parse(currentHidden?.value || '[]'); } catch { return []; }
    })();
    const currentNames = currentList.map(m => m?.name).filter(Boolean);
    const newNames = NEW_MEDS_STATE.map(m => m.name).filter(Boolean);

    // If no new meds, clear and ensure submit is enabled
    if (!newNames.length) {
      if (interactionBox) {
        interactionBox.className = 'bmi-indicator';
        interactionBox.textContent = '';
      }
      setSubmitEnabled(true);
      return;
    }

    if (interactionBox) {
      interactionBox.className = 'bmi-indicator';
      interactionBox.textContent = 'Checking drug interactions…';
    }

    const payload = { current_meds: currentNames, new_meds: newNames };

    // NEW: disable submit while checking
    checkingInteractions = true;
    setSubmitEnabled(false);

    try {
      inflight = fetch(`${API_BASE}/check_interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resp = await inflight;
      const data = await resp.json();

      if (data.has_issue && data.interactions && data.interactions.length) {
        if (interactionBox) {
          interactionBox.className = 'indicator-bad';
          const lines = data.interactions.map(i => {
            const pair = Array.isArray(i.pair) ? i.pair.join(' + ') : i.pair;
            const sev = i.severity || 'unknown';
            const note = i.note || i.description || '';
            return `• ${pair} — ${sev}${note ? `: ${note}` : ''}`;
          });
          interactionBox.textContent = `⚠️ Potential interactions detected:\n${lines.join('\n')}`;
        }
        const namesToFlag = new Set(
          data.interactions.flatMap(i => (Array.isArray(i.pair) ? i.pair : [i.pair])).map(s => String(s).toLowerCase())
        );
        const chipSets = [document.getElementById('meds-chips'), document.getElementById('newmeds-chips')];
        chipSets.forEach(set => {
          set?.querySelectorAll('.med-chip')?.forEach(chip => {
            const nm = chip.querySelector('span')?.textContent?.split(' — ')[0]?.trim().toLowerCase();
            if (!nm) return;
            chip.classList.toggle('chip-bad', namesToFlag.has(nm));
          });
        });
      } else {
        if (interactionBox) {
          interactionBox.className = 'indicator-ok';
          interactionBox.textContent = '✅ No clinically significant interactions found.';
        }
        document.querySelectorAll('.med-chip.chip-bad').forEach(el => el.classList.remove('chip-bad'));
      }
    } catch (e) {
      if (interactionBox) {
        interactionBox.className = 'indicator-bad';
        interactionBox.textContent = 'Error checking interactions. Please try again.';
      }
      console.error(e);
    } finally {
      inflight = null;
      checkingInteractions = false;
      setSubmitEnabled(true); // re-enable submit after check completes
    }
  }

  function maybeRunInteractionCheck(){
    if (inflight) return;
    runInteractionCheck();
  }

  // re-run when either list changes
  document.addEventListener('newMedsChanged', maybeRunInteractionCheck);
  document.addEventListener('medsChanged',    maybeRunInteractionCheck);

  // ==== Live updates for BMI/BP =============================================
  ['input','change'].forEach(evt => {
    if (bpSysEl) bpSysEl.addEventListener(evt, computeBP);
    if (bpDiaEl) bpDiaEl.addEventListener(evt, computeBP);
  });
  computeBP();

  [feetEl, inchEl, weightEl, unitEl].forEach(el => {
    if (!el) return;
    el.addEventListener('input',  computeBMI);
    el.addEventListener('change', computeBMI);
  });
  computeBMI();

  form.addEventListener('submit', (e) => {
    if (checkingInteractions || inflight) {
      e.preventDefault();
      alert('Still checking drug interactions… please wait a moment.');
      return;
    }
  
    if (!form.checkValidity()) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
  
    // --- BASIC INFO ---
    const email = document.getElementById("patientEmail")?.value.trim() || "";
    const dob = document.getElementById("patientDOB")?.value || "";
    sessionStorage.setItem("patient_email", email);
    sessionStorage.setItem("patient_birthday", dob);
  
    // --- VITALS ---
    computeBMI();
    computeBP();
    const feet = parseInt(document.getElementById("height-feet")?.value || 0, 10);
    const inches = parseInt(document.getElementById("height-inches")?.value || 0, 10);
    const height_in = (feet * 12) + inches;
    const weight_lb = parseFloat(document.getElementById("weight")?.value || 0);
    const systolic = document.getElementById("bp-sys")?.value || "";
    const diastolic = document.getElementById("bp-dia")?.value || "";
    const bmiValue = document.getElementById("bmi")?.value || "";
  
    sessionStorage.setItem("height_in", height_in);
    sessionStorage.setItem("weight_lb", weight_lb);
    sessionStorage.setItem("bmi", bmiValue);
    sessionStorage.setItem("bp_systolic", systolic);
    sessionStorage.setItem("bp_diastolic", diastolic);
  
    // --- CURRENT MEDS ---
    const currentMedsJSON = document.getElementById("current-meds-json")?.value || "[]";
    sessionStorage.setItem("current_meds_json", currentMedsJSON);
  
    // --- NEW MEDS ---
    const newMedsJSON = document.getElementById("new-meds-json")?.value || "[]";
    sessionStorage.setItem("new_meds_json", newMedsJSON);
  
    // Go to next page
    window.location.href = "../Record_FE/record_page.html";
  });
  
});
