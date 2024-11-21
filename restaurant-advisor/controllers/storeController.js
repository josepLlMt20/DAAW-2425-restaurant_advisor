const uuid = require('uuid');
const { Jimp } = require('jimp');
const multer = require('multer');
const mongoose = require('mongoose');
const { use } = require('passport');
const Store = mongoose.model('Store');
const Review = mongoose.model('Review');

//*** Verify Credentials 
const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id) && !user.is_admin) {
        throw Error('You must own the store in order to edit it');
    }
};

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store' });
}

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto) {
            next(null, true); //1st value is provided in case of error.
        } else {
            next({ message: 'That filetype isn\'t allowed' }, false);
        }
    }
};

exports.verify = multer(multerOptions).single('photo');


//MIDLEWARE FUNCTION for CREATE STORE
exports.upload = async (req, res, next) => {
    //check if there is no new file to resize
    if (!req.file) {
        next(); // no file -> do nothing and go to next middleware
        return;
    }
    console.log(req.body);
    console.log(req.file);
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    //now we resize and write in hard-drive
    const photo = await Jimp.read(req.file.buffer);
    photo.resize({ w: 800, h: Jimp.AUTO }); //width=800, height=AUTO
    await photo.write(`./public/uploads/${req.body.photo}`);
    next();
};


exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = new Store(req.body);
    const savedStore = await store.save();
    console.log('Store saved!');
    req.flash('success', `Successfully Created ${store.name}.`);
    res.redirect(`/store/${savedStore.slug}`);
};

exports.getStoreBySlug = async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    const store = await Store.findOne({ slug: req.params.slug });
    if (!store) {
        return res.status(404).render('error', { message: 'Store not found' });
    }

    const groupedTimeSlots = store.timeSlots.reduce((acc, slot) => {
        if (!acc[slot.dayOfWeek]) {
            acc[slot.dayOfWeek] = [];
        }
        acc[slot.dayOfWeek].push(slot);
        return acc;
    }, {});

    try {
        const address = store.address;
        res.render('store', { store, address, groupedTimeSlots });
    } catch (error) {
        console.error(error);
        res.render('store', { store, coordinates: null, groupedTimeSlots });
    }
};

exports.getStores = async (req, res) => {
    const stores = await Store.find();
    res.render('stores', { title: 'Stores', stores: stores });
};

exports.getStoresMap = async (req, res) => {
    const stores = await Store.find();
    if (!stores || stores.length === 0) {
        return res.status(404).render('error', { message: 'Stores not found' });
    }

    const storesData = stores.map(store => ({
        name: store.name,
        address: store.address,
        averageRating: store.averageRating || 0
    }));

    res.render('storesMap', { storesData });
};

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id });
    confirmOwner(store, req.user); //check if the user is the owner
    res.render('editStore', { title: `Edit ${store.name}`, store: store });
};

exports.updateStore = async (req, res) => {
    // find and update the store
    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.
        body, {
        new: true, //return new store instead of old one
        runValidators: true
    }).exec();
    req.flash('success', `Successfully updated <strong>${store.name}</stron
   g>.
    <a href="/store/${store.slug}">View store</a> `);
    res.redirect(`/stores/${store._id}/edit`);
};

exports.deleteStore = async (req, res) => {
    const store = await Store.findByIdAndDelete(req.params.id);

    if (!store) {
        req.flash('error', 'Store not found');
        return res.redirect('back');
    }

    req.flash('success', `Store "${store.name}" has been deleted`);
    res.redirect('/stores');
};

exports.searchStores = async (req, res) => {
    const stores = await Store.find({
        $text: { //1er param: query filter -> conditions
            $search: req.query.q
        }
    }, { //2n param: query projection -> fields to include/exclude from the results 
        score: { $meta: 'textScore' }
    }).sort({ //first filter 
        score: { $meta: 'textScore' }
    }).limit(5); //second filter
    res.json({ stores, length: stores.length });
};

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true };

    //Promise1: AGGREGATE operation 
    const tagsPromise = Store.getTagsList();

    //Promise2: find all the stores where the tag property  
    //of a store includes the tag passed by (or any tag) 
    const storesPromise = Store.find({ tags: tagQuery });

    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

    res.render('tags', { title: 'Tags', tags: tags, stores: stores, tag: tag });
};

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores();
    res.render('topStores', { stores, title: 'Top Stores' });
};

exports.getUserTopStores = async (req, res) => {
    const userReviews = await Review.aggregate([
        { $match: { author: req.user._id } }, 
        { $sort: { store: 1, created: -1 } }, 
        {
            $group: {
                _id: '$store', 
                mostRecentReview: { $first: '$$ROOT' } 
            }
        },
        { $sort: { 'mostRecentReview.rating': -1 } } 
    ]);

    if (userReviews.length === 0) {
        return res.render('topStores', { stores: [], hideButton: true, text: `${req.user.name} has no top stores.` });
    }

    const storeIds = userReviews.map(review => review._id);
    const stores = await Store.find({ _id: { $in: storeIds } });

    const storesMap = new Map(stores.map(store => [store._id.toString(), store]));
    const sortedStores = storeIds.map(id => storesMap.get(id.toString()));

    const hideButton = true;
    const text = `${req.user.name}'s top ${sortedStores.length} stores`;

    res.render('topStores', { stores: sortedStores, hideButton, text, personalReviews: userReviews });
}



exports.getStores = async (req, res) => {
    const page = req.params.page || 1;
    const limit = 8; 
    const skip = (page * limit) - limit;

    const storesPromise = Store
        .find()   
        .skip(skip) 
        .limit(limit)  
        .sort({ created: 'desc' }); 

    const countPromise = Store.countDocuments();

    const [stores, count] = await Promise.all([storesPromise,
        countPromise]);

    const pages = Math.ceil(count / limit);
    if (!stores.length && skip) {
        req.flash('info', `You asked for page ${page}. But that does not exist. So I put you on page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }

    res.render('stores', {
        title: 'Stores', stores: stores, page: page,
        pages: pages, count: count
    });
};