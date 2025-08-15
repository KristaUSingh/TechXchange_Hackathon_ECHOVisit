const search = document.getElementById('search');
const chips = [...document.querySelectorAll('.chip')];

const withinDays = (isoDate, days) => {
  if (days === 'all') return true;
  const then = new Date(isoDate);
  const now = new Date();
  const diff = (now - then) / (1000 * 60 * 60 * 24);
  return diff <= Number(days);
};

function applyFilters() {
  const cards = [...document.querySelectorAll('.card')]; // get updated list
  const term = search.value.trim().toLowerCase();
  const active = chips.find(c => c.classList.contains('active'));
  const range = active ? active.dataset.range : 'all';

  cards.forEach(card => {
    const hay = (
      card.dataset.provider +
      ' ' +
      card.dataset.notes +
      ' ' +
      card.querySelector('.title').textContent +
      ' ' +
      card.querySelector('.meta').textContent
    ).toLowerCase();
    const matchesText = hay.includes(term);
    const matchesDate = withinDays(card.dataset.date, range);
    card.style.display = matchesText && matchesDate ? '' : 'none';
  });
}

search.addEventListener('input', applyFilters);
chips.forEach(chip =>
  chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    applyFilters();
  })
);

async function getDoctorsMap() {
    const resp = await fetch(`http://127.0.0.1:5000/doctors`);
    const data = await resp.json();
    const map = {};
    data.doctors.forEach(doc => {
      map[doc.id] = doc.name;
    });
    return map;
}

// Load patient visits
document.addEventListener('DOMContentLoaded', async () => {
  const patientId = sessionStorage.getItem('patient_id');
  if (!patientId) {
    alert('Please log in first.');
    window.location.href = '../Patient_Login_FE/patient_login.html';
    return;
  }

  const welcomeEl = document.querySelector("h1");
  const patientName = sessionStorage.getItem("patient_name"); // or however you store it
  if (welcomeEl && patientName) {
    welcomeEl.textContent = `WELCOME PATIENT ${patientName.toUpperCase()}!`;
  }

  try {
    const doctorsMap = await getDoctorsMap();

    const resp = await fetch(`http://127.0.0.1:5000/visits/patient/${patientId}`);
    const data = await resp.json();

    const visits = data.visits || [];
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    visits.forEach(v => {
      const visitName = v["name of visit"] || "Unnamed Visit";
      const clinicName = v.clinic || "Unknown Clinic";
      const doctorName = doctorsMap[v.doctor_id] || "Unknown Doctor";

      const dateObj = v.visit_date ? new Date(v.visit_date) : null;
      const formattedDate = dateObj && !isNaN(dateObj)
        ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : "Invalid Date";

      const card = document.createElement('article');
      card.className = 'card';
      card.dataset.date = v.visit_date || "";
      card.dataset.provider = doctorName;
      card.dataset.notes = visitName;

      card.innerHTML = `
        <div class="row">
          <h3 class="title">${visitName}</h3>
        </div>
        <p class="meta">${formattedDate} • ${doctorName} • ${clinicName}</p>
        <a class="btn" href="../Patient_FE/patient.html?visit_id=${v.id}">View Summary</a>
      `;

      grid.appendChild(card);
    });

    applyFilters();
  } catch (err) {
    console.error('Error loading visits:', err);
    alert('Could not load your visits. Please try again later.');
  }

});
