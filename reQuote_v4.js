// reQuote_v4.js
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();


import { generateAmazonLink } from './utils/amazonLink.js';

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

//----------------------------------------------------------- Schemas and Models
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    confirmed: { type: Boolean, default: false },
    quotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quote' }], // List of user's quotes
    selectedQuotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quote' }] // Array of selected quotes
});

// const quoteSchema = new mongoose.Schema({
//     content: { type: String, required: true },
//     author: { type: String, required: true },
//     source: { type: String, default: 'Unknown' }, // Default value for source
//     sourceLink: { type: String, default: null },  // Amazon link for the book
//     order: Number, // Add the order attribute
//     user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
// });

const quoteSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: String, required: true },
    source: { type: String, default: 'Unknown' }, // Default value for source
    sourceLink: { type: String, default: null },  // Amazon link for the book
    position: { type: Number, default: null },    // Renamed from 'order'
    selected: { type: Boolean, default: false },  // Indicates if the quote is part of the selected group
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const scheduleSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    selectedQuotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quote', required: true }],
    nextIndex: { type: Number, default: 0 }, // Tracks the next quote to send
});

const User = mongoose.model('User', userSchema);
const Quote = mongoose.model('Quote', quoteSchema);
const Schedule = mongoose.model('Schedule', scheduleSchema);
export { Quote };

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

// // Add Quote (logged...)
// app.post('/quotes', authenticate, async (req, res) => {
//     const { content, author, source } = req.body;

//     if (!content || !author) {
//         return res.status(400).json({ message: 'Content and author are required' });
//     }

//     try {
//         // Generate the Amazon link (if source is provided)
//         const sourceLink = source ? generateAmazonLink(author, source) : null;
//         // Calculate the next available order for the user's quotes
//         const userQuotes = await Quote.find({ user: req.userId });
//         const nextOrder = userQuotes.length; // Assign the next position in the list

//         // Create a new quote
//         const quote = new Quote({
//             content,
//             author,
//             source,
//             sourceLink, // Save the generated Amazon link
//             order: nextOrder, // Assign order
//             user: req.userId, // Associate the quote with the logged-in user
//         });

//         await quote.save();
//         console.log('Quote object saved');
//         // Add the quote to the user's quotes field
//         const user = await User.findById(req.userId);
//         if (user) {
//             user.quotes.push(quote._id);
//             await user.save();
//             console.log('Quote object added to user');
//         }
//         res.status(201).json({ message: 'Quote added successfully', quote });
//     } catch (error) {
//         console.error('Error adding quote (backend):', error);
//         res.status(500).json({ message: 'Failed to add quote (backend)' });
//     }
// });

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
        const nextPosition = userQuotes.filter(q => !q.selected).length;

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
        console.log('Quote object saved');

        // Add the quote to the user's quotes field
        const user = await User.findById(req.userId);
        if (user) {
            user.quotes.push(quote._id);
            await user.save();
            console.log('Quote object added to user');
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
        const quotes = await Quote.find({ user: req.userId }).sort({ order: 1 });
        res.status(200).json(quotes);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving quotes (backend)', error });
    }
});

//Reorder Quotes
app.post('/quotes/reorder', authenticate, async (req, res) => {
    const updates = req.body; // Array of { id, order }
    //console.log('Reorder updates received:', updates);

    try {
        for (const { id, order } of updates) {
            //console.log(`Updating quote ID ${id} to order ${order}`);
            await Quote.findByIdAndUpdate(id, { order });
        }
        res.status(200).json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Error updating order (backend):', error);
        res.status(500).json({ message: 'Failed to update order (backend)' });
    }
});

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
        console.log("Updated quote:", updatedQuote); // Log the updated quote
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

// Update the selection status of a single quote
app.patch('/quotes/:id/selection', authenticate, async (req, res) => {
    console.log('Received payload:', req.body); // Log the incoming payload
    console.log('Received quote ID:', req.params.id);
    const { id } = req.params;
    const { selected } = req.body;

    if (typeof selected !== 'boolean') {
        return res.status(400).json({ message: 'Invalid selection value. Must be true or false.' });
    }

    try {
        // Step 1: Find the quote by ID and ensure it belongs to the authenticated user
        const quote = await Quote.findOne({ _id: id, user: req.userId });
        if (!quote) {
            return res.status(404).json({ message: 'Quote not found' });
        }

        // Step 2: Check the 21-quote limit for selected quotes
        if (selected) {
            const selectedQuotesCount = await Quote.countDocuments({ user: req.userId, selected: true });
            if (selectedQuotesCount >= 21) {
                return res.status(400).json({ message: 'You can only select up to 21 quotes.' });
            }
        }

        // Step 3: Update the selected field for the quote
        quote.selected = selected;
        await quote.save();
        console.log(`Quote selection updated. Quote ID: ${quote._id}, Selected: ${quote.selected}`);

        // Step 4: Update or create the schedule if required
        let schedule = await Schedule.findOne({ user: req.userId });
        if (!schedule) {
            schedule = new Schedule({ user: req.userId, selectedQuotes: [] });
        }

        if (selected) {
            schedule.selectedQuotes.push(quote._id);
        } else {
            schedule.selectedQuotes = schedule.selectedQuotes.filter((qid) => qid.toString() !== quote._id.toString());
        }

        schedule.selectedQuotes = schedule.selectedQuotes.slice(0, 21); // Ensure it doesn't exceed 21
        await schedule.save();
        console.log('Schedule updated:', schedule.selectedQuotes);

        res.status(200).json({ message: 'Quote selection updated successfully.', quote });
    } catch (error) {
        console.error('Error updating quote selection:', error);
        res.status(500).json({ message: 'Failed to update quote selection.' });
    }
});

// //Update Selected Quotes
// app.post('/quotes/selection', authenticate, async (req, res) => {
//     const { selectedQuotes } = req.body;

//     if (!Array.isArray(selectedQuotes) || selectedQuotes.length > 21) {
//         return res.status(400).json({ message: 'You must select between 1 and 21 quotes.' });
//     }

//     try {
//         // Step 1: Update the user's selectedQuotes
//         const user = await User.findById(req.userId);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         user.selectedQuotes = selectedQuotes;
//         await user.save();
//         console.log('user.selectedQuotes updated:', user.selectedQuotes);

//         // Step 2: Update or create the schedule using the user's selectedQuotes
//         let schedule = await Schedule.findOne({ user: req.userId });

//         if (!schedule) {
//             // Create a new schedule if one doesn't exist
//             schedule = new Schedule({
//                 user: req.userId,
//                 selectedQuotes: user.selectedQuotes, // Use updated selectedQuotes from user
//                 nextIndex: 0,
//             });
//         } else {
//             // Update existing schedule
//             schedule.selectedQuotes = user.selectedQuotes;
//             schedule.nextIndex = 0;
//         }

//         await schedule.save();
//         console.log('schedule.selectedQuotes updated:', schedule.selectedQuotes);

//         res.status(200).json({ message: 'Selected quotes updated successfully.' });
//     } catch (error) {
//         console.error('Error updating selected quotes:', error);
//         res.status(500).json({ message: 'Failed to update selected quotes.' });
//     }
// });

//Fetch Selected Quotes
app.get('/quotes/selected', authenticate, async (req, res) => {
    try {
        //console.log('Fetching selected quotes'); // Log the request

        const user = await User.findById(req.userId).populate('selectedQuotes');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ selectedQuotes: user.selectedQuotes.map((quote) => quote._id) });
    } catch (error) {
        console.error('Error fetching selected quotes:', error);
        res.status(500).json({ message: 'Failed to fetch selected quotes.' });
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
