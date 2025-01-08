import { showAdminFeatures } from './dashboard.js';
import { fetchSelectedQuotes } from './dashboard.js';
import { loadQuotes } from './dashboard.js';
import { showNotification } from './dashboard.js';

const loginForm = document.getElementById('login-form');
let email = null; // Declare a global email variable

// Updated Login Logic
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log("Login form detected, event listener added.");
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Event listener triggered.");
            e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            console.log("Log in successful, front end");
            const data = await response.json();
            token = data.token;
            showNotification(`Welcome ${data.email}!`, 'success');
            window.location.href = 'dashboard'; // Redirect to dashboard
            // authSection.style.display = 'none';
            // addQuotesSection.style.display = 'block';
            // showAdminFeatures(data.email); // Show admin-only features
            fetchSelectedQuotes(); // Fetch selected quotes from the backend
            loadQuotes();
        } else {
            const data = await response.json();
            console.log("Log in failed, front end");
            alert(`Login failed: ${data.message}`);
        }
    } catch (error) {
        console.error("Error during login:", error);
        alert('Login failed.');
    }
        });
    } else {
        console.error("Login form not found in the DOM.");
    }
});