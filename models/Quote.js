import mongoose from 'mongoose';

const quoteSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: String, required: true },
    source: { type: String, default: 'Unknown' }, // Default value for source
    sourceLink: { type: String, default: null },  // Amazon link for the book
    position: { type: Number, default: null },    // Renamed from 'order'
    selected: { type: Boolean, default: false },  // Indicates if the quote is part of the selected group
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Quote = mongoose.model('Quote', quoteSchema);
export { Quote };
