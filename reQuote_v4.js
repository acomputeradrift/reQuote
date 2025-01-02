// reQuote_v4.js

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// MongoDB Connection
(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB running reQuote_v3');
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
    selectedQuotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quote' }] // Array of selected quotes
});

const quoteSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: String, required: true },
    order: Number, // Add the order attribute
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const User = mongoose.model('User', userSchema);
const Quote = mongoose.model('Quote', quoteSchema);

//-------------------------------------------------------- Authentication Middleware
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Received token:', token);
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
//Login
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
        res.status(200).json({ message: 'Login successful', token, email: user.email });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error logging in', error });
    }
});

//Add Quote
app.post('/quotes', authenticate, async (req, res) => {
    const { content, author } = req.body;

    if (!content || !author) {
        return res.status(400).json({ message: 'Content and author are required' });
    }

    try {
        // Calculate the next available order for the user's quotes
        const userQuotes = await Quote.find({ user: req.userId });
        const nextOrder = userQuotes.length; // Assign the next position in the list

        const quote = new Quote({
            content,
            author,
            order: nextOrder, // Assign order
            user: req.userId, // Associate the quote with the logged-in user
        });

        await quote.save();
        res.status(201).json({ message: 'Quote added successfully', quote });
    } catch (error) {
        console.error('Error adding quote (backend):', error);
        res.status(500).json({ message: 'Failed to add quote (backend)' });
    }
});

//Reorder Quotes
app.post('/quotes/reorder', authenticate, async (req, res) => {
    const updates = req.body; // Array of { id, order }
    console.log('Reorder updates received:', updates);

    try {
        for (const { id, order } of updates) {
            console.log(`Updating quote ID ${id} to order ${order}`);
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
    console.log('Delete request received for ID:', req.params.id); // Log the ID
    console.log('Authenticated user ID:', req.userId); // Log the user ID
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

//Get Quotes by User
app.get('/quotes', authenticate, async (req, res) => {
    try {
        const quotes = await Quote.find({ user: req.userId }).sort({ order: 1 });
        res.status(200).json(quotes);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving quotes (backend)', error });
    }
});

//Update Selected Quotes
app.post('/quotes/selected', authenticate, async (req, res) => {
    const { selectedQuotes } = req.body;

    if (!Array.isArray(selectedQuotes) || selectedQuotes.length > 21) {
        return res.status(400).json({ message: 'You must select between 1 and 21 quotes.' });
    }

    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the selected quotes for the user
        user.selectedQuotes = selectedQuotes;
        await user.save();

        res.status(200).json({ message: 'Selected quotes updated successfully.' });
    } catch (error) {
        console.error('Error updating selected quotes:', error);
        res.status(500).json({ message: 'Failed to update selected quotes.' });
    }
});

//Fetch Selected Quotes
app.get('/quotes/selected', authenticate, async (req, res) => {
    try {
        console.log('Fetching selected quotes'); // Log the request

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

//------------------------------------------------ Create Admin User
(async () => {
    try {
        const adminExists = await User.findOne({ email: 'admin@admin.com' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('feenyjamie', 10);
            await User.create({ email: 'admin@admin.com', password: hashedPassword, confirmed: true });
            console.log('Admin user created');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
})();

//----------------------------------------------- Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
