export function generateAmazonLink(author, source) {
    if (!author || !source) {
        console.warn('Author or source missing for Amazon link generation.');
        return null; // Return null if either is missing
    }

    const query = encodeURIComponent(`${author} ${source}`);
    const amazonURL = `https://www.amazon.com/s?k=${query}&tag=YOUR_AFFILIATE_TAG`;

    return amazonURL;
}

//module.exports = { generateAmazonLink };

// function generateAmazonLink(author, source) {
//     if (!author || !source) {
//         console.warn('Author or source missing for Amazon link generation.');
//         return ''; // Return empty if either is missing
//     }

//     // Encode the search terms for the URL
//     const query = encodeURIComponent(`${author} ${source}`);
//     const amazonURL = `https://www.amazon.com/s?k=${query}&tag=YOUR_AFFILIATE_TAG`;

//     // Return a properly formatted and clickable link as HTML

//     return `<a href="${amazonURL}" target="_blank" rel="noopener noreferrer" style="color: #2196F3; text-decoration: none;">${source}</a>`;

// }