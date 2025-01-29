import { Schedule } from '/var/www/reQuote/models/Schedule.js';

// export async function updateUserSchedule(userID, selected, quoteID) {
//     let schedule = await Schedule.findOne({ user: userID });
//     if (!schedule) {
//         schedule = new Schedule({ user: userID, selectedQuotes: [] });
//     }

//     if (selected) {
//         schedule.selectedQuotes.push(quoteID);
//     } else {
//         schedule.selectedQuotes = schedule.selectedQuotes.filter((qid) => qid.toString() !== quoteID.toString());
//     }

//     schedule.selectedQuotes = schedule.selectedQuotes.slice(0, 21); // Ensure it doesn't exceed 21
//     await schedule.save();

//     console.log(`User with ID ${userID} now has ${schedule.selectedQuotes.length} quotes scheduled for email.`);
// }

export async function updateUserSchedule(userID, userEmail, selected, quoteID) {
    const update = selected
        ? { $addToSet: { selectedQuotes: quoteID } }
        : { $pull: { selectedQuotes: quoteID } };

    const schedule = await Schedule.findOneAndUpdate(
        { user: userID },
        { ...update, $slice: { selectedQuotes: 21 } },
        { new: true, upsert: true }
    );

    console.log(`${userEmail} now has ${schedule.selectedQuotes.length} quotes scheduled for email.`);
}
