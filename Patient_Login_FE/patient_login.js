// patient_login.js
document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("patientLoginBtn");

    loginBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        try {
            const resp = await fetch("http://127.0.0.1:5000/login/patient", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await resp.json();
            if (resp.ok && data.success) {
                // Store patient info for later pages
                sessionStorage.setItem("patient_id", data.patient_id);
                sessionStorage.setItem("patient_name", data.name);

                alert("Login successful!");
                window.location.href = "../Patient_Session_FE/patient_session.html";
            } else {
                alert(data.error || "Invalid login credentials");
            }
        } catch (err) {
            console.error("Login failed:", err);
            alert("Error logging in. Please try again.");
        }
    });
});
