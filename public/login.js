document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:8000/login', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            
            
            localStorage.setItem('username', result.username); 
            window.location.href = '/admin'; 
        } else {
            alert(result.message || "Σφάλμα σύνδεσης");
        }
    } catch (err) {
        console.error("Login error:", err);
        alert("Server error. Please try again later.");
    }
});
