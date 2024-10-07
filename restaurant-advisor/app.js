const express = require('express');
const path = require('path');
const router = require('./routes/router');

const session = require('express-session');
//const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const helpers = require('./helpers');
const flash = require('connect-flash');

// create our Express app
const app = express();

// serves up static files from the public folder. 
app.use(express.static(path.join(__dirname, 'public')));

// VIEWS: this is the folder where we keep our pug files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug'); // we use the engine pug

//Express body-parser implementation -> creates the "req.body" object
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SECRET,
    key: process.env.KEY,  //name of the cookie
    resave: false,
    saveUninitialized: false,
    //the session is stored in the DB
    store: MongoStore.create({
        mongoUrl: process.env.DATABASE
    })
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.h = helpers;
    res.locals.flashes = req.flash(); 
    res.locals.currentPath = req.path;
    next();  //Go to the next middleware in the REQ-RES CYCLE
});
  
//ROUTER: anytime someone goes to "/anything", we will handle it with the module "routes"
app.use('/', router);

module.exports = app;