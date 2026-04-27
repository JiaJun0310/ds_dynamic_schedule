document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            window.location.href = '/admin'; 
        } else {
            alert(result.message || "Σφάλμα σύνδεσης");
        }
    } catch (err) {
        console.error("Login error:", err);
        alert("Server error. Please try again later.");
    }
});

const password = document.getElementById('password');
const ShowPassword = document.getElementById('ShowPassword');

ShowPassword.addEventListener('click', () => {
    const type = password.type === 'password' ? 'text' : 'password';
    password.type = type;

    ShowPassword.classList.toggle('fa-eye');
    ShowPassword.classList.toggle('fa-eye-slash');
});
