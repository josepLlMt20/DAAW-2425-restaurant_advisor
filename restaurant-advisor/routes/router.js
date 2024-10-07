const express = require('express');
const router = express.Router();

const storeController = require('../controllers/storeController');

router.get('/index/', storeController.homePage);



module.exports = router;
