const express = require('express');
const router = express.Router();

const storeController = require('../controllers/storeController');
const { catchErrors } = require('../handlers/errorHandlers');

router.get('/index/', storeController.homePage);

router.get('/add/', storeController.addStore);

router.post('/add/',
    storeController.verify, //verify type image
    storeController.upload, //resize and upload to file system
    storeController.createStore //save in DB
);

router.post('/add/',
    storeController.verify, //verify type image
    catchErrors(storeController.upload), //resize and upload to filesystem
    catchErrors(storeController.createStore) //save in DB
);

// SHOW all STOREs
router.get('/stores', catchErrors(storeController.getStores));

// SHOW a certain STORE
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

//1st step EDIT STORE -> show the form with current data
router.get('/stores/:id/edit', catchErrors(storeController.editStore));
//2nd step EDIT STORE -> receive the updated data
router.post('/add/:id',
    storeController.verify,
    catchErrors(storeController.upload),
    catchErrors(storeController.updateStore)
);

//***API REST --> Functions to be consumed by the front end via AJAX
//req.query -> /api/v1/search?q=hola
router.get('/api/v1/search', catchErrors(storeController.searchStores));

module.exports = router;
