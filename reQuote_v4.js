// reQuote_v4.js

// Import dependencies (always at the top)
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const nodemailer = require('nodemailer');
const PORT = process.env.PORT || 3000;
const cron = require('node-cron')

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

const quoteSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: String, required: true },
    source: { type: String, default: 'Unknown' }, // Default value for source
    order: Number, // Add the order attribute
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
//const Schedule = require('./models/Schedule'); // Import the Schedule model

//------------------------------------------------------ Initialize the Express app
const app = express();
app.use(express.json());

// Middleware
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('User authenticated with token:', token);
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
//Login (logged)
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
        console.log(`${user.email}: logged in.`);
        res.status(200).json({ message: 'Login successful', token, email: user.email });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error logging in', error });
    }
});

// Newest Add Quote

// Add Quote (logged)
app.post('/quotes', authenticate, async (req, res) => {
    const { content, author, source } = req.body;

    if (!content || !author) {
        return res.status(400).json({ message: 'Content and author are required' });
    }

    try {
        // Calculate the next available order for the user's quotes
        const userQuotes = await Quote.find({ user: req.userId });
        const nextOrder = userQuotes.length; // Assign the next position in the list

        // Create a new quote
        const quote = new Quote({
            content,
            author,
            source,
            order: nextOrder, // Assign order
            user: req.userId, // Associate the quote with the logged-in user
        });

        await quote.save();

        // Add the quote to the user's quotes field
        const user = await User.findById(req.userId);
        if (user) {
            user.quotes.push(quote._id);
            await user.save();
        }

        res.status(201).json({ message: 'Quote added successfully', quote });
    } catch (error) {
        console.error('Error adding quote (backend):', error);
        res.status(500).json({ message: 'Failed to add quote (backend)' });
    }
});


// //Add Quote (logged)
// app.post('/quotes', authenticate, async (req, res) => {
//     const { content, author, source } = req.body;

//     if (!content || !author) {
//         return res.status(400).json({ message: 'Content and author are required' });
//     }

//     try {
//         // Calculate the next available order for the user's quotes
//         const userQuotes = await Quote.find({ user: req.userId });
//         const nextOrder = userQuotes.length; // Assign the next position in the list

//         // Create a new quote
//         const quote = new Quote({
//             content,
//             author,
//             source,
//             order: nextOrder, // Assign order
//             user: req.userId, // Associate the quote with the logged-in user
//         });

//         await quote.save();
//         //console.log(`Quote added by ${user.email}`);
//         res.status(201).json({ message: 'Quote added successfully', quote });
//     } catch (error) {
//         console.error('Error adding quote (backend):', error);
//         res.status(500).json({ message: 'Failed to add quote (backend)' });
//     }
// });

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

//Delete Quote by User
app.delete('/quotes/:id', authenticate, async (req, res) => {
    //console.log('Delete request received for ID:', req.params.id); // Log the ID
    //console.log('Authenticated user ID:', req.userId); // Log the user ID
    try {
        const quoteId = req.params.id;
        const deletedQuote = await Quote.findOneAndDelete({ _id: quoteId, user: req.userId });

        if (!deletedQuote) {
            return res.status(404).json({ message: 'Quote not found or not authorized to delete' });
        }

        res.status(200).json({ message: 'Quote deleted successfully' });
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ message: 'Failed to delete quote (backend)' });
    }
});

//Newest Update Selected Quotes
app.post('/quotes/selected', authenticate, async (req, res) => {
    const { selectedQuotes } = req.body;

    if (!Array.isArray(selectedQuotes) || selectedQuotes.length > 21) {
        return res.status(400).json({ message: 'You must select between 1 and 21 quotes.' });
    }

    try {
        // Find or create a schedule for the user
        let schedule = await Schedule.findOne({ user: req.userId });

        if (!schedule) {
            // Create a new schedule if one doesn't exist
            schedule = new Schedule({
                user: req.userId,
                selectedQuotes,
                nextIndex: 0, // Start at the first quote
            });
        } else {
            // Update existing schedule with new quotes and reset the index
            schedule.selectedQuotes = selectedQuotes;
            schedule.nextIndex = 0;
        }

        await schedule.save(); // Save the schedule

        res.status(200).json({ message: 'Selected quotes scheduled successfully.' });
    } catch (error) {
        console.error('Error scheduling selected quotes:', error);
        res.status(500).json({ message: 'Failed to schedule selected quotes.' });
    }
});

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

//Generate 30 quotes for testing
app.post('/quotes/generate', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || user.email !== 'feeny.jamie@gmail.com') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const testQuotes = [];
        for (let i = 1; i <= 30; i++) {
            testQuotes.push({
                content: `Test Quote ${i}`,
                author: `Author ${i}`,
                user: req.userId,
            });
        }

        await Quote.insertMany(testQuotes);
        res.status(201).json({ message: '30 test quotes generated successfully.' });
    } catch (error) {
        console.error('Error generating test quotes:', error);
        res.status(500).json({ message: 'Failed to generate test quotes.' });
    }
});

//Function to send an email
async function sendEmail(to, subject, text) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        });
        console.log(`Email sent to ${to}`);
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
            const emailText = `"${quote.content}" - ${quote.author}`;

            // Send the email
            await sendEmail(user.email, 'Your Morning Quote', emailText);
            console.log(`Email sent to ${user.email}: "${quote.content}"`);

            // Update the next index and loop back if necessary
            schedule.nextIndex = (nextIndex + 1) % selectedQuotes.length;
            await schedule.save();
        }
    } catch (error) {
        console.error('Error running email scheduler:', error);
    }
});

//----------------------------------------------- Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
