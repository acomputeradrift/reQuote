import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    confirmed: { type: Boolean, default: false },
    quotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quote' }], // List of user's quotes
    selectedQuotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quote' }] // Array of selected quotes
});
const User = mongoose.model('User', userSchema);
export { User };