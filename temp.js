       //-------------------------------------------------filter/sort

        // if (quote.selected) {
        //     console.log('Quote is being selected.');

        //     // Ensure the 21-quote limit is not exceeded
        //     const selectedQuotesCount = await Quote.countDocuments({ user: req.userId, selected: true });
            
        //     console.log(`Currently selected quotes count: ${selectedQuotesCount}`);
        //     if (selectedQuotesCount >= 21) {
        //         return res.status(400).json({ message: 'You can only select up to 21 quotes.' });
        //     }

        //     // Assign the quote to the bottom of the selected group

        //     //search the database for
        //    const selectedQuotes = await Quote.find({ user: req.userId, selected: true });
        //    console.log('Selected quotes before assigning position:', selectedQuotes.map(q => ({
        //         id: q._id,
        //         position: q.position
        //     })));

        //     quote.position = selectedQuotes.length > 0
        //         ? Math.max(...selectedQuotes.map(q => q.position)) + 1
        //         : 0;

        //     console.log(`Assigned position to selected quote: ${quote.position}`);


        // } else {
        //     // Assign the quote to the top of the unselected group
        //     console.log(`Quote is being deselected: ${quote._id}`);

        //     const unselectedQuotes = await Quote.find({ user: req.userId, selected: false }).sort({ position: 1 });
        //     console.log('Unselected quotes before position adjustment:', unselectedQuotes.map(q => ({ id: q._id, position: q.position })));

        //     // Set the deselected quote's position to the lowest available position (top of the unselected group)
        //     quote.position = unselectedQuotes.length > 0
        //         ? Math.min(...unselectedQuotes.map(q => q.position)) - 1
        //         : 0;
        //     console.log(`Assigned position to deselected quote: ${quote._id} -> ${quote.position}`);

        //     await quote.save();

        //     // Log the final state of the database
        //     const updatedUnselectedQuotes = await Quote.find({ user: req.userId, selected: false }).sort({ position: 1 });
        //     console.log('Unselected quotes after adjustment:', updatedUnselectedQuotes.map(q => ({ id: q._id, position: q.position })));
        // }

        //-------------------------------------------------------filter/sort

        // } else {
        //     // Assign the quote to the bottom of the unselected group
        //     console.log(`Quote is being deselected: ${quote._id}`);

        //     const unselectedQuotes = await Quote.find({ user: req.userId, selected: false }).sort({ position: 1 });
        //     console.log('Unselected quotes before position adjustment:', unselectedQuotes.map(q => ({ id: q._id, position: q.position })));

        //     // Set the deselected quote's position to the highest available position (bottom of the unselected group)
        //     quote.position = unselectedQuotes.length > 0
        //         ? Math.max(...unselectedQuotes.map(q => q.position)) + 1
        //         : 0;
        //     console.log(`Assigned position to deselected quote: ${quote._id} -> ${quote.position}`);

        //     await quote.save();

        //     // Log the final state of the database
        //     const updatedUnselectedQuotes = await Quote.find({ user: req.userId, selected: false }).sort({ position: 1 });
        //     console.log('Unselected quotes after adjustment:', updatedUnselectedQuotes.map(q => ({ id: q._id, position: q.position })));
        // }

        // } else {
        //     //console.log('Quote is being deselected.');
        //     console.log('Current quote being deselected:', { id: quote._id, position: quote.position });

        //     // Assign the quote to the top of the unselected group
        //     const unselectedQuotes = await Quote.find({ user: req.userId, selected: false }).sort({ position: 1 });
        //     console.log('Unselected quotes before position adjustment:', unselectedQuotes.map(q => ({
        //         id: q._id,
        //         position: q.position
        //     })));

        //     quote.position = 0;

        //     // Shift positions of all other unselected quotes
        //     for (const q of unselectedQuotes) {
        //         console.log(`Shifting position for quote ID: ${q._id} from ${q.position} to ${q.position + 1}`);
        //         q.position += 1;
        //         await q.save();
        //         console.log(`Quote ${q._id} saved with new position: ${q.position}`);

        //         //console.log(`Shifting position for quote ID: ${q._id} from ${q.position} to ${q.position + 1}`);

        //         //console.log(`Shifted position of quote ID: ${q._id} to ${q.position}`);
        //     }
        // }
        //console.log('Unselected quotes after position adjustment:', unselectedQuotes.map(q => ({ id: q._id, position: q.position })));

        // await quote.save();
        // console.log(`Quote ${quote._id} saved with position: ${quote.position}`);

        // // Reorder all quotes
        // const allQuotes = await Quote.find({ user: req.userId });
        // const reorderedQuotes = reorderQuotes(allQuotes);

        // // Save updated positions to the database
        // for (const q of reorderedQuotes) {
        //     await Quote.findByIdAndUpdate(q._id, { position: q.position });
        // }

        // const updatedQuotes = await Quote.find({ user: req.userId }).sort({ position: 1 });
        // console.log('Database state after reordering:', updatedQuotes.map(q => ({
        //     id: q._id,
        //     position: q.position,
        //     selected: q.selected,
        // })));

        // // Log the action
        // const truncatedContent = truncateQuoteContent(quote.content);
        // console.log(
        //     `${quote.user.email} ${quote.selected ? 'selected' : 'deselected'} the quote "${truncatedContent}" for scheduled email.`
        // );

        // //------------------------------------------------- Step 3: Update the schedule
        // // let schedule = await Schedule.findOne({ user: req.userId });
        // // if (!schedule) {
        // //     schedule = new Schedule({ user: req.userId, selectedQuotes: [] });
        // // }

        // // if (selected) {
        // //     schedule.selectedQuotes.push(quote._id);
        // // } else {
        // //     schedule.selectedQuotes = schedule.selectedQuotes.filter((qid) => qid.toString() !== quote._id.toString());
        // // }

        // // schedule.selectedQuotes = schedule.selectedQuotes.slice(0, 21); // Ensure it doesn't exceed 21
        // // await schedule.save();

        // // console.log(
        // //     `${quote.user.email} now has ${schedule.selectedQuotes.length} quotes scheduled for email.`
        // // );

        // // Step 4: Respond with success
        // console.log('Final response being sent to frontend.');
        // res.status(200).json({ message: 'Quote selection updated successfully.', quote });
