// export function reorderQuotes(quotes) {
//     let currentPosition = 0;

//     // Sort selected quotes by position and assign new positions
//     const selectedQuotes = quotes
//         .filter(q => q.selected)
//         .sort((a, b) => a.position - b.position)
//         .map(q => ({ ...q, position: currentPosition++ }));

//     // Sort non-selected quotes by position and assign new positions
//     const nonSelectedQuotes = quotes
//         .filter(q => !q.selected)
//         .sort((a, b) => a.position - b.position)
//         .map(q => ({ ...q, position: currentPosition++ }));

//     // Combine sorted arrays
//     return [...selectedQuotes, ...nonSelectedQuotes];
// }

export function reorderQuotes(quotes) {
    let selectedPosition = 0;
    let unselectedPosition = 0;

    // Sort selected quotes
    const selectedQuotes = quotes
        .filter(q => q.selected)
        .sort((a, b) => a.position - b.position)
        .map(q => ({ ...q, position: selectedPosition++ }));

    // Sort unselected quotes
    const unselectedQuotes = quotes
        .filter(q => !q.selected)
        .sort((a, b) => a.position - b.position)
        .map(q => ({ ...q, position: unselectedPosition++ }));

    return [...selectedQuotes, ...unselectedQuotes];
}

