document.getElementById("doctorSignupBtn").addEventListener("click", async (e) => {
    e.preventDefault(); // stop form from reloading the page

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const clinic = document.getElementById("clinic").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const payload = { first_name: firstName, last_name: lastName, clinic, email, password };

    try {
        const resp = await fetch("http://127.0.0.1:5000/signup/doctor", {  
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();

        if (data.success) {
            alert("Doctor account created! Please log in.");
            window.location.href = "../Doc_or_Patient_FE/doc_or_patient.html";
        } else {
            alert("Error: " + (data.error || JSON.stringify(data.details)));
        }
    } catch (err) {
        console.error("Signup failed", err);
        alert("Signup failed. Check console for details.");
    }
});
