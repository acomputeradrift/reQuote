function generateAmazonLink(author, source) {
    if (!author || !source) {
        console.warn('Author or source missing for Amazon link generation.');
        return null; // Return null if either is missing
    }

    const query = encodeURIComponent(`${author} ${source}`);
    const amazonURL = `https://www.amazon.com/s?k=${query}&tag=YOUR_AFFILIATE_TAG`;

    return amazonURL;
}

module.exports = { generateAmazonLink };
