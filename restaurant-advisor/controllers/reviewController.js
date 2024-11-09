const mongoose = require('mongoose');
const Review = mongoose.model('Review');
const Store = mongoose.model('Store');

exports.addReview = async (req, res) => {
    req.body.author = req.user._id;
    req.body.store = req.params.id;
    const newReview = new Review(req.body);
    await newReview.save();

    // Find the store from DB
    const store = await Store.findById(req.params.id);

    // Convert to numbers to avoid concatenation issues
    const totalReviews = Number(store.totalReviews) + 1;
    console.log('totalReviews', totalReviews);
    console.log('store.rating', req.body.rating);
    console.log('store.averageRating', store.averageRating);

    // Calculate the sum of all ratings
    const sumOfRatings = (Number(store.averageRating) * Number(store.totalReviews)) + Number(req.body.rating);
    console.log('sumOfRatings', sumOfRatings);

    // Calculate the new average rating
    let averageRating = sumOfRatings / totalReviews;
    averageRating = Number(averageRating.toFixed(2));
    console.log('averageRating', averageRating);

    // Update the store in DB
    await Store.findByIdAndUpdate(req.params.id, {
        totalReviews,
        averageRating
    }, {
        new: true, // return the new store instead of the old one
        runValidators: true
    });

    // Refresh the store page with the new review and the recalculated rating
    req.flash('success', 'Review saved');
    res.redirect('back');
};

