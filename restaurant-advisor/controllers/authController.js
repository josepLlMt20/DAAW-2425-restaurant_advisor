const passport = require('passport');

exports.login = (req, res) => {
    passport.authenticate('local',
        {
            failureRedirect: '/login',
            failureFlash: 'Failed Login'
        })(req, res, function () {
            req.flash('success', 'You are now logged in');
            res.redirect('/stores');
        });
};

exports.logout = (req, res) => {
    req.logout(function (err) {
        if (err) {
            next(err);
            return;
        }
        req.flash('success', 'You are now logged out');
        res.redirect('/stores');
    });
};

exports.loginForm = (req, res) => {
    res.render('login', { title: 'Login' });
};

//MIDDLEWARE FUNCTION: verify whether the user is logged in 
exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        next(); //carry on! 
        return;
    }
    req.flash('error', 'you must be logged in to do that');
    res.redirect('/login');
};