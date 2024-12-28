const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI);
console.log('Mongo URI:', process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Schema and Models
const quoteSchema = new mongoose.Schema({
  text: String,
  author: String,
  tag: { type: Boolean, default: false },
});

const Quote = mongoose.model('Quote', quoteSchema);

// Routes

// Add a new quote
app.post('/quotes', async (req, res) => {
  try {
    const { text, author } = req.body;
    const newQuote = new Quote({ text, author });
    await newQuote.save();
    res.status(201).json({ message: 'Quote added successfully', quote: newQuote });
  } catch (error) {
    res.status(500).json({ message: 'Error adding quote', error });
  }
});

// Get all quotes
app.get('/quotes', async (req, res) => {
  try {
    const quotes = await Quote.find();
    res.status(200).json(quotes);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving quotes', error });
  }
});

// Tag or untag a quote
app.patch('/quotes/:id/tag', async (req, res) => {
  try {
    const { id } = req.params;
    const { tag } = req.body;
    const updatedQuote = await Quote.findByIdAndUpdate(id, { tag }, { new: true });
    res.status(200).json({ message: 'Quote updated successfully', quote: updatedQuote });
  } catch (error) {
    res.status(500).json({ message: 'Error updating quote', error });
  }
});

// Email Scheduler
let currentQuoteIndex = 0;

cron.schedule('0 6 * * *', async () => {
  try {
    const taggedQuotes = await Quote.find({ tag: true });
    if (taggedQuotes.length === 0) {
      console.log('No tagged quotes to email.');
      return;
    }

    const quoteToEmail = taggedQuotes[currentQuoteIndex];

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use Gmail or any other SMTP service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_RECIPIENT, // Set the recipient's email address
      subject: 'Your Daily Quote',
      text: `"${quoteToEmail.text}" - ${quoteToEmail.author}`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent: "${quoteToEmail.text}" - ${quoteToEmail.author}`);

    // Update index
    currentQuoteIndex = (currentQuoteIndex + 1) % taggedQuotes.length;
  } catch (error) {
    console.error('Error sending email:', error);
  }
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
