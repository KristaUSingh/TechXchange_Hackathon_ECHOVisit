// doctor-intake.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('patientForm');

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

  // ---- Helpers -------------------------------------------------------------
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

  // ---- Calculators ---------------------------------------------------------
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

  // ------- Current Medications: launcher -> entry -> chips -------
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
  

  // ---- Live updates --------------------------------------------------------
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

  // ---- Submit handling -----------------------------------------------------
  form.addEventListener('submit', (e) => {
    if (!form.checkValidity()) {
      e.preventDefault(); // show native messages
      return;
    }
    e.preventDefault();
    computeBMI();
    computeBP();
    window.location.href = "../Record_FE/record_page.html";
  });
});
