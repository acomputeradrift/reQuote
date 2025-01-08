

const signupForm = document.getElementById('signup-form');
let email = null; // Declare a global email variable
//Updated Signup Logic
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        console.log("Signup form detected, event listener added.");
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Event listener triggered.");
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            alert('Sign-up successful! Redirecting to login...');
            window.location.href = 'login.html'; // Redirect to login page
            // alert('Sign-up successful! Please log in.');
            signupForm.reset();
        } else {
            const data = await response.json();
            alert(`Sign-up failed: ${data.message}`);
        }
    } catch (error) {
        console.error("Error during sign-up:", error);
        alert('Sign-up failed.');
    }
        });
    } else {
        console.error("Signup form not found in the DOM.");
    }
});