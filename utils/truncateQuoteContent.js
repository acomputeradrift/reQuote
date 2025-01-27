export function truncateQuoteContent(content) {
    const words = content.split(' '); // Split content into words
    return words.length > 7 ? `${words.slice(0, 7).join(' ')}...` : content; // Take the first 7 words and add "..."
}