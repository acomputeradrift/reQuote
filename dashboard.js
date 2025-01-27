import { getToken, showNotification, checkTokenExpiration, logout } from './common.js';
import { generateAmazonLink } from './utils/amazonLink.js';

// Ensure token is declared properly
const token = getToken(); 

// Element References (Avoid Re-declaration)
const authSection = document.getElementById('auth-section');
const addQuotesSection = document.getElementById('add-quotes-section');
const loginForm = document.getElementById('login-form');
const addQuoteForm = document.getElementById('add-quote-form');
const quotesList = document.getElementById('quotes-list');


let allQuotes = [];
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
        //await fetchSelectedQuotes();
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

// Updated loadQuotes function
export async function loadQuotes() {
    console.log("loadQuotes queried the backend from dashboard.js");
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

            // Store quotes globally
            allQuotes = quotes;

            // Separate selected and non-selected quotes
            //const selectedQuotes = quotes.filter(quote => quote.selected);
            const selectedQuotes = allQuotes.filter(q => q.selected);

            console.log('allQuotes:', allQuotes);
            const nonSelectedQuotes = allQuotes
            .filter(q => !q.selected)
            .sort((a, b) => a.position - b.position); // Sort by position

            console.log('nonSelectedQuotes:', nonSelectedQuotes);
            console.log('Positions of nonSelectedQuotes:', nonSelectedQuotes.map(q => q.position));


            //const nonSelectedQuotes = quotes.filter(quote => !quote.selected);

            // Sort each group by position
            selectedQuotes.sort((a, b) => a.position - b.position);
            nonSelectedQuotes.sort((a, b) => a.position - b.position);

            // Clear and render quotes
            quotesList.innerHTML = '';

            // Render selected quotes first
            selectedQuotes.forEach((quote) => {
                renderQuoteBox(quote);
            });

            // Render non-selected quotes below
            nonSelectedQuotes.forEach((quote) => {
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
        //console.log("Rendering quote with ID:", quote._id);

        const quoteBox = document.createElement('div');
        quoteBox.className = 'quote-box';
        quoteBox.id = `quote-${quote._id}`;
        //console.log("QuoteBox being re-rendered:", quoteBox);
    
        // Create the left button container for the reorder icon
        const leftButtonContainer = document.createElement('div');
        leftButtonContainer.className = 'leftButtonContainer';
    
        const reorderIcon = document.createElement('div');
        reorderIcon.className = 'reorder-icon';
        reorderIcon.title = 'Drag to reorder';
    
        for (let i = 0; i < 3; i++) {
            const line = document.createElement('div');
            reorderIcon.appendChild(line);
        }
    
        leftButtonContainer.appendChild(reorderIcon);
    
        // Create the content container for the quote text, author, and source
        const contentContainer = document.createElement('div');
        contentContainer.className = 'contentContainer';
    
        const content = document.createElement('p');
        content.textContent = quote.content;
        content.className = 'quote-content';
    
        const authorAndSource = document.createElement('p');
        authorAndSource.className = 'quote-author-source';
    
        const authorSpan = document.createElement('span');
        authorSpan.textContent = quote.author;
        authorSpan.className = 'quote-author-normal';
    
        const authorSourceSeparator = document.createElement('span');
        authorSourceSeparator.textContent = ', ';
        authorSourceSeparator.className = 'quote-author-normal';
    
        const sourceSpan = document.createElement('span');
        if (quote.sourceLink && quote.sourceLink.trim() !== '') {
            sourceSpan.innerHTML = `<a href="${quote.sourceLink}" target="_blank" rel="noopener noreferrer" style="color: #2196F3; text-decoration: none;">${quote.source}</a>`;
            sourceSpan.className = 'quote-source-italic';
            sourceSpan.title = 'Search for this book on Amazon';
        } else if (quote.source && quote.source.trim() !== '') {
            sourceSpan.textContent = quote.source;
            sourceSpan.className = 'quote-source-italic';
        } else {
            sourceSpan.textContent = '(unsourced)';
            sourceSpan.className = 'quote-source-italic';
        }
    
        authorAndSource.appendChild(authorSpan);
        if (quote.source && quote.source.trim() !== '') {
            authorAndSource.appendChild(authorSourceSeparator);
            authorAndSource.appendChild(sourceSpan);
        }
    
        contentContainer.appendChild(content);
        contentContainer.appendChild(authorAndSource);
    
        // Create the right button container for delete, edit, and email buttons
        const rightButtonContainer = document.createElement('div');
        rightButtonContainer.className = 'rightButtonContainer';
    
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '&#10006;';
        deleteButton.title = 'Delete this quote';
        deleteButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this quote?')) {
                await deleteQuote(quote._id);
                loadQuotes();
            }
        });
    
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.innerHTML = '&#9998;';
        editButton.title = 'Edit this quote';
        editButton.addEventListener('click', () => enableEditMode(quote));
    
        const emailButton = document.createElement('button');
        emailButton.className = 'email-button';
        emailButton.innerHTML = '&#9993;';
        emailButton.title = 'Add or remove this quote from your email schedule';
    
          // Apply the `selected` class based on the quote's state
          if (quote.selected) {
            emailButton.classList.add('selected');
        } else {
            emailButton.classList.remove('selected');
        }
        
        emailButton.addEventListener('click', async (event) => {
            const isCurrentlySelected = quote.selected;
        
            quote.selected = !isCurrentlySelected;
        
            console.log('Frontend sending to backend:', {
                id: quote._id,
                selected: quote.selected,
            });
        
            // Send updated selection state to the backend
            await updateQuoteSelectionInBackend(quote._id, quote.selected);
        
            // Reload the updated quotes from the backend
            await loadQuotes();
        
            event.stopPropagation();
        });
        
        rightButtonContainer.appendChild(deleteButton);
        rightButtonContainer.appendChild(editButton);
        rightButtonContainer.appendChild(emailButton);
    
        // Append all containers to the quoteBox
        quoteBox.appendChild(leftButtonContainer);
        quoteBox.appendChild(contentContainer);
        quoteBox.appendChild(rightButtonContainer);

        //console.log("Final re-rendered quoteBox content:", quoteBox.innerHTML);

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

async function updateQuoteSelectionInBackend(id, selected) {
    try {
        const response = await fetch(`/quotes/${id}/selection`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ selected }),
        });

        if (response.ok) {
            const updatedQuote = await response.json();
            console.log('Backend updated quote:', updatedQuote);
            const action = selected ? 'added to' : 'removed from';
            showNotification(`Quote ${action} the email list`, 'success');
        } else {
            const error = await response.json();
            if (error.message === 'You can select up to 21 quotes only.') {
                alert('You can only select up to 21 quotes. Please deselect a quote before selecting another.');
            } else {
                console.error('Failed to update quote:', error.message);
            }
        }
    } catch (error) {
        console.error('Error updating quote:', error);
    }
}

//Update backend after drag

async function saveOrderAndSelectionAfterDrag() {
    const newOrder = allQuotes.map((q, index) => ({
        id: q._id,
        position: index,
        selected: q.selected,
    }));

    console.log('Sending updated order to backend:', newOrder);

    try {
        const response = await fetch('/quotes/update-order-selection', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quotes: newOrder }),
        });

        const rawText = await response.text();
        console.log('Raw backend response:', rawText);

        if (response.ok) {
            const result = JSON.parse(rawText);
            console.log('Order and selection saved successfully:', result);
        } else {
            console.error('Error saving order and selection:', rawText);
        }
    } catch (error) {
        console.error('Error saving order and selection:', error);
    }
}


// async function saveOrderAndSelectionAfterDrag() {
//     try {
//         const updatedQuotes = allQuotes.map(quote => ({
//             _id: quote._id,
//             selected: quote.selected,
//             position: quote.position,
//         }));

//         const response = await fetch('/quotes/update-order-selection', {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ quotes: updatedQuotes }),
//         });

//         if (!response.ok) {
//             const errorData = await response.json();
//             console.error('Failed to update order and selection:', errorData.message);
//         }
//     } catch (error) {
//         console.error('Error saving order and selection:', error);
//     }
// }

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

    // Replace the inner content of the quoteBox with editable fields
    quoteBox.innerHTML = `
        <div class="contentContainer">
            <label for="edit-content-${quote._id}" class="edit-label">Quote</label>
            <textarea id="edit-content-${quote._id}" class="edit-field">${quote.content}</textarea>

            <label for="edit-author-${quote._id}" class="edit-label">Author</label>
            <input id="edit-author-${quote._id}" class="edit-field" value="${quote.author || ''}" />

            <label for="edit-source-${quote._id}" class="edit-label">Source</label>
            <input id="edit-source-${quote._id}" class="edit-field" value="${quote.source || ''}" />
        </div>

        <div class="button-container edit-mode">
            <button id="cancel-${quote._id}" class="cancel-button">Cancel</button>
            <button id="save-${quote._id}" class="save-button">Save</button>
        </div>
    `;

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
            showNotification('Quote edited successfully', 'success');
            loadQuotes(); // Reload the entire list after saving
        } else {
            console.error("Failed to save updated quote, response status:", response.status);
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
    console.log('Drag started on:', event.target); // Logs the element being dragged
    draggedItem = event.target.closest('.quote-box'); // Ensure the whole quoteBox is dragged
    if (draggedItem) {
        draggedItem.style.opacity = '0.5'; // Visual cue
        //console.log('Dragged item is:', draggedItem.id); // Confirm the correct box
    }
}


function handleDragOver(event) {
    event.preventDefault(); // Allow drop
    //console.log('Drag over target:', event.target.closest('.quote-box')?.id || 'none');
}

// Drag end (reset opacity)
function handleDragEnd() {
    if (draggedItem) {
        draggedItem.style.opacity = '1';
    }
}

// Updated handleDrop event

async function handleDrop(event) {
    event.preventDefault();

    const targetItem = event.target.closest('.quote-box');
    // console.log('Drop event triggered on:', targetItem?.id || 'none');
    // console.log('Dragged item:', draggedItem?.id || 'none');

    if (draggedItem && targetItem && draggedItem !== targetItem) {
        // Reorder visually
        quotesList.insertBefore(draggedItem, targetItem.nextSibling);
        //console.log('Dragged item moved to new position');

        // Save the new order to the backend
        await saveOrderAndSelectionAfterDrag();

        // Reload quotes to ensure order is updated
        await loadQuotes();
    }

    if (draggedItem) {
        draggedItem.style.opacity = '1'; // Reset opacity
        draggedItem = null;
    }
}




