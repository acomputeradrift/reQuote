import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    selectedQuotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quote', required: true }],
    nextIndex: { type: Number, default: 0 }, // Tracks the next quote to send
});
const Schedule = mongoose.model('Schedule', scheduleSchema);
export { Schedule };