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


// export async function loadQuotes() {
//     console.log("loadQuotes queried the backend from dashboard.js)");
//     try {
//         const response = await fetch('/quotes', {
//             method: 'GET',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//             },
//         });

//         if (response.ok) {
//             console.log("loadQuotes got an OK response from backend");
//             const quotes = await response.json();
//             quotes.sort((a, b) => a.order - b.order); 
//             quotesList.innerHTML = '';
//             quotes.forEach((quote) => {
//                             renderQuoteBox(quote);
//                         });
//         } else {
//             console.log("loadQuotes DID NOT get an OK response from backend");
//             console.error('Failed to load quotes');
//         }
//     } catch (error) {
//         console.log("loadQuotes failed completely");
//         console.error('Error loading quotes:', error);
//     }
// }

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
        

        // emailButton.addEventListener('click', async (event) => {
        //     const isCurrentlySelected = quote.selected;
        
        //     if (isCurrentlySelected) {
        //         const nonSelectedQuotes = allQuotes.filter(q => !q.selected);
        //         console.log('Quote being deselected:', quote);
        //         console.log('Non-selected group positions before update:', nonSelectedQuotes.map(q => q.position));

        //         // Deselect the quote
        //         quote.selected = false;
        //         emailButton.classList.remove('selected');
        //         //console.log('Class removed:', emailButton.classList); // Check current classes
        //           // Log `allQuotes` to verify its state
        //         console.log('allQuotes before calculating position:', allQuotes);
        
        //         // Assign the highest position in the non-selected group
        //         //const nonSelectedQuotes = allQuotes.filter(q => !q.selected);
        //         console.log('nonSelectedQuotes:', nonSelectedQuotes);
        //         quote.position = nonSelectedQuotes.length > 0
        //             ? Math.max(...nonSelectedQuotes.map(q => q.position)) + 1
        //             : 0;
        //         console.log('New position for deselected quote:', quote.position);
              
        //     } else if (allQuotes.filter(q => q.selected).length < 21) {
        //         const selectedQuotes = allQuotes.filter(q => q.selected);
        //         console.log('selectedQuotes before updating:', selectedQuotes);

        //         // Select the quote
        //         quote.selected = true;
        //         emailButton.classList.add('selected');
        //         //console.log('Class added:', emailButton.classList); // Check current classes
        
        //         // Assign the highest position in the selected group
        //         //const selectedQuotes = allQuotes.filter(q => q.selected);
        //         console.log('Selected Quotes Count:', selectedQuotes.length);
        //         console.log('Selected Quotes:', selectedQuotes);
        //         quote.position = selectedQuotes.length > 0
        //             ? Math.max(...selectedQuotes.map(q => q.position)) + 1
        //             : 0;
        //     } else {
        //         alert('You can select up to 21 quotes only.');
        //     }
            
        //     console.log('Frontend sent:', {
        //         id: quote._id,
        //         selected: quote.selected,
        //         position: quote.position
        //     });
        
        //     // Save the updated selection and position to the backend
        //     await updateQuoteSelectionInBackend(quote._id, quote.selected, quote.position);
        
        //     // Refresh the quotes list to reflect changes
        //     await loadQuotes();
        
        //     event.stopPropagation();
        // });
        
        // emailButton.addEventListener('click', async (event) => {
        //     const isCurrentlySelected = quote.selected;
        
        //     if (isCurrentlySelected) {
        //         // Deselect the quote
        //         quote.selected = false;
        
        //         // Assign the highest position in the non-selected group
        //         const nonSelectedQuotes = allQuotes.filter(q => !q.selected);
        //         quote.position = nonSelectedQuotes.length > 0
        //             ? Math.max(...nonSelectedQuotes.map(q => q.position)) + 1
        //             : 0;
        
        //         emailButton.classList.remove('selected');
        //     } else if (selectedQuotes.length < 21) {
        //         // Select the quote
        //         quote.selected = true;
        //         emailButton.classList.add('selected');
        //     } else {
        //         alert('You can select up to 21 quotes only.');
        //     }
            
        //     console.log('Frontend sent:', {
        //         id: quote._id,
        //         selected: quote.selected,
        //         position: quote.position
        //     });
            
        //     // Save the updated selection and position to the backend
        //     await updateQuoteSelectionInBackend(quote._id, quote.selected, quote.position);
        
        //     // Refresh the quotes list to reflect changes
        //     await loadQuotes();
        
        //     event.stopPropagation();
        // });
        

        // emailButton.addEventListener('click', async (event) => {
        //     const isCurrentlySelected = quote.selected;
        
        //     if (isCurrentlySelected) {
        //         // Deselect the quote
        //         quote.selected = false;
        
        //         // Assign it the highest position in the non-selected group
        //         const nonSelectedQuotes = allQuotes.filter(q => !q.selected);
        //         quote.position = nonSelectedQuotes.length > 0
        //             ? Math.max(...nonSelectedQuotes.map(q => q.position)) + 1
        //             : 0;
        
        //         emailButton.classList.remove('selected');
        //     } else if (selectedQuotes.length < 21) {
        //         // Select the quote
        //         quote.selected = true;
        //         emailButton.classList.add('selected');
        //     } else {
        //         alert('You can select up to 21 quotes only.');
        //     }
        
        //     // Save the updated selection and position to the backend
        //     await saveOrderAndSelection();
        
        //     // Refresh the quotes list to reflect changes
        //     await loadQuotes();
        
        //     event.stopPropagation();
        // });
        
    
        // emailButton.addEventListener('click', async (event) => {
        //     if (quote.selected) {
        //         quote.selected = false;
        //         emailButton.classList.remove('selected');
        //     } else if (selectedQuotes.length < 21) {
        //         quote.selected = true;
        //         emailButton.classList.add('selected');
        //     } else {
        //         alert('You can select up to 21 quotes only.');
        //     }
        
        //     await updateQuoteSelectionInBackend(quote._id, quote.selected);
        //     event.stopPropagation();
        // });
        
        // emailButton.addEventListener('click', async (event) => {
        //     const index = selectedQuotes.indexOf(quote._id);
    
        //     if (index > -1) {
        //         selectedQuotes.splice(index, 1);
        //         emailButton.classList.remove('selected');
        //     } else if (selectedQuotes.length < 21) {
        //         selectedQuotes.push(quote._id);
        //         emailButton.classList.add('selected');
        //     } else {
        //         alert('You can select up to 21 quotes only.');
        //     }
    
        //     //console.log("Updated selectedQuotes:", selectedQuotes);
    
        //     await updateSelectedQuotesInBackend();
        //     event.stopPropagation();
        // });
    
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

//Fetch Selected Quotes from Backend
// export async function fetchSelectedQuotes() {
//     try {
//     const response = await fetch('/quotes/selected', {
//         method: 'GET',
//         headers: {
//             'Authorization': `Bearer ${token}`,
//         },
//     });

//     if (response.ok) {
//         const data = await response.json();
//         selectedQuotes.length = 0;  // Clear the existing array
//         selectedQuotes.push(...data.selectedQuotes);  // Push new values
//         // selectedQuotes = data.selectedQuotes || []; // Set selectedQuotes globally
//     } else {
//         console.error('Failed to fetch selected quotes.');
//     }
//     } catch (error) {
//     console.error('Error fetching selected quotes:', error);
//     }
// }

// Update the selection status of a single quote in the backend
// async function updateQuoteSelectionInBackend(quoteId, isSelected) {
//     try {
//         const response = await fetch(`/quotes/${quoteId}/selection`, {
//             method: 'PATCH',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ selected: isSelected }),
//         });

//         if (response.ok) {
//             showNotification('Quote selection updated', 'success');
//         } else {
//             const data = await response.json();
//             console.error('Failed to update quote selection:', data.message);
//         }
//     } catch (error) {
//         console.error('Error updating quote selection:', error);
//     }
// }

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


// async function updateQuoteSelectionInBackend(quoteId, isSelected, position) {
//     try {
//         const response = await fetch(`/quotes/${quoteId}/selection`, {
//             method: 'PATCH',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ selected: isSelected, position }),
//         });

//         if (!response.ok) {
//             const errorData = await response.json();
//             console.error('Failed to update quote selection:', errorData.message);
//         }
//     } catch (error) {
//         console.error('Error updating quote selection:', error);
//     }
// }



// //Send Selected Quotes to Backend
// async function updateSelectedQuotesInBackend() {
//     try {
//     const response = await fetch('/quotes/selected', {
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ selectedQuotes }),
//     });
//     if (response.ok) {
//         showNotification('Email list updated', 'success');
//     } else {
//         const data = await response.json();
//         console.error('Failed to update selected quotes:', data.message);
//     }
//     } catch (error) {
//     console.error('Error updating selected quotes:', error);
//     }
// }

//Save Quote Order

// Save the new order and selection status to the backend
// async function saveOrderAndSelection() {
//     try {
//         // Prepare the data to send to the backend
//         const updatedQuotes = allQuotes.map(quote => ({
//             _id: quote._id,
//             selected: quote.selected,
//             position: quote.position
//         }));

//         const response = await fetch('/quotes/update-order-selection', {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ quotes: updatedQuotes }),
//         });

//         if (response.ok) {
//             console.log('Order and selection status updated successfully.');
//         } else {
//             const errorData = await response.json();
//             console.error('Failed to update order and selection:', errorData.message);
//         }
//     } catch (error) {
//         console.error('Error saving order and selection:', error);
//     }
// }

async function saveOrderAndSelection() {
    try {
        const updatedQuotes = allQuotes.map(quote => ({
            _id: quote._id,
            selected: quote.selected,
            position: quote.position,
        }));

        const response = await fetch('/quotes/update-order-selection', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quotes: updatedQuotes }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to update order and selection:', errorData.message);
        }
    } catch (error) {
        console.error('Error saving order and selection:', error);
    }
}

// async function saveOrder() {
//     try {
//         const newOrder = Array.from(quotesList.children).map((li, index) => ({
//             id: li.dataset.id, // Quote ID from the DOM
//             order: index, // New order based on position
//         }));

//         //console.log('Saving order to backend:', newOrder); // Debug log

//         const response = await fetch('/quotes/reorder', {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(newOrder), // Send the updated order
//         });

//         if (!response.ok) {
//             const data = await response.json();
//             alert(`Failed to save order: ${data.message}`);
//         } else {
//             console.log('Order saved successfully');
//         }
//     } catch (error) {
//     console.error('Error saving order (frontend):', error);
//     alert('Failed to save order (frontend).');
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

// Updated handleDrop event
async function handleDrop(event) {
    event.preventDefault();

    const targetItem = event.target.closest('.quote-box'); // Get the drop target

    if (draggedItem && targetItem && draggedItem !== targetItem) {
        const draggedQuoteId = draggedItem.id.replace('quote-', '');
        const targetQuoteId = targetItem.id.replace('quote-', '');

        // Determine the dragged and target quote objects
        const draggedQuote = allQuotes.find(quote => quote._id === draggedQuoteId);
        const targetQuote = allQuotes.find(quote => quote._id === targetQuoteId);

        if (!draggedQuote || !targetQuote) {
            console.error("Dragged or target quote not found.");
            return;
        }

        // Determine if the dragged quote is moving to the selected or non-selected group
        const isDraggedToSelected = targetQuote.selected;

        // Handle group transitions (non-selected -> selected or vice versa)
        if (draggedQuote.selected !== isDraggedToSelected) {
            if (isDraggedToSelected) {
                // Moving to the selected group
                const selectedQuotesCount = allQuotes.filter(quote => quote.selected).length;
                if (selectedQuotesCount >= 21) {
                    alert("You can only select up to 21 quotes.");
                    return;
                }
                draggedQuote.selected = true;
            } else {
                // Moving to the non-selected group
                draggedQuote.selected = false;
            }
        }

        // Reorder quotes within the group based on the drop target
        const targetIndex = allQuotes.findIndex(quote => quote._id === targetQuoteId);
        const draggedIndex = allQuotes.findIndex(quote => quote._id === draggedQuoteId);

        // Remove dragged item from its current position
        allQuotes.splice(draggedIndex, 1);

        // Insert dragged item into the new position
        allQuotes.splice(targetIndex, 0, draggedQuote);

        // Update positions for all quotes in both groups
        allQuotes.forEach((quote, index) => {
            quote.position = index;
        });

        // Save the new order and selection status to the backend
        await saveOrderAndSelection();

        // Reload the quotes to reflect changes and keep selections intact
        await loadQuotes();
    }

    // Reset dragged item's opacity and clear reference
    draggedItem.style.opacity = '1';
    draggedItem = null;
}


// async function handleDrop(event) {
//     event.preventDefault();
//     const targetItem = event.target.closest('.quote-box'); // Get the drop target
//     if (draggedItem && targetItem && draggedItem !== targetItem) {
//     // Reorder visually
//     quotesList.insertBefore(draggedItem, targetItem.nextSibling);

//     // Save the new order to the database
//     await saveOrder();

//     // Refresh the selectedQuotes array based on the new order
//     // updateSelectedQuotes();

//     // Reload the quotes to reflect changes and keep selections intact
//     await loadQuotes();
//     }
//     draggedItem.style.opacity = '1'; // Reset the dragged item's opacity
//     draggedItem = null;
// }


