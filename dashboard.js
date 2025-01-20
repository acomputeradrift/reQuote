import { getToken, showNotification, logout, selectedQuotes } from './common.js';

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

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Dashboard loaded");
    await fetchSelectedQuotes();
    await loadQuotes();
});


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
            //quotes.forEach(renderQuoteBox);
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
        console.log("renderQuoteBox ran in dashboard.js");
        const amazonLinkHTML = generateAmazonLink(quote.author, quote.source);
        const quoteBox = document.createElement('div'); // Create a container for the quote
        quoteBox.className = 'quote-box'; // Add a class for styling
        quoteBox.dataset.id = quote._id; // Store the quote ID for reference

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
            sourceSpan.innerHTML = `, ${amazonLinkHTML}`;
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

            // Create email icon
        const emailIcon = document.createElement('div');
        emailIcon.className = 'email-icon'; // Add a class for styling
        emailIcon.innerHTML = '&#9992;'; // Airplane icon

        // Toggle selection logic
        if (selectedQuotes.includes(quote._id)) {
        emailIcon.classList.add('selected');
        }

        emailIcon.addEventListener('click', async (event) => {
            const index = selectedQuotes.indexOf(quote._id);
    
            if (index > -1) {
                // Unselect the quote
                selectedQuotes.splice(index, 1);
                emailIcon.classList.remove('selected');
            } else if (selectedQuotes.length < 21) {
                // Select the quote
                selectedQuotes.push(quote._id);
                emailIcon.classList.add('selected');
            } else {
                alert('You can select up to 21 quotes only.');
            }
    
            console.log("Updated selectedQuotes:", selectedQuotes);
    
            // Send updated selections to the backend
            await updateSelectedQuotesInBackend();
            event.stopPropagation();
        });
    

        // Append content, author, and delete button to the box
        quoteBox.appendChild(content);
        quoteBox.appendChild(authorAndSource);
        quoteBox.appendChild(deleteButton);
        quoteBox.appendChild(reorderIcon);
        quoteBox.appendChild(emailIcon);

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

// // Check if the user is an admin and show the button
// export function showAdminFeatures(userEmail) {
//     //console.log('Checking admin features for email:', userEmail); // Debug log
//     if (userEmail === 'feeny.jamie@gmail.com') { // Replace with your admin email
//     document.getElementById('generate-test-quotes').style.display = 'block';
//     }
// }

// // Generate test quotes
// document.getElementById('generate-test-quotes').addEventListener('click', async () => {
//     if (!confirm('Are you sure you want to generate 30 test quotes?')) return;

//     try {
//     const response = await fetch('/quotes/generate', {
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//         },
//     });

//     if (response.ok) {
//         alert('30 test quotes generated successfully!');
//         loadQuotes(); // Reload the quotes list
//     } else {
//         const data = await response.json();
//         alert(`Failed to generate test quotes: ${data.message}`);
//     }
//     } catch (error) {
//     console.error('Error generating test quotes:', error);
//     alert('Failed to generate test quotes.');
//     }
// });

//Drag-and-Drop Handlers

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

//updated 
function generateAmazonLink(author, source) {
    if (!author || !source) {
        console.warn('Author or source missing for Amazon link generation.');
        return ''; // Return empty if either is missing
    }

    // Encode the search terms for the URL
    const query = encodeURIComponent(`${author} ${source}`);
    const amazonURL = `https://www.amazon.com/s?k=${query}&tag=YOUR_AFFILIATE_TAG`;

    // Return a properly formatted and clickable link as HTML

    return `<a href="${amazonURL}" target="_blank" rel="noopener noreferrer" style="color: #2196F3; text-decoration: none;">${source}</a>`;

    // return `<a href="${amazonURL}" target="_blank" rel="noopener noreferrer"
    //          style="color: white; background-color: #FF9900; padding: 10px 15px; border-radius: 5px; text-decoration: none; font-weight: bold;">
    //          Buy on Amazon
    //         </a>`;
}


// // ✅ Generate Test Quotes Button (Safe Handling)
// if (generateTestQuotesButton) {
//     generateTestQuotesButton.addEventListener('click', async () => {
//         if (confirm('Generate 30 test quotes?')) {
//             try {
//                 const response = await fetch('/quotes/generate', {
//                     method: 'POST',
//                     headers: {
//                         'Authorization': `Bearer ${token}`,
//                         'Content-Type': 'application/json',
//                     },
//                 });

//                 if (response.ok) {
//                     showNotification('Test quotes generated successfully!', 'success');
//                     loadQuotes();
//                 } else {
//                     alert('Failed to generate test quotes.');
//                 }
//             } catch (error) {
//                 console.error('Error generating quotes:', error);
//             }
//         }
//     });
// }



// import { getToken, showNotification, logout } from './common.js';

// const authSection = document.getElementById('auth-section');
// const addQuotesSection = document.getElementById('add-quotes-section');
// const loginForm = document.getElementById('login-form');
// const addQuoteForm = document.getElementById('add-quote-form');
// const quotesList = document.getElementById('quotes-list');

// let selectedQuotes = []; // Persistent array to track selected quotes
// let draggedItem = null;

// //---------------------------- Quotes 

// //Create and Save Origin Quotes
// addQuoteForm.addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const content = document.getElementById('quote-content').value;
//     const author = document.getElementById('quote-author').value;
//     const source = document.getElementById('quote-source').value;
    
//     try {
//     const response = await fetch('/quotes', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`, // Include the token
//         },
//         body: JSON.stringify({ content, author, source }),
//     });

//     if (response.ok) {
//         showNotification('Quote added successfully', 'success');
//         addQuoteForm.reset(); // Clear the form
//         loadQuotes(); // Reload the quotes list to show the new quote
//     } else {
//         const data = await response.json();
//         alert(`Failed to add quote: ${data.message}`);
//     }
//     } catch (error) {
//     console.error('Error adding quote (frontend):', error);
//     alert('Failed to add quote (frontend).');
//     }
// });

// //Load and Sort Quotes by User
// export async function loadQuotes() {
//     try {
//     const response = await fetch('/quotes', {
//         method: 'GET',
//         headers: {
//             'Authorization': `Bearer ${token}`,
//         },
//     });

//     if (response.ok) {
//         const quotes = await response.json();
//         // Sort quotes by the order attribute before rendering
//         quotes.sort((a, b) => a.order - b.order);
//         //console.log('Quotes retrieved from backend:', quotes);
//         quotesList.innerHTML = ''; // Clear the list before updating

//         quotes.forEach((quote) => {
//             renderQuoteBox(quote);
//         });

//     } else {
//         const data = await response.json();
//         alert(`Failed to load quotes: ${data.message}`);
//     }
//     } catch (error) {
//     console.error('Error loading quotes (frontend):', error);
//     alert('Failed to load quotes (frontend).');
//     }
// }

// //Render Each Quote Box
// function renderQuoteBox(quote) {
//         const amazonLinkHTML = generateAmazonLink(quote.author, quote.source);
//         const quoteBox = document.createElement('div'); // Create a container for the quote
//         quoteBox.className = 'quote-box'; // Add a class for styling
//         // quoteBox.setAttribute('draggable', true); // Make the box draggable
//         quoteBox.dataset.id = quote._id; // Store the quote ID for reference

//         // Reapply the selected class if the quote is in the selectedQuotes array
//         if (selectedQuotes.includes(quote._id)) {
//             quoteBox.classList.add('selected');
//         }

//     // Handle click to toggle selection
//         quoteBox.addEventListener('click', async (event) => {
//             if (selectedQuotes.includes(quote._id)) {
//                 // Unselect the quote
//                 selectedQuotes = selectedQuotes.filter((id) => id !== quote._id);
//                 quoteBox.classList.remove('selected'); // Remove selected style
//             } else if (selectedQuotes.length < 21) {
//                 // Select the quote
//                 selectedQuotes.push(quote._id);
//                 quoteBox.classList.add('selected'); // Add selected style
//             } else {
//                 alert('You can select up to 21 quotes only.');
//             }
//             // Send the updated selection to the backend
//             await updateSelectedQuotesInBackend();
//             event.stopPropagation(); // Prevent event bubbling
//         });

//         // Drag-and-Drop Events
//         // quoteBox.addEventListener('dragstart', handleDragStart);
//         // quoteBox.addEventListener('dragover', handleDragOver);
//         // quoteBox.addEventListener('drop', handleDrop);

//         // Add the quote content
//         const content = document.createElement('p');
//         content.textContent = quote.content;
//         content.className = 'quote-content'; // Add a class for styling

//         // Combined Author and Source (Same Line)
//         const authorAndSource = document.createElement('p');
//         authorAndSource.className = 'quote-author-source';
        
//         // Separate spans for styling
//         const authorSpan = document.createElement('span');
//         authorSpan.textContent = quote.author;
//         authorSpan.className = 'quote-author-normal';

//         const sourceSpan = document.createElement('span');
//         if (quote.source && quote.source.trim() !== '') {
//             sourceSpan.innerHTML = `, ${amazonLinkHTML}`;
//             // sourceSpan.textContent = `, ${quote.source}`;
//             sourceSpan.className = 'quote-source-italic';
//         }

//         // Append both spans inside the same element
//         authorAndSource.appendChild(authorSpan);
//         if (quote.source && quote.source.trim() !== '') {
//             authorAndSource.appendChild(sourceSpan);
//         }

//         // Create the reordering icon
//         const reorderIcon = document.createElement('div');
//         reorderIcon.className = 'reorder-icon'; // Add a class for styling

//         // Add the three lines to the reorder icon
//         for (let i = 0; i < 3; i++) {
//             const line = document.createElement('div');
//             reorderIcon.appendChild(line);
//         }

//         // Create a delete button
//         const deleteButton = document.createElement('button');
//         deleteButton.textContent = 'X'; // Set the text as "X"
//         deleteButton.className = 'delete-button'; // Add a class for styling
//         deleteButton.addEventListener('click', async () => {
//             if (confirm('Are you sure you want to delete this quote?')) {
//                 await deleteQuote(quote._id); // Call the delete function
//                 loadQuotes(); // Refresh the quotes list
//             }
//         });

//         // Append content, author, and delete button to the box
//         quoteBox.appendChild(content);
//         quoteBox.appendChild(authorAndSource);
//         quoteBox.appendChild(deleteButton);
//         quoteBox.appendChild(reorderIcon);

//         // Allow dragging only when clicking the icon but move the whole box
//         reorderIcon.setAttribute('draggable', true); 
//         reorderIcon.addEventListener('dragstart', handleDragStart);
//         reorderIcon.addEventListener('dragend', handleDragEnd);

//         // Main drag events for the quote box
//         quoteBox.addEventListener('dragover', handleDragOver);
//         quoteBox.addEventListener('drop', handleDrop);

//         // Add the quote box to the quotes list
//         quotesList.appendChild(quoteBox);
// }

// //Fetch Selected Quotes from Backend
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
//         selectedQuotes = data.selectedQuotes || []; // Set selectedQuotes globally
//     } else {
//         console.error('Failed to fetch selected quotes.');
//     }
//     } catch (error) {
//     console.error('Error fetching selected quotes:', error);
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

// //Drag-and-Drop Handlers

// // Corrected dragStart handler for dragging the entire quoteBox only when clicking the reorderIcon
// function handleDragStart(event) {
//     // Ensure the drag starts ONLY when clicking the reorder icon
//     if (!event.target.classList.contains('reorder-icon')) {
//         event.preventDefault(); // Prevent dragging if not the reorder icon
//         return;
//     }

//     // Move the entire quoteBox when dragging
//     draggedItem = event.target.closest('.quote-box'); 
//     event.dataTransfer.effectAllowed = 'move';
//     draggedItem.style.opacity = '0.5'; // Visual feedback
// }

// function handleDragOver(event) {
//     event.preventDefault(); // Allow dropping
//     event.dataTransfer.dropEffect = 'move';
// }

// // Drag end (reset opacity)
// function handleDragEnd() {
//     if (draggedItem) {
//         draggedItem.style.opacity = '1';
//     }
// }

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

// //updated 
// function generateAmazonLink(author, source) {
//     if (!author || !source) {
//         console.warn('Author or source missing for Amazon link generation.');
//         return ''; // Return empty if either is missing
//     }

//     // Encode the search terms for the URL
//     const query = encodeURIComponent(`${author} ${source}`);
//     const amazonURL = `https://www.amazon.com/s?k=${query}&tag=YOUR_AFFILIATE_TAG`;

//     // Return a properly formatted and clickable link as HTML

//     return `<a href="${amazonURL}" target="_blank" rel="noopener noreferrer" style="color: #2196F3; text-decoration: none;">${source}</a>`;

//     // return `<a href="${amazonURL}" target="_blank" rel="noopener noreferrer"
//     //          style="color: white; background-color: #FF9900; padding: 10px 15px; border-radius: 5px; text-decoration: none; font-weight: bold;">
//     //          Buy on Amazon
//     //         </a>`;
// }

// //-------------------------Notification Alerts

// // //Show Notification
// // export function showNotification(message, type = 'info') {
// //     const container = document.getElementById('notification-container');

// //     // Create a notification element
// //     const notification = document.createElement('div');
// //     notification.className = `notification ${type}`;
// //     notification.textContent = message;

// //     // Append it to the container
// //     container.appendChild(notification);

// //     // Show the notification
// //     setTimeout(() => {
// //         notification.classList.add('show');
// //     }, 10);

// //     // Remove the notification after 5 seconds
// //     setTimeout(() => {
// //         notification.classList.remove('show');
// //         setTimeout(() => notification.remove(), 300); // Wait for fade-out transition
// //         }, 5000);
// // }

// //------------------------Quote Management

// //Save Quote Order
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

// //Delete Quote
// async function deleteQuote(quoteId) {
//     //console.log('Attempting DELETE for:', `/quotes/${quoteId}`);
//     try {
//     const response = await fetch(`/quotes/${quoteId}`, {
//         method: 'DELETE',
//         headers: {
//             'Authorization': `Bearer ${token}`,
//         },
//     });

//     if (response.ok) {
//         // alert('Quote deleted successfully');
//         showNotification('Quote deleted successfully', 'success');
//         loadQuotes();
//     } else {
//         const data = await response.json();
//         alert(`Failed to delete quote: ${data.message}`);
//     }
//     } catch (error) {
//     console.error('Error deleting quote:', error);
//     alert('Failed to delete quote (frontend).');
//     }
// }

// // Check if the user is an admin and show the button
// export function showAdminFeatures(userEmail) {
//     //console.log('Checking admin features for email:', userEmail); // Debug log
//     if (userEmail === 'feeny.jamie@gmail.com') { // Replace with your admin email
//     document.getElementById('generate-test-quotes').style.display = 'block';
//     }
// }

// // Generate test quotes
// document.getElementById('generate-test-quotes').addEventListener('click', async () => {
//     if (!confirm('Are you sure you want to generate 30 test quotes?')) return;

//     try {
//     const response = await fetch('/quotes/generate', {
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//         },
//     });

//     if (response.ok) {
//         alert('30 test quotes generated successfully!');
//         loadQuotes(); // Reload the quotes list
//     } else {
//         const data = await response.json();
//         alert(`Failed to generate test quotes: ${data.message}`);
//     }
//     } catch (error) {
//     console.error('Error generating test quotes:', error);
//     alert('Failed to generate test quotes.');
//     }
// });
