import { Quote } from '/var/www/reQuote/models/Quote.js';

export async function reorderUserQuotes(userId) {
    console.log('---- USER QUOTES SENT FOR SORTING ----');

    try {
        // Fetch all quotes for the user, sorting by selected first, then by position
        let quotes = await Quote.find({ user: userId }).sort({ selected: -1, position: 1 });

        if (!quotes.length) {
            console.log(`No quotes found for user ${userId}`);
            return;
        }

        // Log the current order before modifying
        console.log(`🔹 Current order before reordering for user ${userId}:`, quotes.map(q => ({
            id: q._id,
            position: q.position,
            selected: q.selected
        })));

        // 🔥 **Reassign positions in-memory before comparison**
        quotes = quotes.map((quote, index) => ({ ...quote.toObject(), newPosition: index }));

        // Prepare bulk updates
        const bulkUpdates = quotes
            .filter(quote => quote.position !== quote.newPosition) // Only update if position changed
            .map(quote => ({
                updateOne: {
                    filter: { _id: quote._id },
                    update: { $set: { position: quote.newPosition } }
                }
            }));

        // Log the updated order BEFORE saving to the database
        console.log(`🔹 Final order before saving for user ${userId}:`, quotes.map(q => ({
            id: q._id,
            oldPosition: q.position,
            newPosition: q.newPosition,
            selected: q.selected
        })));

        // Execute bulk update if there are changes
        if (bulkUpdates.length > 0) {
            await Quote.bulkWrite(bulkUpdates);
            console.log(`✅ Successfully reordered ${quotes.length} quotes for user ${userId}`);
        } else {
            console.log(`✅ No changes needed for user ${userId}, position already correct.`);
        }

        console.log('---- USER QUOTES DONE BEING SORTED ----');

    } catch (error) {
        console.error("❌ Error updating quote positions:", error);
    }
}
