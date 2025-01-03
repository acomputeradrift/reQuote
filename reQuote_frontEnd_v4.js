const authSection = document.getElementById('auth-section');
const quotesSection = document.getElementById('quotes-section');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const addQuoteForm = document.getElementById('add-quote-form');
const quotesList = document.getElementById('quotes-list');

let email = null; // Declare a global email variable
let token = null;
let selectedQuotes = []; // Persistent array to track selected quotes
let draggedItem = null;

//------------------------SignUp and SignIn

// Updated Signup Logic
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            alert('Sign-up successful! Please log in.');
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

// Updated Login Logic
loginForm.addEventListener('submit', async (e) => {
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
            const data = await response.json();
            token = data.token;
            showNotification(`Welcome ${data.email}!`, 'success');

            authSection.style.display = 'none';
            quotesSection.style.display = 'block';
            showAdminFeatures(data.email); // Show admin-only features
            fetchSelectedQuotes(); // Fetch selected quotes from the backend
            loadQuotes();
        } else {
            const data = await response.json();
            alert(`Login failed: ${data.message}`);
        }
    } catch (error) {
        console.error("Error during login:", error);
        alert('Login failed.');
    }
});

//---------------------------- Quotes 

//Create and Save Origin Quotes
addQuoteForm.addEventListener('submit', async (e) => {
e.preventDefault();

const content = document.getElementById('quote-content').value;
const author = document.getElementById('quote-author').value;
const source = document.getElementById('quote-source').value;

try {
const response = await fetch('/quotes', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Include the token
    },
    body: JSON.stringify({ content, author, source }),
});

if (response.ok) {
    showNotification('Quote added successfully', 'success');
    addQuoteForm.reset(); // Clear the form
    loadQuotes(); // Reload the quotes list to show the new quote
} else {
    const data = await response.json();
    alert(`Failed to add quote: ${data.message}`);
}
} catch (error) {
console.error('Error adding quote (frontend):', error);
alert('Failed to add quote (frontend).');
}
});

//Load Quotes by User
async function loadQuotes() {
try {
const response = await fetch('/quotes', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
    },
});

if (response.ok) {
    const quotes = await response.json();
    // Sort quotes by the order attribute before rendering
    quotes.sort((a, b) => a.order - b.order);
    //console.log('Quotes retrieved from backend:', quotes);
    quotesList.innerHTML = ''; // Clear the list before updating

    quotes.forEach((quote) => {
        const quoteBox = document.createElement('div'); // Create a container for the quote
        quoteBox.className = 'quote-box'; // Add a class for styling
        quoteBox.setAttribute('draggable', true); // Make the box draggable
        quoteBox.dataset.id = quote._id; // Store the quote ID for reference

        // Reapply the selected class if the quote is in the selectedQuotes array
        if (selectedQuotes.includes(quote._id)) {
            quoteBox.classList.add('selected');
        }

     // Handle click to toggle selection
        quoteBox.addEventListener('click', async (event) => {
            if (selectedQuotes.includes(quote._id)) {
                // Unselect the quote
                selectedQuotes = selectedQuotes.filter((id) => id !== quote._id);
                quoteBox.classList.remove('selected'); // Remove selected style
            } else if (selectedQuotes.length < 21) {
                // Select the quote
                selectedQuotes.push(quote._id);
                quoteBox.classList.add('selected'); // Add selected style
            } else {
                alert('You can select up to 21 quotes only.');
            }
            // Send the updated selection to the backend
            await updateSelectedQuotesInBackend();
            event.stopPropagation(); // Prevent event bubbling
        });

        // Drag-and-Drop Events
        quoteBox.addEventListener('dragstart', handleDragStart);
        quoteBox.addEventListener('dragover', handleDragOver);
        quoteBox.addEventListener('drop', handleDrop);

        // Add the quote content
        const content = document.createElement('p');
        content.textContent = quote.content;
        content.className = 'quote-content'; // Add a class for styling

         // Combined Author and Source (Same Line)
        const authorAndSource = document.createElement('p');
        authorAndSource.className = 'quote-author-source';
        
        // Separate spans for styling
        const authorSpan = document.createElement('span');
        authorSpan.textContent = quote.author;
        authorSpan.className = 'quote-author-normal';

        const sourceSpan = document.createElement('span');
        if (quote.source && quote.source.trim() !== '') {
            sourceSpan.textContent = `, ${quote.source}`;
            sourceSpan.className = 'quote-source-italic';
        }

        // Append both spans inside the same element
        authorAndSource.appendChild(authorSpan);
        if (quote.source && quote.source.trim() !== '') {
            authorAndSource.appendChild(sourceSpan);
        }

        // Create the reordering icon
        const reorderIcon = document.createElement('div');
        reorderIcon.className = 'reorder-icon'; // Add a class for styling

        // Add the three lines to the reorder icon
        for (let i = 0; i < 3; i++) {
            const line = document.createElement('div');
            reorderIcon.appendChild(line);
        }

        // Create a delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'X'; // Set the text as "X"
        deleteButton.className = 'delete-button'; // Add a class for styling
        deleteButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this quote?')) {
                await deleteQuote(quote._id); // Call the delete function
                loadQuotes(); // Refresh the quotes list
            }
        });

        // Append content, author, and delete button to the box
        quoteBox.appendChild(content);
        quoteBox.appendChild(authorAndSource);
        quoteBox.appendChild(deleteButton);
        quoteBox.appendChild(reorderIcon);

        // Add the quote box to the quotes list
        quotesList.appendChild(quoteBox);
    });

} else {
    const data = await response.json();
    alert(`Failed to load quotes: ${data.message}`);
}
} catch (error) {
console.error('Error loading quotes (frontend):', error);
alert('Failed to load quotes (frontend).');
}
}

//Fetch Selected Quotes from Backend
async function fetchSelectedQuotes() {
try {
const response = await fetch('/quotes/selected', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
    },
});

if (response.ok) {
    const data = await response.json();
    selectedQuotes = data.selectedQuotes || []; // Set selectedQuotes globally
} else {
    console.error('Failed to fetch selected quotes.');
}
} catch (error) {
console.error('Error fetching selected quotes:', error);
}
}

//Send Selected Quotes to Backend
async function updateSelectedQuotesInBackend() {
try {
const response = await fetch('/quotes/selected', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ selectedQuotes }),
});
if (response.ok) {
    showNotification('Email list updated', 'success');
} else {
    const data = await response.json();
    console.error('Failed to update selected quotes:', data.message);
}
} catch (error) {
console.error('Error updating selected quotes:', error);
}
}

//Drag-and-Drop Handlers
function handleDragStart(event) {
draggedItem = event.target.closest('.quote-box'); // Store the dragged element
event.dataTransfer.effectAllowed = 'move';
event.target.style.opacity = '0.5'; // Visual feedback
}

function handleDragOver(event) {
event.preventDefault(); // Allow dropping
event.dataTransfer.dropEffect = 'move';
}

async function handleDrop(event) {
event.preventDefault();
const targetItem = event.target.closest('.quote-box'); // Get the drop target
if (draggedItem && targetItem && draggedItem !== targetItem) {
// Reorder visually
quotesList.insertBefore(draggedItem, targetItem.nextSibling);

// Save the new order to the database
await saveOrder();

// Refresh the selectedQuotes array based on the new order
// updateSelectedQuotes();

// Reload the quotes to reflect changes and keep selections intact
await loadQuotes();
}
draggedItem.style.opacity = '1'; // Reset the dragged item's opacity
draggedItem = null;
}

//-------------------------Notification Alerts

//Show Notification
function showNotification(message, type = 'info') {
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
setTimeout(() => notification.remove(), 300); // Wait for fade-out transition
}, 5000);
}

//------------------------Quote Management

//Save Quote Order
async function saveOrder() {
try {
    const newOrder = Array.from(quotesList.children).map((li, index) => ({
        id: li.dataset.id, // Quote ID from the DOM
        order: index, // New order based on position
    }));

    //console.log('Saving order to backend:', newOrder); // Debug log

    const response = await fetch('/quotes/reorder', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOrder), // Send the updated order
    });

    if (!response.ok) {
        const data = await response.json();
        alert(`Failed to save order: ${data.message}`);
    } else {
        console.log('Order saved successfully');
    }
} catch (error) {
console.error('Error saving order (frontend):', error);
alert('Failed to save order (frontend).');
}
}

//Delete Quote
async function deleteQuote(quoteId) {
//console.log('Attempting DELETE for:', `/quotes/${quoteId}`);
try {
const response = await fetch(`/quotes/${quoteId}`, {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}`,
    },
});

if (response.ok) {
    // alert('Quote deleted successfully');
    showNotification('Quote deleted successfully', 'success');
    loadQuotes();
} else {
    const data = await response.json();
    alert(`Failed to delete quote: ${data.message}`);
}
} catch (error) {
console.error('Error deleting quote:', error);
alert('Failed to delete quote (frontend).');
}
}

// Check if the user is an admin and show the button
function showAdminFeatures(userEmail) {
//console.log('Checking admin features for email:', userEmail); // Debug log
if (userEmail === 'feeny.jamie@gmail.com') { // Replace with your admin email
document.getElementById('generate-test-quotes').style.display = 'block';
}
}

// Generate test quotes
document.getElementById('generate-test-quotes').addEventListener('click', async () => {
if (!confirm('Are you sure you want to generate 30 test quotes?')) return;

try {
const response = await fetch('/quotes/generate', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
});

if (response.ok) {
    alert('30 test quotes generated successfully!');
    loadQuotes(); // Reload the quotes list
} else {
    const data = await response.json();
    alert(`Failed to generate test quotes: ${data.message}`);
}
} catch (error) {
console.error('Error generating test quotes:', error);
alert('Failed to generate test quotes.');
}
});
