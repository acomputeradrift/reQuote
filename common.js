//------------------------------------Token Management

let token = localStorage.getItem('token') || null; 
export let selectedQuotes = [];

// Exported functions for shared usage
export function setToken(newToken) {
    token = newToken;
    localStorage.setItem('token', newToken);  // Save to local storage for persistence
}

export function getToken() {
    return localStorage.getItem('token');
}

export function decodeToken(token) {
    const payload = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload; // Returns the payload object (including `exp`)
}

//------------------------------------Notification Management

//Show Notification
export function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');

    // Create a notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Append it to the container
    container.appendChild(notification);

    // Show the notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

//--------------------------------------------Log Out

// export function logout() {
//     const token = getToken();
//     if (!token) {
//         alert('You are not logged in.');
//         return;
//     }
//     const email = decodeToken(token)?.email; // Decode token to get the user's email

//     // Send the logout action to the backend
//     fetch('/logout', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ email }),
//     })
//         .then((response) => {
//             if (response.ok) {
//                 showNotification(`${email} successfully logged out`, 'success');
//             } else {
//                 console.error('Failed to log out on the server.');
//             }
//         })
//         .catch((error) => {
//             console.error('Error logging out:', error);
//         });

//     // Clear the token and redirect to login
//     localStorage.removeItem('token');
//     //alert('You have been logged out.');
//     window.location.href = 'login.html';
// }

//Updated Logout
export function logout() {
    const token = getToken();
    if (!token) {
        alert('You are not logged in.');
        return;
    }
    // Decode token to get the user's email
    const email = decodeToken(token)?.email;

    // Notify the server (optional: keep this for backend logging)
    fetch('/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
    }).then((response) => {
        if (response.ok) {
            // Show success notification on the frontend
            showNotification(`${email} logged out successfully`, 'success');
            
            // Clear the token and redirect to login
            localStorage.removeItem('token');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000); // Optional delay for notification visibility
        } else {
            console.error('Failed to notify server about logout.');
            showNotification('Logout failed. Please try again.', 'error');
        }
    }).catch((error) => {
        console.error('Error sending logout request:', error);
        showNotification('Logout failed due to a network error.', 'error');
    });
}


