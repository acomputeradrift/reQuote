import { Quote } from '/var/www/reQuote/models/Quote.js';

export async function reorderUserQuotes(userId) {
    console.log('---- USER QUOTES SENT FOR SORTING ----v2');

    try {
        // Fetch all quotes for the user
        let quotes = await Quote.find({ user: userId }).sort({ position: 1 });
        //let quotes = await Quote.find({ user: userId });

        if (!quotes.length) {
            console.log(`No quotes found for user ${userId}`);
            return;
        }

          // 🔍 Log quotes fresh from the database
        //   console.log(`Quotes fresh from the database for user ${userId}:`, quotes.map((q, i) => ({
        //     id: q._id,
        //     oldPosition: q.position,
        //     newPosition: i,
        //     selected: q.selected
        // })));

        // 🔥 Step 1: Separate selected and unselected quotes
        let selectedQuotes = quotes.filter(q => q.selected);
        // console.log(`Selected Quotes fresh from the database:`, selectedQuotes.map((q, i) => ({
        //     id: q._id,
        //     oldPosition: q.position,
        //     newPosition: i,
        //     selected: q.selected
        // })));
        let unselectedQuotes = quotes.filter(q => !q.selected);
        // console.log(`Uselected Quotes fresh from the database:`, unselectedQuotes.map((q, i) => ({
        //     id: q._id,
        //     oldPosition: q.position,
        //     newPosition: i,
        //     selected: q.selected
        // })));

        // 🔥 Step 2: Ensure newly deselected quotes go to the top of unselected
        unselectedQuotes.sort((a, b) => a.position - b.position); // Maintain previous order
        // console.log(`Unselected Quotes after sort:`, unselectedQuotes.map((q, i) => ({
        //     id: q._id,
        //     oldPosition: q.position,
        //     newPosition: i,
        //     selected: q.selected
        // })));


        // 🔥 Step 3: Ensure newly selected quotes go to the last position of selected
        selectedQuotes.sort((a, b) => a.position - b.position); // Maintain previous order
        // console.log(` Selected Quotes after sort:`, selectedQuotes.map((q, i) => ({
        //     id: q._id,
        //     oldPosition: q.position,
        //     newPosition: i,
        //     selected: q.selected
        // })));

        // 🔥 Step 4: Reassign new positions
        let reorderedQuotes = [...selectedQuotes, ...unselectedQuotes];
        // console.log(`All Quotes after sort:`, reorderedQuotes.map((q, i) => ({
        //     id: q._id,
        //     oldPosition: q.position,
        //     newPosition: i,
        //     selected: q.selected
        // })));

        const bulkUpdates = reorderedQuotes.map((quote, index) => {
            if (quote.position !== index) {
                return {
                    updateOne: {
                        filter: { _id: quote._id },
                        update: { $set: { position: index } }
                    }
                };
            }
        }).filter(update => update !== undefined); // Remove empty updates

        // 🔍 Log final order before saving
        // console.log(`Final order before saving:`, reorderedQuotes.map((q, i) => ({
        //     id: q._id,
        //     oldPosition: q.position,
        //     newPosition: i,
        //     selected: q.selected
        // })));

        // 🔥 Step 5: Execute database updates if needed
        if (bulkUpdates.length > 0) {
            await Quote.bulkWrite(bulkUpdates);
            console.log(`✅ Successfully reordered ${quotes.length} quotes for user ${userId}`);
        } else {
            console.log(`✅ No changes needed for user ${userId}, order already correct.`);
        }

        console.log('---- USER QUOTES DONE BEING SORTED ----');

    } catch (error) {
        console.error("❌ Error updating quote positions:", error);
    }
}
