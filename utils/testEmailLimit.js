import { Quote } from '/var/www/reQuote/models/Quote.js';

export async function testEmailLimit(quote) { 
    // ✅ Extract `userId` from the `quote` object
    const userId = quote.user; 

    // ✅ Ensure the function is async so `await` works
    const selectedQuotesCount = await Quote.countDocuments({ user: userId, selected: true });

    console.log(`This user currently has ${selectedQuotesCount} selected quotes.`);

    if (selectedQuotesCount >= 21) {
        console.log('NOT Approved.');
        return { approved: false, message: 'You can only select up to 21 quotes.' };
    } else {
        console.log('Approved.');
        return { approved: true };
    }
}

