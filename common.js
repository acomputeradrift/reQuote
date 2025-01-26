//------------------------------------Token Management

let token = localStorage.getItem('token') || null; 
export let selectedQuotes = [];


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

//UPDATED

export function logout(isAutoLogout = false) {
    const token = getToken();
    const email = token ? decodeToken(token)?.email : 'Unknown';

    console.log(`${email} is logging out. AutoLogout: ${isAutoLogout}`);

    fetch('/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
    }).then((response) => {
        if (response.ok) {
            response.json().then((data) => {
                console.log(data.message);
                showNotification(`${email || 'User'} logged out successfully`, 'success');
            });
        } else {
            console.error('Failed to notify server about logout.');
            showNotification('Logout failed. Please try again.', 'error');
        }
        // Clear token and redirect regardless of backend response
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiration');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Error sending logout request:', error);
        showNotification('Logout failed due to a network error.', 'error');
        // Clear token and redirect regardless of network issues
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiration');
        window.location.href = 'login.html';
    });
}


