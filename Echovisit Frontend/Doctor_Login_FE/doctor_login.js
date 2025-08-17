// doctor_login.js
document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("doctorLoginBtn");

    loginBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        try {
            const resp = await fetch("http://127.0.0.1:5000/login/doctor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await resp.json();
            if (resp.ok && data.success) {
                // Store doctor_id so visit pages can use it
                sessionStorage.setItem("doctor_id", data.doctor_id);
                sessionStorage.setItem("doctor_name", data.name);

                alert("Login successful!");
                window.location.href = "../Doctor_FE/doctor_intake.html";
            } else {
                alert(data.error || "Invalid login credentials");
            }
        } catch (err) {
            console.error("Login failed:", err);
            alert("Error logging in. Please try again.");
        }
    });
});
