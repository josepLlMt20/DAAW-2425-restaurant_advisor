exports.homePage = (req, res) => {
    req.flash('error', `hola <strong>que</strong> tal`);
    req.flash('info', `hola`);
    req.flash('warning', `hola`);
    req.flash('success', `hola`);

    res.render('extendingLayout');  
};
