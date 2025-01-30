// reQuote_v4.js
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();


import { generateAmazonLink } from './utils/amazonLink.js';
import { truncateQuoteContent } from './utils/truncateQuoteContent.js';
import { reorderUserQuotes } from './utils/sortingAlgorithm.js';
import { updateUserSchedule } from './utils/updateUserSchedule.js';
import { Quote } from '/var/www/reQuote/models/Quote.js';
import { User } from '/var/www/reQuote/models/User.js';


import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

// Load environment variables
// dotenv.config();

const PORT = process.env.PORT || 3000;

// Initialize constants or configurations
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// MongoDB Connection
(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB running reQuote_v4');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
})();
 
//------------------------------------------------------ Initialize the Express app
const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});


// Middleware
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    //console.log('User authenticated with token:', token);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

//---------------------------------------------------------------- Routes

//Sign Up
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters long, include an uppercase letter, and a number',
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'Sign-up successful. Please confirm your email.' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        res.status(500).json({ message: 'Error signing up', error });
    }
});

//Login (logged...)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: 'Invalid email or password' });

        // Include email in the token payload
        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Send token and email back to the frontend
        console.log(`${user.email} logged in`);
        res.status(200).json({ message: 'Login successful', token, email: user.email });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error logging in', error });
    }
});

//logout route (logged...)
app.post('/logout', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(400).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                console.log(`${decoded.email} auto-logged out for expired token`);
                return res.status(200).json({ message: 'Token expired, but logout successful' });
            }
            console.error('Invalid token during logout:', err.message);
            return res.status(401).json({ message: 'Invalid token' });
        }

        console.log(`${decoded.email} logged out manually`);
        res.status(200).json({ message: 'Logout successful' });
    });
});

// Updated Add Quote Endpoint

app.post('/quotes', authenticate, async (req, res) => { 
    const { content, author, source } = req.body;

    if (!content || !author) {
        return res.status(400).json({ message: 'Content and author are required' });
    }

    try {
        // Generate the Amazon link (if source is provided)
        const sourceLink = source ? generateAmazonLink(author, source) : null;

        // Fetch the user's existing quotes
        const userQuotes = await Quote.find({ user: req.userId });

        // Calculate the next available position for the user's non-selected quotes
        //const nextPosition = userQuotes.filter(q => !q.selected).length;
        const nextPosition = userQuotes.length > 0
        ? Math.max(...userQuotes.map(q => q.position || 0)) + 1
        : 0;

        // Create a new quote
        const quote = new Quote({
            content,
            author,
            source,
            sourceLink, // Save the generated Amazon link
            position: nextPosition, // Assign position in non-selected group
            selected: false, // Default to non-selected
            user: req.userId, // Associate the quote with the logged-in user
        });

        await quote.save();
        //console.log('New Quote object saved');

        // Add the quote to the user's quotes field
        const user = await User.findById(req.userId);
        if (user) {
            user.quotes.push(quote._id);
            await user.save();
            console.log('New Quote object added to user');
        }

        res.status(201).json({ message: 'Quote added successfully', quote });
    } catch (error) {
        console.error('Error adding quote (backend):', error);
        res.status(500).json({ message: 'Failed to add quote (backend)' });
    }
});

//Get Quotes by User
app.get('/quotes', authenticate, async (req, res) => {
    try {
        const quotes = await Quote.find({ user: req.userId }).sort({ position: 1 });
        res.status(200).json(quotes);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving quotes (backend)', error });
    }
});

//Reorder Quotes
// app.post('/quotes/reorder', authenticate, async (req, res) => {
//     const updates = req.body; // Array of { id, order }
//     //console.log('Reorder updates received:', updates);

//     try {
//         for (const { id, order } of updates) {
//             //console.log(`Updating quote ID ${id} to order ${order}`);
//             await Quote.findByIdAndUpdate(id, { order });
//         }
//         res.status(200).json({ message: 'Order updated successfully' });
//     } catch (error) {
//         console.error('Error updating order (backend):', error);
//         res.status(500).json({ message: 'Failed to update order (backend)' });
//     }
// });

//Edit quote (logged...)

app.put('/quotes/:id', async (req, res) => {
    //console.log('Attempt to edit quote hit the backend');
    try {
        const { id } = req.params; // Extract the quote ID from the URL parameters
        const { content, author, source } = req.body; // Extract updated fields from the request body

        // Validate required fields
        if (!content || !author) {
            return res.status(400).json({ error: 'Content and author are required.' });
        }

        // Generate the sourceLink every time based on the new source (or handle cases where there is no source)
        let sourceLink = null;
        if (source) {
            sourceLink = generateAmazonLink(author, source);
        } else {
            console.log('No source provided, skipping sourceLink generation.');
        }

        // Prepare the update object
        const updateData = {
            content,
            author,
            source: source || null, // Explicitly handle the case where source is not provided
            sourceLink, // Include the newly generated sourceLink or null
        };

        // Update the quote in the database
        const updatedQuote = await Quote.findByIdAndUpdate(
            id, // The quote ID
            updateData, // The fields to update
            { new: true } // Options: Return the updated document
        ).populate('user'); // Populate the user field

        if (!updatedQuote) {
            return res.status(404).json({ error: 'Quote not found.' });
        }
        console.log(`${updatedQuote.user.email} edited and saved quote ${updatedQuote._id} successfully`);
        //console.log("Updated quote:", updatedQuote); // Log the updated quote
        // Send the updated quote as the response 
        res.status(200).json(updatedQuote);
    } catch (error) {
        console.error('Error updating quote:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//Delete Quote By User (logged...)
app.delete('/quotes/:id', authenticate, async (req, res) => {
    const quoteId = req.params.id;
    try {
        // Step 1: Delete the quote
        const deletedQuote = await Quote.findOneAndDelete({ _id: quoteId, user: req.userId });
        if (!deletedQuote) {
            return res.status(404).json({ message: 'Quote not found or not authorized to delete.' });
        }
        console.log('Quote object deleted');
        // Step 2: Remove the quote from the user's quotes
        const user = await User.findById(req.userId);
        if (user) {
            user.quotes = user.quotes.filter((id) => id.toString() !== quoteId);
            await user.save();
            console.log('Quote deleted from user.quotes:', user.selectedQuotes);
        }

        // Step 2: Remove the quote from the user's selectedQuotes
        if (user) {
            user.selectedQuotes = user.selectedQuotes.filter((id) => id.toString() !== quoteId);
            await user.save();
            console.log('Quote deleted from user.selectedQuotes:', user.selectedQuotes);
        }

        // Step 3: Remove the quote from the schedule's selectedQuotes
        const schedule = await Schedule.findOne({ user: req.userId });
        if (schedule) {
            schedule.selectedQuotes = schedule.selectedQuotes.filter((id) => id.toString() !== quoteId);
            await schedule.save();
            console.log('Quote deleted from schedule.selectedQuotes:', schedule.selectedQuotes);
        }

        res.status(200).json({ message: 'Quote deleted successfully.' });
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ message: 'Failed to delete quote.' });
    }
});

app.patch('/quotes/:id/selection', authenticate, async (req, res) => {

//---------------------------3 queries to the database 
// --------(find the Quote / get current state, count selected Quotes, get updated state)

    const { id } = req.params;
    const { selected } = req.body; // this is simply a true/false

    if (typeof selected !== 'boolean') {
        return res.status(400).json({ message: 'Invalid selection value. Must be true or false.' });
    }

    try {
        console.log('----QUOTE SELECTION MODIFICATION SENT FROM THE FRONTEND----')
        // Step 1: Find the quote by ID in the database and ensure it belongs to the authenticated user
        const currentQuote = await Quote.findOne({ _id: id, user: req.userId }).populate('user', 'email');
        if (!currentQuote) {
            return res.status(404).json({ message: 'Quote not found' });
        }
        console.log(`In the database, quote ${currentQuote._id} has a current selected state of ${currentQuote.selected}.`);

        // Step 2: If selecting, test the 21-quote limit
        if (selected) {
            console.log('Request received to change quote selection state to true.')
            const selectedQuotesCount = await Quote.countDocuments({ user: req.userId, selected: true });
            console.log(`This user currently has ${selectedQuotesCount} selected quotes.`);
            if (selectedQuotesCount >= 21) {
                console.log('NOT Approved.');
                return res.status(400).json({ message: 'You can only select up to 21 quotes.' });
            }
             else {
                console.log('Approved.')
            }
        } else {
            console.log('Changing quote selection state to false.')
        }
        // Step 3: Update the quote's `selected` field
        currentQuote.selected = selected;
    
        // Save the updated quote to the database
        await currentQuote.save();
        //console.log(`Updated quote selection saved to the database.`);
        const updatedQuote = await Quote.findOne({ _id: id, user: req.userId }).populate('user', 'email');
        if (!updatedQuote) {
            return res.status(404).json({ message: 'Quote not found' });
        }
        console.log(`In the database, quote ${updatedQuote._id} now has an updated selection state of ${updatedQuote.selected}`);
        //Log it
        const truncatedContent = truncateQuoteContent(currentQuote.content);
        console.log(
            `${currentQuote.user.email} has successfully ${currentQuote.selected ? 'selected' : 'deselected'} the quote "${truncatedContent}" for scheduled email.`
        );
        // Call the updateUserSchedule function
        await updateUserSchedule(updatedQuote.user._id, updatedQuote.user.email,  updatedQuote.selected, updatedQuote._id);
        // Reorder the database
        await reorderUserQuotes(updatedQuote.user._id);

        // Respond to the client
        res.status(200).json({ 
            message: 'Quote selection updated successfully.', 
            quote: { 
                _id: updatedQuote._id, 
                selected: updatedQuote.selected 
            } 
        });
        
        //res.status(200).json({ message: 'Quote selection updated successfully.', quote });

    } catch (error) {
        console.error('Error updating quote selection:', error);
        res.status(500).json({ message: 'Failed to update quote selection.' });
    }
});


// app.patch('/quotes/:id/selection', authenticate, async (req, res) => {
//     const { id } = req.params;
//     const { selected } = req.body; //this is simply a true/false

//     if (typeof selected !== 'boolean') {
//         return res.status(400).json({ message: 'Invalid selection value. Must be true or false.' });
//     }

//     try {
//         // Step 1: Find the quote by ID in the database and ensure it belongs to the authenticated user
//         const quote = await Quote.findOne({ _id: id, user: req.userId }).populate('user', 'email', 'content');
//         if (!quote) {
//             return res.status(404).json({ message: 'Quote not found' });
//         }
//         console.log(`Quote found: ${quote._id}, Current Selected State: ${quote.selected}`);

//         if (quote.selected) {
//             console.log('Quote is being selected, testing 21 quote limit');
//             // Get the current number of selected quotes
//             const oldSelectedQuotesCount = await Quote.countDocuments({ user: req.userId, selected: true });
//             console.log(`Currently selected quotes count: ${oldSelectedQuotesCount}`);
//              // Add the one I am about trying to select
//              const newSelectedQuotesCount = oldSelectedQuotesCount + 1;
//             // Test to see if adding 1 to the count would hit 22
//             if (newSelectedQuotesCount >= 21) {
//                 return res.status(400).json({ message: 'You can only select up to 21 quotes.' });
//             }
//         }

//         // Step 2: Update the quote we just pulled from the database to the value passed from updateQuoteSelectionInBackend
//         quote.selected = selected;
//         const truncatedContent = truncateQuoteContent(quote.content);
//         console.log(
//             `${quote.user.email} ${quote.selected ? 'selected' : 'deselected'} the quote "${truncatedContent}" for scheduled email.`
//         );
//         //once we have updated the quote object, save it to the database.
//         await quote.save();
//         // Log the action
//         console.log(`Quote and updated selection saved to database`);

//     } catch (error) {
//         console.error('Error updating quote selection:', error);
//         res.status(500).json({ message: 'Failed to update quote selection.' });
//     }
// });


// app.patch('/quotes/:id/selection', authenticate, async (req, res) => {
//     const { id } = req.params;
//     const { selected } = req.body;

//     if (typeof selected !== 'boolean') {
//         return res.status(400).json({ message: 'Invalid selection value. Must be true or false.' });
//     }

//     try {
//         // Step 1: Find the quote by ID and ensure it belongs to the authenticated user
//         const quote = await Quote.findOne({ _id: id, user: req.userId }).populate('user', 'email');
//         if (!quote) {
//             return res.status(404).json({ message: 'Quote not found' });
//         }
//         console.log(`Quote found: ${quote._id}, Current Selected State: ${quote.selected}`);

//         // Step 2: Update the selected field for the quote
//         quote.selected = selected;

//         if (selected) {
//             console.log('Quote is being selected.');

//             // Ensure the 21-quote limit is not exceeded
//             const selectedQuotesCount = await Quote.countDocuments({ user: req.userId, selected: true });
//             console.log(`Currently selected quotes count: ${selectedQuotesCount}`);
//             if (selectedQuotesCount >= 21) {
//                 return res.status(400).json({ message: 'You can only select up to 21 quotes.' });
//             }

//             // Assign the quote to the bottom of the selected group
//             const selectedQuotes = await Quote.find({ user: req.userId, selected: true }).sort({ position: 1 });
//             console.log('Selected quotes before assigning position:', selectedQuotes.map(q => ({
//                 id: q._id,
//                 position: q.position
//             })));

//             quote.position = selectedQuotes.length > 0
//                 ? Math.max(...selectedQuotes.map(q => q.position)) + 1
//                 : 0;

//             console.log(`Assigned position to selected quote: ${quote.position}`);
//         } else {
//             console.log('Quote is being deselected.');

//             // Assign the quote to the top of the unselected group
//             const unselectedQuotes = await Quote.find({ user: req.userId, selected: false }).sort({ position: 1 });
//             console.log('Unselected quotes before position adjustment:', unselectedQuotes.map(q => ({
//                 id: q._id,
//                 position: q.position
//             })));

//             quote.position = 0;

//             // Shift positions of all other unselected quotes
//             for (const q of unselectedQuotes) {
//                 q.position += 1;
//                 await q.save();
//                 console.log(`Shifted position of quote ID: ${q._id} to ${q.position}`);
//             }
//         }

//         await quote.save();
//         console.log(`Quote ${quote._id} saved with position: ${quote.position}`);

//         // Reorder all quotes
//         const allQuotes = await Quote.find({ user: req.userId });
//         const reorderedQuotes = reorderQuotes(allQuotes);

//         // Save updated positions to the database
//         for (const q of reorderedQuotes) {
//             await Quote.findByIdAndUpdate(q._id, { position: q.position });
//         }

//         const updatedQuotes = await Quote.find({ user: req.userId }).sort({ position: 1 });
//         console.log('Database state after reordering:', updatedQuotes.map(q => ({
//             id: q._id,
//             position: q.position,
//             selected: q.selected,
//         })));

//         // Log the action
//         const truncatedContent = truncateQuoteContent(quote.content);
//         console.log(
//             `${quote.user.email} ${quote.selected ? 'selected' : 'deselected'} the quote "${truncatedContent}" for scheduled email.`
//         );

//         //------------------------------------------------- Step 3: Update the schedule
//         let schedule = await Schedule.findOne({ user: req.userId });
//         if (!schedule) {
//             schedule = new Schedule({ user: req.userId, selectedQuotes: [] });
//         }

//         if (selected) {
//             schedule.selectedQuotes.push(quote._id);
//         } else {
//             schedule.selectedQuotes


// Update the selection status of a single quote

// app.patch('/quotes/:id/selection', authenticate, async (req, res) => {
//     const { id } = req.params;
//     const { selected } = req.body;

//     if (typeof selected !== 'boolean') {
//         return res.status(400).json({ message: 'Invalid selection value. Must be true or false.' });
//     }

//     try {
//         // Step 1: Find the quote by ID and ensure it belongs to the authenticated user
//         const quote = await Quote.findOne({ _id: id, user: req.userId }).populate('user', 'email');
//         if (!quote) {
//             return res.status(404).json({ message: 'Quote not found' });
//         }

//         // Step 2: Update the selected field for the quote
//         quote.selected = selected;

//         if (selected) {
//             // Ensure the 21-quote limit is not exceeded
//             const selectedQuotesCount = await Quote.countDocuments({ user: req.userId, selected: true });
//             if (selectedQuotesCount >= 21) {
//                 return res.status(400).json({ message: 'You can only select up to 21 quotes.' });
//             }

//             // Assign the quote to the bottom of the selected group
//             const selectedQuotes = await Quote.find({ user: req.userId, selected: true }).sort({ position: 1 });
//             quote.position = selectedQuotes.length > 0
//                 ? Math.max(...selectedQuotes.map(q => q.position)) + 1
//                 : 0;

//         } else {
//             // Assign the quote to the top of the unselected group
//             const unselectedQuotes = await Quote.find({ user: req.userId, selected: false }).sort({ position: 1 });
//             quote.position = 0;

//             // Shift positions of all other unselected quotes
//             for (const q of unselectedQuotes) {
//                 q.position += 1;
//                 await q.save();
//             }
//         }

//         await quote.save();

//         // Log the action
//         const truncatedContent = truncateQuoteContent(quote.content);
//         console.log(
//             `${quote.user.email} ${quote.selected ? 'selected' : 'deselected'} the quote "${truncatedContent}" for scheduled email.`
//         );

//         //------------------------------------------------- Step 3: Update the schedule
//         let schedule = await Schedule.findOne({ user: req.userId });
//         if (!schedule) {
//             schedule = new Schedule({ user: req.userId, selectedQuotes: [] });
//         }

//         if (selected) {
//             schedule.selectedQuotes.push(quote._id);
//         } else {
//             schedule.selectedQuotes = schedule.selectedQuotes.filter((qid) => qid.toString() !== quote._id.toString());
//         }

//         schedule.selectedQuotes = schedule.selectedQuotes.slice(0, 21); // Ensure it doesn't exceed 21
//         await schedule.save();

//         console.log(
//             `${quote.user.email} now has ${schedule.selectedQuotes.length} quotes scheduled for email.`
//         );

//         // Step 4: Respond with success
//         res.status(200).json({ message: 'Quote selection updated successfully.', quote });

//     } catch (error) {
//         console.error('Error updating quote selection:', error);
//         res.status(500).json({ message: 'Failed to update quote selection.' });
//     }
// });


// app.patch('/quotes/:id/selection', authenticate, async (req, res) => {
//     //console.log('Received payload:', req.body); // Log the incoming payload
//     //console.log('Received quote ID:', req.params.id);
//     const { id } = req.params;
//     const { selected } = req.body;

//     if (typeof selected !== 'boolean') {
//         return res.status(400).json({ message: 'Invalid selection value. Must be true or false.' });
//     }

//     try {
//         // Step 1: Find the quote by ID and ensure it belongs to the authenticated user
//         const quote = await Quote.findOne({ _id: id, user: req.userId }).populate('user', 'email');
//         if (!quote) {
//             return res.status(404).json({ message: 'Quote not found' });
//         }

//         // Step 1: Update the selected field for the quote
//         quote.selected = selected;

//         // Step 2: Handle sorting and position assignment based on the updated selection status
//         if (selected) {
//             // Ensure the 21-quote limit is not exceeded
//             const selectedQuotesCount = await Quote.countDocuments({ user: req.userId, selected: true });
//             if (selectedQuotesCount >= 21) {
//                 return res.status(400).json({ message: 'You can only select up to 21 quotes.' });
//             }

//             // Assign the quote to the bottom of the selected group
//             const selectedQuotes = await Quote.find({ user: req.userId, selected: true }).sort({ position: 1 });
//             quote.position = selectedQuotes.length > 0
//                 ? Math.max(...selectedQuotes.map(q => q.position)) + 1
//                 : 0;
//         } else {
//             // Assign the quote to the top of the unselected group
//             const unselectedQuotes = await Quote.find({ user: req.userId, selected: false }).sort({ position: 1 });
//             quote.position = unselectedQuotes.length > 0
//                 ? Math.min(...unselectedQuotes.map(q => q.position)) - 1
//                 : 0;
//         }

//         await quote.save();
//         // Log the desired message
//         // Truncate the content for the log
//         const truncatedContent = truncateQuoteContent(quote.content);
//         console.log(
//             `${quote.user.email} ${quote.selected ? 'selected' : 'deselected'} the quote "${truncatedContent}" for scheduled email.`
//         );

//         // Reassign positions for all quotes in the same group
//         //const allQuotes = await Quote.find({ user: req.userId }).sort({ position: 1 });

//         // Reassign positions for all quotes
//         const allQuotes = await Quote.find({ user: req.userId });
//         const reorderedQuotes = reorderQuotes(allQuotes);

//         // Save updated positions to the database
//         for (const q of reorderedQuotes) {
//             await Quote.findByIdAndUpdate(q._id, { position: q.position });
//         }

//         const updatedQuotes = await Quote.find({ user: req.userId }).sort({ position: 1 });
//         console.log('Database state after reordering:', updatedQuotes.map(q => ({
//             id: q._id,
//             position: q.position,
//             selected: q.selected,
//         })));

//         // -------------------------------------------Step 4: Update or create the schedule if required
//         let schedule = await Schedule.findOne({ user: req.userId });
//         if (!schedule) {
//             schedule = new Schedule({ user: req.userId, selectedQuotes: [] });
//         }

//         if (selected) {
//             schedule.selectedQuotes.push(quote._id);
//         } else {
//             schedule.selectedQuotes = schedule.selectedQuotes.filter((qid) => qid.toString() !== quote._id.toString());
//         }

//         // Ensure it doesn't exceed 21
//         schedule.selectedQuotes = schedule.selectedQuotes.slice(0, 21);
//         await schedule.save();

//         // Log the updated schedule information
//         console.log(
//             `${quote.user.email} now has ${schedule.selectedQuotes.length} quotes scheduled for email.`
//         );

//         res.status(200).json({ message: 'Quote selection updated successfully.', quote });

//     } catch (error) {
//         console.error('Error updating quote selection:', error);
//         res.status(500).json({ message: 'Failed to update quote selection.' });
//     }
// });

app.post('/quotes/update-order-selection', authenticate, async (req, res) => {
    const { quotes } = req.body;

    console.log('Received updated order from frontend:', quotes);

    if (!Array.isArray(quotes)) {
        return res.status(400).json({ message: 'Invalid input data' });
    }

    try {
        for (const { id, position, selected } of quotes) {
            await Quote.findByIdAndUpdate(id, { position, selected });
        }
        console.log('Quotes updated successfully');
        res.status(200).json({ message: 'Order and selection updated successfully' });
    } catch (error) {
        console.error('Error updating order and selection:', error);
        res.status(500).json({ message: 'Failed to update order and selection' });
    }
});

//Search Quotes by Other Users
app.get('/quotes/search', authenticate, async (req, res) => {
    const { userId } = req.query;

    try {
        const quotes = await Quote.find({ user: userId });
        res.status(200).json(quotes);
    } catch (error) {
        res.status(500).json({ message: 'Error searching quotes', error });
    }
});

//Update 2
async function sendEmail(to, subject, quote) {
    try {
        // Construct the source HTML with the clickable link or fallback
        const sourceHTML = quote.sourceLink
            ? `<a href="${quote.sourceLink}" target="_blank" style="font-style: italic; color: #2196F3; text-decoration: none;" 
                onmouseover="this.style.textDecoration='underline'; this.style.textDecorationColor='#2196F3'; this.style.textDecorationThickness='0.1em';"
                onmouseout="this.style.textDecoration='none';">${quote.source}</a>`
            : quote.source
            ? `<span style="font-style: italic; color: #777;">${quote.source}</span>`
            : `<span style="font-style: italic; color: #777;">(unsourced)</span>`;

        // Construct the email content
        const emailContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 800px; margin: 0 auto; text-align: left;">
                <!-- Quote Content -->
                <p style="font-size: 1.4em; font-style: normal; margin: 0 0 10px 0; color: #333; text-align: left; padding-left: 10px; padding-right: 10px;">
                    ${quote.content}
                </p>
                
                <!-- Author and Source -->
                <p style="font-size: 1.2em; color: #333; text-align: right; margin: 0; padding-right: 100px;">
                    <span style="font-weight: bold;">${quote.author}, </span>

                    ${quote.source ? `<span style="font-style: italic; color: ${quote.sourceLink ? '#2196F3' : '#777'}; text-decoration: ${quote.sourceLink ? 'underline' : 'none'};"><a href="${quote.sourceLink || '#'}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: inherit;">${quote.source}</a></span>` : ''}
                </p>
                
                <!-- Separator -->
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                
                <!-- Footer Link -->
                <p style="text-align: center; font-size: 0.9rem;">
                    🌟 <a href="http://206.189.153.211" style="color: #2196F3; text-decoration: none;">Visit reQuote for more inspiration!</a> 🌟
                </p>
            </div>
        `;

        // Send the email using the transporter
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            html: emailContent, // Use HTML for rich content
        });

        console.log(`Email ${quote.content} from ${quote.source} by ${quote.author} sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

//-------------------------------------------------Cron Jobs
//cron.schedule('* * * * *', async () => {    //sends every minute FOR TESTING
cron.schedule('0 6 * * *', async () => {
    console.log('Running email scheduler...');
    try {
        const schedules = await Schedule.find({}).populate('selectedQuotes user');
        
        for (const schedule of schedules) {
            const { user, selectedQuotes, nextIndex } = schedule;

            if (selectedQuotes.length === 0) continue; // Skip if no quotes are scheduled

            const quote = selectedQuotes[nextIndex];
           // const emailText = `${quote.content} - ${quote.author}, ${quote.source}`;

            // Send the email
            await sendEmail(user.email, 'Your Morning Quote', quote);

            // Update the next index and loop back if necessary
            schedule.nextIndex = (nextIndex + 1) % selectedQuotes.length;
            await schedule.save();
        }
    } catch (error) {
        console.error('Error running email scheduler:', error);
    }
}, {
    timezone: "Asia/Makassar"}
);

//----------------------------------------------- Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
``