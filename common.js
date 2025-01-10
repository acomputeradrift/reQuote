// Shared global variables (No direct mutation allowed outside this file)
let token = localStorage.getItem('token') || null; 
export let selectedQuotes = [];

// Exported functions for shared usage
export function setToken(newToken) {
    token = newToken;
    localStorage.setItem('token', newToken);  // Save to local storage for persistence
}

export function getToken() {
    return token;
}

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

    // Remove the notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Logout function (Clears token from storage)
export function logout() {
    localStorage.removeItem('token');
    token = null; // Clear token in memory too
    alert('You have been logged out.');
    window.location.href = 'login.html';
}



// Shared global variables
// export let token = null; 
// export let selectedQuotes = [];

// // Exported functions for shared usage
// export function setToken(newToken) {
//     token = newToken;
// }

// export function getToken() {
//     return token;
// }

// //Show Notification
// export function showNotification(message, type = 'info') {
//     const container = document.getElementById('notification-container');

//     // Create a notification element
//     const notification = document.createElement('div');
//     notification.className = `notification ${type}`;
//     notification.textContent = message;

//     // Append it to the container
//     container.appendChild(notification);

//     // Show the notification
//     setTimeout(() => {
//         notification.classList.add('show');
//     }, 10);

//     // Remove the notification after 5 seconds
//     setTimeout(() => {
//         notification.classList.remove('show');
//         setTimeout(() => notification.remove(), 300); // Wait for fade-out transition
//         }, 5000);
// }

// // Logout function
// export function logout() {
//     localStorage.removeItem('token');
//     alert('You have been logged out.');
//     window.location.href = 'login.html';
// }
// // export function showNotification(message, type = 'info') {
// //     const notificationContainer = document.getElementById('notification-container');
// //     const notification = document.createElement('div');
// //     notification.className = `notification ${type}`;
// //     notification.textContent = message;
// //     notificationContainer.appendChild(notification);
// //     setTimeout(() => notification.remove(), 3000);
// // }
