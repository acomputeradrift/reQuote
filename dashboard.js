import { getToken, showNotification, checkTokenExpiration, logout, selectedQuotes } from './common.js';
import { generateAmazonLink } from './utils/amazonLink.js';

// Ensure token is declared properly
const token = getToken(); 

// Element References (Avoid Re-declaration)
const authSection = document.getElementById('auth-section');
const addQuotesSection = document.getElementById('add-quotes-section');
const loginForm = document.getElementById('login-form');
const addQuoteForm = document.getElementById('add-quote-form');
const quotesList = document.getElementById('quotes-list');
const generateTestQuotesButton = document.getElementById('generate-test-quotes');

let draggedItem = null;

//----------------------------------Event Listeners

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Dashboard loaded");

    // Check for token
    const token = getToken();
    if (!token) {
        alert('You need to log in first!');
        window.location.href = 'login.html';
        return; // Stop further execution if not logged in
    }

    // Check if the token has expired
    checkTokenExpiration();

    // Fetch selected quotes and load quotes
    try {
        await fetchSelectedQuotes();
        await loadQuotes();
    } catch (error) {
        console.error("Error during dashboard initialization:", error);
        alert("Failed to load quotes. Please try again.");
    }
});

// Add an event listener for the logout button
document.getElementById('logout-button').addEventListener('click', () => {
    logout(); // Call the shared logout function
})

//--------------------------------------------Quote Management

// ✅ Check if the form exists before adding an event listener
if (addQuoteForm) {
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
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ content, author, source }),
            });

            if (response.ok) {
                showNotification('Quote added successfully', 'success');
                addQuoteForm.reset();
                await loadQuotes(); 
            } else {
                const data = await response.json();
                alert(`Failed to add quote: ${data.message}`);
            }
        } catch (error) {
            console.error('Error adding quote:', error);
            alert('Failed to add quote.');
        }
    });
}

// ✅ Safe Loading Quotes Function
export async function loadQuotes() {
    console.log("loadQuotes ran (dashboard.js)");
    try {
        const response = await fetch('/quotes', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            console.log("loadQuotes got an OK response from backend");
            const quotes = await response.json();
            quotes.sort((a, b) => a.order - b.order); 
            quotesList.innerHTML = '';
            quotes.forEach((quote) => {
                            renderQuoteBox(quote);
                        });
        } else {
            console.log("loadQuotes DID NOT get an OK response from backend");
            console.error('Failed to load quotes');
        }
    } catch (error) {
        console.log("loadQuotes failed completely");
        console.error('Error loading quotes:', error);
    }
}

//Render Each Quote Box
function renderQuoteBox(quote) {
    if (!quote || !quote.content || !quote.author) {
        console.error("Invalid or incomplete quote data:", quote);
        return; // Prevent rendering
    }
        console.log("renderQuoteBox ran in dashboard.js");
        console.log("Rendering quote with ID:", quote._id);
        //const amazonLinkHTML = generateAmazonLink(quote.author, quote.source);
        const quoteBox = document.createElement('div'); // Create a container for the quote
        quoteBox.className = 'quote-box'; // Add a class for styling
        quoteBox.id = `quote-${quote._id}`; // Assign a unique ID for reference
        
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

        // Create a span for the separator
        const authorSourceSeparator = document.createElement('span');
        authorSourceSeparator.textContent = ', ';
        authorSourceSeparator.className = 'quote-author-normal'; // Use the same styling as the author

        //NEW FOR LINK
        const sourceSpan = document.createElement('span');
        if (quote.sourceLink && quote.sourceLink.trim() !== '') {
            // New functionality: Create clickable link for sourceLink
            sourceSpan.innerHTML = `<a href="${quote.sourceLink}" target="_blank" rel="noopener noreferrer" style="color: #2196F3; text-decoration: none;">${quote.source}</a>`;
            sourceSpan.className = 'quote-source-italic';
            sourceSpan.title = 'Search for this book on Amazon'
        } else if (quote.source && quote.source.trim() !== '') {
            sourceSpan.textContent = quote.source; // Fallback to plain text if no link
            sourceSpan.className = 'quote-source-italic';
        } else {
            sourceSpan.textContent = '(unsourced)';
            sourceSpan.className = 'quote-source-italic';
        }

        // Append both spans inside the same element
        authorAndSource.appendChild(authorSpan);
        if (quote.source && quote.source.trim() !== '') {
            authorAndSource.appendChild(authorSourceSeparator);
            authorAndSource.appendChild(sourceSpan);
        }

        // Create the reordering icon
        const reorderIcon = document.createElement('div');
        reorderIcon.className = 'reorder-icon'; // Add a class for styling
        reorderIcon.title = 'Drag to reorder'; // Hover message

        // Add the three lines to the reorder icon
        for (let i = 0; i < 3; i++) {
            const line = document.createElement('div');
            reorderIcon.appendChild(line);
        }

        // Create a delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button'; // Add a class for styling
        deleteButton.innerHTML = '&#10006;';
        deleteButton.title = 'Delete this quote'; // Hover message
        deleteButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this quote?')) {
                await deleteQuote(quote._id); // Call the delete function
                loadQuotes(); // Refresh the quotes list
            }
        });

        // Create the edit button (orange color, placed between delete and email icon)
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.innerHTML = '&#9998;';
        //editButton.innerHTML = '<span style="color: black; font-weight: bold;">&#9998;</span>'; // Unicode pencil icon
        editButton.title = 'Edit this quote'; // Hover message
        editButton.addEventListener('click', () => enableEditMode(quote));

            // Create email icon
        const emailButton = document.createElement('div');
        emailButton.className = 'email-button'; // Add a class for styling
        emailButton.innerHTML = '&#9993;'; // Email icon
        emailButton.title = 'Add or remove this quote from your email schedule'; // Hover message

        //----Toggle selection logic
        if (selectedQuotes.includes(quote._id)) {
        emailButton.classList.add('selected');
        }

        emailButton.addEventListener('click', async (event) => {
            const index = selectedQuotes.indexOf(quote._id);
    
            if (index > -1) {
                // Unselect the quote
                selectedQuotes.splice(index, 1);
                emailButton.classList.remove('selected');
            } else if (selectedQuotes.length < 21) {
                // Select the quote
                selectedQuotes.push(quote._id);
                emailButton.classList.add('selected');
            } else {
                alert('You can select up to 21 quotes only.');
            }
    
            console.log("Updated selectedQuotes:", selectedQuotes);
    
            // Send updated selections to the backend
            await updateSelectedQuotesInBackend();
            event.stopPropagation();
        });
        
        const buttonContainer = document.createElement('div');
        
        buttonContainer.className = 'buttonContainer';

        buttonContainer.appendChild(deleteButton);
        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(emailButton);

        // Append content, author, and delete button to the box
        quoteBox.appendChild(content);
        quoteBox.appendChild(authorAndSource);
        quoteBox.appendChild(reorderIcon);
        quoteBox.appendChild(buttonContainer);

        // Allow dragging only when clicking the icon but move the whole box
        reorderIcon.setAttribute('draggable', true); 
        reorderIcon.addEventListener('dragstart', handleDragStart);
        reorderIcon.addEventListener('dragend', handleDragEnd);

        // Main drag events for the quote box
        quoteBox.addEventListener('dragover', handleDragOver);
        quoteBox.addEventListener('drop', handleDrop);

        // Add the quote box to the quotes list
        quotesList.appendChild(quoteBox);
}

//Fetch Selected Quotes from Backend
export async function fetchSelectedQuotes() {
    try {
    const response = await fetch('/quotes/selected', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (response.ok) {
        const data = await response.json();
        selectedQuotes.length = 0;  // Clear the existing array
        selectedQuotes.push(...data.selectedQuotes);  // Push new values
        // selectedQuotes = data.selectedQuotes || []; // Set selectedQuotes globally
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

//updated edit mode

function enableEditMode(quote) {
    try {
        const quoteBox = document.getElementById(`quote-${quote._id}`);
        if (!quoteBox) {
            console.error(`Quote box with ID quote-${quote._id} not found.`);
            return;
        }
//updated editable fields

        quoteBox.classList.add('edit-mode'); // Add the "edit-mode" class
        quoteBox.innerHTML = `
            <textarea id="edit-content-${quote._id}" class="edit-field">${quote.content}</textarea>
            <input id="edit-author-${quote._id}" class="edit-field" value="${quote.author || ''}" />
            <input id="edit-source-${quote._id}" class="edit-field" value="${quote.source || ''}" />
            <button id="save-${quote._id}" class="save-button">Save</button>
            <button id="cancel-${quote._id}" class="cancel-button">Cancel</button>
        `;


        // Render editable fields inside the quote box
        // quoteBox.innerHTML = `
        //     <textarea id="edit-content-${quote._id}" class="edit-field">${quote.content}</textarea>
        //     <input id="edit-author-${quote._id}" class="edit-field" value="${quote.author || ''}" />
        //     <input id="edit-source-${quote._id}" class="edit-field" value="${quote.source || ''}" />
        //     <button id="save-${quote._id}" class="save-button">Save</button>
        //     <button id="cancel-${quote._id}" class="cancel-button">Cancel</button>
        // `;

        // Add event listeners for save and cancel buttons
        document.getElementById(`save-${quote._id}`).addEventListener('click', () => saveQuote(quote));
        document.getElementById(`cancel-${quote._id}`).addEventListener('click', () => cancelEdit(quote));
    } catch (error) {
        console.error(`Error enabling edit mode for quote ID ${quote._id}:`, error);
    }
}

//v14 save quote afer editing

async function saveQuote(quote) {
    const content = document.getElementById(`edit-content-${quote._id}`).value.trim();
    const author = document.getElementById(`edit-author-${quote._id}`).value.trim();
    const source = document.getElementById(`edit-source-${quote._id}`).value.trim();

    if (!content || !author) {
        alert('Content and author are required.');
        return;
    }
    // Include the order field in the update
    const updateData = {
        content,
        author,
        source,
        order: quote.order, // Retain the order field
    };
    try {
        const response = await fetch(`/quotes/${quote._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });

        if (response.ok) {
            const updatedQuote = await response.json();
            showNotification('Quote edited successfully', 'success');
            // Replace the existing quote in the DOM

            if (updatedQuote && updatedQuote.content && updatedQuote.author) {
                const quoteBox = document.getElementById(`quote-${quote._id}`);
                if (quoteBox) {
                    quoteBox.innerHTML = ''; // Clear and re-render
                    renderQuoteBox(updatedQuote);
                }
            } else {
                console.error("Received incomplete updated quote:", updatedQuote);
            }
            


            // const quoteBox = document.getElementById(`quote-${quote._id}`);
            // if (quoteBox) {
            //     quoteBox.innerHTML = ''; // Clear the current content
            //     renderQuoteBox(updatedQuote); // Re-render in place with updated data
            // }
        } else {
            throw new Error('Failed to save quote.');
        }
    } catch (error) {
        console.error(`Error saving quote with ID ${quote._id}:`, error);
        alert('Failed to save quote.');
    }
}

function cancelEdit(quote) {
    location.reload(); // Reload page to cancel edits
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

//---------------------------------------Drag-and-Drop Handlers

// Corrected dragStart handler for dragging the entire quoteBox only when clicking the reorderIcon
function handleDragStart(event) {
    // Ensure the drag starts ONLY when clicking the reorder icon
    if (!event.target.classList.contains('reorder-icon')) {
        event.preventDefault(); // Prevent dragging if not the reorder icon
        return;
    }

    // Move the entire quoteBox when dragging
    draggedItem = event.target.closest('.quote-box'); 
    event.dataTransfer.effectAllowed = 'move';
    draggedItem.style.opacity = '0.5'; // Visual feedback
}

function handleDragOver(event) {
    event.preventDefault(); // Allow dropping
    event.dataTransfer.dropEffect = 'move';
}

// Drag end (reset opacity)
function handleDragEnd() {
    if (draggedItem) {
        draggedItem.style.opacity = '1';
    }
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


