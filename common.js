//------------------------------------Token Management

let token = localStorage.getItem('token') || null; 
export let selectedQuotes = [];

// Exported functions for shared usage
// export function setToken(newToken) {
//     token = newToken;
//     localStorage.setItem('token', newToken);  // Save to local storage for persistence
// }

export function setToken(newToken) {
    if (newToken) {
        const decodedToken = decodeToken(newToken); // Use your decodeToken function
        const tokenExpiration = decodedToken.exp * 1000; // Convert `exp` to milliseconds

        localStorage.setItem('token', newToken);
        localStorage.setItem('tokenExpiration', tokenExpiration);
    } else {
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiration');
    }
}

export function getToken() {
    return localStorage.getItem('token');
}

export function decodeToken(token) {
    const payload = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload; // Returns the payload object (including `exp`)
}

//updated

export function checkTokenExpiration() {
    const token = getToken();
    if (!token) return;

    const decodedToken = decodeToken(token);
    const expirationTime = decodedToken.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    if (currentTime >= expirationTime) {
        alert('Your session has expired. You will be logged out.');
        logout(); // Trigger logout if token is expired
    } else {
        // Schedule a timeout to log out when the token expires
        const timeUntilExpiration = expirationTime - currentTime;
        setTimeout(() => {
            alert('Your session has expired. You will be logged out.');
            logout();
        }, timeUntilExpiration);
    }
}

// export function checkTokenExpiration() {
//     const tokenExpiration = localStorage.getItem('tokenExpiration');
//     if (tokenExpiration && Date.now() > parseInt(tokenExpiration)) {
//         alert('Your session has expired. You will be logged out.');
//         logout(); // Call the logout function
//     }
// }

// // Set an interval to check token expiration every minute
// setInterval(checkTokenExpiration, 60000);


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

//new Updated Logout

export function logout() {
    const token = getToken();
    if (!token) {
        alert('You are not logged in.');
        return;
    }

    // Decode token to get the user's email
    const email = decodeToken(token)?.email;

    // Notify the server (for backend logging)
    fetch('/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
    }).then((response) => {
        if (response.ok) {
            // Show success notification on the frontend
            showNotification(`${email || 'User'} logged out successfully`, 'success');
            
            // Clear the token and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('tokenExpiration');
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

// export function logout() {
//     const token = getToken();
//     if (!token) {
//         alert('You are not logged in.');
//         return;
//     }
//     // Decode token to get the user's email
//     const email = decodeToken(token)?.email;

//     // Notify the server (optional: keep this for backend logging)
//     fetch('/logout', {
//         method: 'POST',
//         headers: { 'Authorization': `Bearer ${token}` },
//     }).then((response) => {
//         if (response.ok) {
//             // Show success notification on the frontend
//             showNotification(`${email} logged out successfully`, 'success');
            
//             // Clear the token and redirect to login
//             localStorage.removeItem('token');
//             setTimeout(() => {
//                 window.location.href = 'login.html';
//             }, 2000); // Optional delay for notification visibility
//         } else {
//             console.error('Failed to notify server about logout.');
//             showNotification('Logout failed. Please try again.', 'error');
//         }
//     }).catch((error) => {
//         console.error('Error sending logout request:', error);
//         showNotification('Logout failed due to a network error.', 'error');
//     });
// }


