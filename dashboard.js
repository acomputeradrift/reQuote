import { getToken, showNotification, checkTokenExpiration, logout } from './common.js';
import { generateAmazonLink } from './utils/amazonLink.js';
import { testEmailLimit } from './utils/testEmailLimit.js';

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
        //!! change this to loadQuotesFromDB();
        //!! this pulls right from the DB rather than refreshQuotes();
        //!! which will pull from the global array allQuotes
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

// Updated loadQuotes function
export async function loadQuotes() {
    console.log("Quotes requested from the database (loadQuotes).");
    try {
        const response = await fetch('/quotes', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const quotes = await response.json();
            console.log('Quotes received from the database (loadQuotes):', quotes.map(q => ({
                id: q._id,
                position: q.position,
                selected: q.selected
            })));
            // Store quotes globally
            allQuotes = quotes;
            console.log('Quotes passed to global allQuotes array (loadQuotes):', allQuotes.map(q => ({
                id: q._id,
                position: q.position,
                selected: q.selected
            })));
            //console.log('allQuotes:', allQuotes);
         
            // Clear and render quotes
            quotesList.innerHTML = '';
            console.log('Sending contents of allQuotes to renderQuoteBox (loadQuotes)')
            // Render quotes directly as returned by the backend
            allQuotes.forEach((quote) => {
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
        //console.log("Running renderQuoteBox.");

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
    
          // Apply the `selected` class based on the quote's state when rendered
          if (quote.selected) {
            emailButton.classList.add('selected');
        } else {
            emailButton.classList.remove('selected');
        }
        
        emailButton.addEventListener('click', async (event) => {

            //!! We will have to test the 21 limit on the front end
            //Toggle between the two states
            const isCurrentlySelected = quote.selected;
            //!!
            if (!isCurrentlySelected) {  // Only check the limit when selecting
                const result = await testEmailLimit(allQuotes); //!!send global allQuotes
                if (!result.approved) {
                    console.log(result.message);
                    return; // Stop selection if limit is reached
                }
            }
            //!!
            quote.selected = !isCurrentlySelected;

            //!! update the allQuotes here with quoteID and selection, this will only affect when the email
            allQuotes = allQuotes.map(q => 
                q._id === quote._id ? { ...q, selected: quote.selected } : q
            );
            //!! icon is clicked not when rendered otherwise
            
            console.log('Quote selection status modified:', {
                id: quote._id,
                selected: quote.selected,
            });
            
            //!! Push the whole array to the backend
            await updateQuoteOrderAndSelectionInBackend(allQuotes); 
            //!!

            // Send updated selection state to the backend
            //??
            //await updateQuoteSelectionInBackend(quote._id, quote.selected);
            //??
        
            // Reload the updated quotes from the backend
           // await loadQuotes();
        
            event.stopPropagation();
        });
        
        rightButtonContainer.appendChild(deleteButton);
        rightButtonContainer.appendChild(editButton);
        rightButtonContainer.appendChild(emailButton);
    
        // Append all containers to the quoteBox
        quoteBox.appendChild(leftButtonContainer);
        quoteBox.appendChild(contentContainer);
        quoteBox.appendChild(rightButtonContainer);
        quoteBox.setAttribute('draggable', true);

        // Allow dragging only when clicking the icon but move the whole box
        reorderIcon.setAttribute('draggable', true); 
        reorderIcon.addEventListener('dragstart', handleDragStart);
        reorderIcon.addEventListener('dragend', handleDragEnd);

        
        // Main drag events for the quote box
        quoteBox.addEventListener('dragover', handleDragOver);
        quoteBox.addEventListener('drop', handleDrop);

        // Add the quote box to the quotes list
        quotesList.appendChild(quoteBox); 
        //console.log('User quote successfully rendered.')       
}

//!!
async function updateQuoteOrderAndSelectionInBackend(updatedQuotes) {
    console.log("Sending quote changes to backend for sorting and saving.");

    try {
        const response = await fetch('/quotes/update-order-and-selection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,  // Ensure authentication if needed
            },
            body: JSON.stringify({ allQuotes: updatedQuotes }) // Send the passed quotes array
        });

        if (response.ok) {
            console.log("Quotes successfully sorted and saved in the database.");
            // Refresh quotes from the database to ensure accuracy
            await loadQuotes();
        } else {
            console.error("❌ Failed to update quotes in backend.");
            const errorData = await response.json();
            console.error("Server response:", errorData);
        }

    } catch (error) {
        console.error("❌ Error updating quote order and selection:", error);
    }
}

//This will not be used
// async function updateQuoteSelectionInBackend(id, selected) {
//     try {
//         const response = await fetch(`/quotes/${id}/selection`, {
//             method: 'PATCH',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ selected }),
//         });

//         if (response.ok) {
//             const updatedQuote = await response.json();
//             // console.log('Frontend received quote and selection status from backend (updateQuoteSelectionInBackend):', {
//             //     id: updatedQuote._id,
//             //     selected: updatedQuote.selected,
//             // });
//             console.log('Frontend received quote and selection status from backend (updateQuoteSelectionInBackend):', {
//                 id: updatedQuote.quote._id,
//                 selected: updatedQuote.quote.selected,
//             });

//             //console.log('Backend updated quote:', updatedQuote);
//             const action = selected ? 'added to' : 'removed from';
//             showNotification(`Quote ${action} the email list`, 'success');
//         } else {
//             const error = await response.json();
//             if (error.message === 'You can select up to 21 quotes only.') {
//                 alert('You can only select up to 21 quotes. Please deselect a quote before selecting another.');
//             } else {
//                 console.error('Failed to update quote:', error.message);
//             }
//         }
//     } catch (error) {
//         console.error('Error updating quote:', error);
//     }
// }

//Update backend after drag

// async function saveOrderAndSelectionAfterDrag() {
//     const newOrder = allQuotes.map((q, index) => ({
//         id: q._id,
//         position: index,
//         selected: q.selected,
//     }));

//     console.log('Sending updated order to backend:', newOrder);

//     try {
//         const response = await fetch('/quotes/update-order-selection', {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ quotes: newOrder }),
//         });

//         const rawText = await response.text();
//         console.log('Raw backend response:', rawText);

//         if (response.ok) {
//             const result = JSON.parse(rawText);
//             console.log('Order and selection saved successfully:', result);
//         } else {
//             console.error('Error saving order and selection:', rawText);
//         }
//     } catch (error) {
//         console.error('Error saving order and selection:', error);
//     }
// }

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

function handleDragStart(event) {
    console.log('HandleDragStart called.');
    draggedItem = event.target.closest('.quote-box'); // Ensure dragging applies to the full quote box

    if (!draggedItem) {
        console.error("🚨 handleDragStart: No valid quote-box found for dragging.");
        return;
    }

    console.log("✅ Dragging started on:", draggedItem.id);

    draggedItem.classList.add('dragging'); // Apply dragging style
    event.dataTransfer.setData('text/plain', draggedItem.id); // ✅ Required for Firefox
    event.dataTransfer.effectAllowed = 'move';

    setTimeout(() => {
        draggedItem.style.opacity = '0.5'; // Reduce opacity slightly for visual cue
    }, 0);
}

// function handleDragStart(event) {
//     console.log('HandleDragStart called.');
//     draggedItem = event.target.closest('.quote-box'); // Ensure dragging applies to the full quote box

//     if (!draggedItem) {
//         console.error("🚨 handleDragStart: No valid quote-box found for dragging.");
//         return;
//     }

//     console.log("✅ Dragging started on:", draggedItem.id);

//     draggedItem.classList.add('dragging'); // Apply dragging style
//     event.dataTransfer.effectAllowed = 'move';

//     setTimeout(() => {
//         draggedItem.style.opacity = '0.5'; // Reduce opacity slightly for visual cue
//     }, 0);
// }


function handleDragOver(event) {
    console.log('HandleDragOver called.');
    event.preventDefault(); // ✅ Required to allow dropping
    console.log("handleDragOver: Dragging over", event.target.closest('.quote-box')?.id || "null");

    event.dataTransfer.dropEffect = 'move'; // ✅ Required for Firefox

    const targetItem = event.target.closest('.quote-box');
    if (!targetItem || targetItem === draggedItem) return;

    // ✅ Adjust visual positioning smoothly
    const boundingRect = targetItem.getBoundingClientRect();
    const offset = event.clientY - boundingRect.top;

    if (offset > boundingRect.height / 2) {
        targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
    } else {
        targetItem.parentNode.insertBefore(draggedItem, targetItem);
    }
}

// function handleDragOver(event) {
//     console.log('HandleDragOver called.');
//     event.preventDefault(); // ✅ Allows dropping
//     const targetItem = event.target.closest('.quote-box');
//     if (!targetItem || targetItem === draggedItem) return;

//     // ✅ Adjust visual positioning smoothly
//     const boundingRect = targetItem.getBoundingClientRect();
//     const offset = event.clientY - boundingRect.top;

//     if (offset > boundingRect.height / 2) {
//         targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
//     } else {
//         targetItem.parentNode.insertBefore(draggedItem, targetItem);
//     }
// }

/* Updated, Cleaned-Up handleDrop with Correct Target Detection */
async function handleDrop(event) {
    console.log("HandleDrop called.");
    event.preventDefault();

    if (!draggedItem) {
        console.error("handleDrop: draggedItem is null. Ignoring drop event.");
        return;
    }
    console.log("HandleDrop: draggedItem exists:", draggedItem.id);

    // Traverse up the DOM to find the closest .quote-box
    // let targetItem = event.target;
    // while (targetItem && !targetItem.classList.contains('quote-box')) {
    //     targetItem = targetItem.parentElement;
    // }
    // Ensure targetItem is a valid .quote-box, stopping at the first one found
    // Ensure targetItem is a valid .quote-box and not the dragged item
    let targetItem = event.target;
    while (targetItem && (!targetItem.classList.contains('quote-box') || targetItem === draggedItem)) {
        console.log("handleDrop: Traversing up from", targetItem.id || targetItem.tagName);
        if (!targetItem.parentElement) break; // Stop if there's no more parent elements
        targetItem = targetItem.parentElement;
    }

    // Log final determined target
    console.log("handleDrop: Final drop target determined as:", targetItem ? targetItem.id : "null (invalid target)");

    if (!targetItem || draggedItem === targetItem) {
        console.error("handleDrop: No valid drop target found. Ignoring drop.");
        return;
    }
    console.log("HandleDrop: Dropping", draggedItem.id, "onto", targetItem.id);

    const draggedQuoteId = draggedItem.id.replace('quote-', '');
    const targetQuoteId = targetItem.id.replace('quote-', '');
    const draggedIndex = allQuotes.findIndex(q => q._id === draggedQuoteId);
    const targetIndex = allQuotes.findIndex(q => q._id === targetQuoteId);

    if (draggedIndex === -1 || targetIndex === -1) {
        console.error("handleDrop: Could not find dragged or target quote in allQuotes.");
        return;
    }
    console.log("HandleDrop: Found indexes", draggedIndex, targetIndex);

    console.log("HandleDrop: allQuotes BEFORE update:", allQuotes);

    const [draggedQuote] = allQuotes.splice(draggedIndex, 1);
    allQuotes.splice(targetIndex, 0, draggedQuote);

    console.log("HandleDrop: allQuotes AFTER update:", allQuotes);

    allQuotes.forEach((quote, index) => {
        quote.position = index;
    });

    draggedItem.classList.remove('dragging');
    draggedItem.style.opacity = '1';
    draggedItem = null;
    console.log("HandleDrop: draggedItem reset.");
}

async function handleDragEnd(event) {
    console.log('HandleDragEnd called.');

    if (!draggedItem) return;

    // Ensure dragged item is visible again
    draggedItem.style.opacity = '1';
    draggedItem.classList.remove('dragging');

    console.log('HandleDragEnd: Sending updated quote order to backend.');

    // ✅ Send updated order and selection state to backend
    await updateQuoteOrderAndSelectionInBackend(allQuotes);

    // Now reset draggedItem
    draggedItem = null;
    console.log('HandleDragEnd: draggedItem reset.');
}





