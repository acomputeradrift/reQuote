import { fetchSelectedQuotes, loadQuotes } from './dashboard.js';
import { setToken, showNotification } from './common.js';

// The `defer` attribute ensures the DOM is ready
const loginForm = document.getElementById('login-form');

// Check if the form exists before adding the event listener
if (loginForm) {
    console.log("Login form detected, event listener added.");

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Login form submitted.");

        const emailInput = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput, password })
            });

            if (response.ok) {
                const data = await response.json();
                setToken(data.token);
                showNotification(`Welcome ${data.email}!`, 'success');
                
                // Redirect and ensure the dashboard scripts load properly
                window.location.href = 'dashboard.html';
                fetchSelectedQuotes();
                loadQuotes();
            } else {
                const errorData = await response.json();
                showNotification(`Login failed: ${errorData.message}`, 'error');
            }
        } catch (error) {
            console.error("Error during login:", error);
            showNotification('Login failed due to a network error.', 'error');
        }
    });
} else {
    console.error("Login form not found in the DOM.");
}