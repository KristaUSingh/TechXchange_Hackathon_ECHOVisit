document.getElementById("patientForm").addEventListener("submit", function(event) {
  if (!this.checkValidity()) {
    // Let browser show the native validation messages
    event.preventDefault();
    return;
  }

  event.preventDefault(); // stop normal form submission
  window.location.href = "../Record_FE/record_page.html"; // redirect
});
